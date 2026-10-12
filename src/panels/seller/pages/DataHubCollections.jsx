import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  TablePagination,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Swal from 'sweetalert2';
import html2canvas from 'html2canvas';
import { useThemeContext } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import TaxInvoiceCaptureMarkup from '../../../components/TaxInvoiceCaptureMarkup';
import {
  createDataHubTable,
  deleteDataHubTable,
  deleteDataHubRow,
  fetchDataHubRows,
  fetchDataHubTables,
  updateDataHubTable,
  updateDataHubRow,
  insertDataHubRow,
} from '../../../api/dataHub';
import { approveCatalogueOrder, rejectCatalogueOrder } from '../../../api/catalogue';
import { fetchTeamMembers } from '../../../api/teamManagement';
import { createManualPipelineLead } from '../../../api/liveChat';

const FIELD_TYPES = ['OTHERS', 'NAME', 'PHONE', 'EMAIL', 'QUERY', 'OFFER'];
const COLUMN_TYPES = ['STRING', 'INTEGER', 'BOOLEAN', 'DATE', 'JSON'];

function catalogueStatusDisplay(raw) {
  const s = String(raw || '').trim();
  const u = s.toUpperCase();
  if (!u) return { label: '—', color: '#64748b' };
  if (u === 'PREVIEW') return { label: 'Preview', color: '#7c3aed' };
  if (u === 'PENDING') return { label: 'Pending', color: '#d97706' };
  if (u === 'APPROVED' || u.startsWith('ACCEPT')) return { label: s, color: '#059669' };
  if (u === 'REJECTED' || u.startsWith('REJECT')) return { label: s, color: '#dc2626' };
  return { label: s || '—', color: '#0f172a' };
}

/** Hide approve/reject once the hub row is no longer actionable. */
function isFinalCatalogueHubStatus(status) {
  const u = String(status || '').trim().toUpperCase();
  if (!u) return false;
  if (u === 'APPROVED' || u === 'REJECTED') return true;
  if (u.startsWith('ACCEPT')) return true;
  if (u.startsWith('REJECT')) return true;
  return false;
}

/** Seller can download online invoice only after order is approved (not pending / rejected / preview). */
function canDownloadSellerOrderInvoice(row) {
  if (!row || typeof row !== 'object') return false;
  if (!Array.isArray(row.cart_items) || row.cart_items.length === 0) return false;
  const u = String(row.status || '').trim().toUpperCase();
  if (!u || u === 'PENDING' || u === 'PREVIEW') return false;
  if (u === 'REJECTED' || u.startsWith('REJECT')) return false;
  return u === 'APPROVED' || u.startsWith('ACCEPT');
}

function buildInvoicePayloadFromOrderRow(row, user) {
  const items = Array.isArray(row?.cart_items) ? row.cart_items : [];
  const lines = items.map((it, i) => ({
    sr: i + 1,
    item: String(it.product_name || it.name || ''),
    qty: Number(it.qty) || 0,
    rate: Number(it.price) || 0,
    gstPct: Number(it.gst) || 0,
    amount: (Number(it.price) || 0) * (Number(it.qty) || 0),
  }));
  const sum = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
  const total = sum > 0 ? sum : Number(row?.total_amount) || 0;
  const biz = ((user?.company_name || '').trim() || user?.full_name || '').trim() || 'Seller';
  return {
    businessName: biz,
    phone: (user?.phone || '').trim(),
    email: (user?.email || '').trim(),
    orderNo: String(row?.order_no || '').trim() || '—',
    invoiceDateIso: row?.updated_on || row?.inserted_on || new Date().toISOString(),
    customerName: String(row?.customer_name || row?.name || '').trim() || 'Customer',
    customerPhone: String(row?.customer_phone || row?.phone || '').trim(),
    lines,
    total,
  };
}

/** Map schema column names to row JSON keys (e.g. "Status" → `status`, "Order no." → `order_no`). */
function getRowValueForColumn(row, columnName) {
  if (!row || typeof row !== 'object') return '';
  const key = String(columnName ?? '').trim();
  if (!key) return '';
  if (Object.prototype.hasOwnProperty.call(row, key)) {
    const direct = row[key];
    if (direct !== undefined && direct !== null && direct !== '') return direct;
  }
  const norm = key.toLowerCase().replace(/\s+/g, ' ').trim();
  if (norm === 'status') {
    const v = row.status ?? row.Status ?? row.STATUS ?? row.order_status;
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    if (Array.isArray(row.cart_items) && row.cart_items.length > 0) return 'PENDING';
    return '';
  }
  if (norm === 'order no' || norm === 'order no.' || norm === 'order_no' || norm === 'orderno') {
    return row.order_no ?? row.orderNo ?? row.OrderNo ?? row['order_no'] ?? '';
  }
  const fallback = row[key];
  return fallback !== undefined && fallback !== null ? fallback : '';
}

function DataHubCollections() {
  const { user } = useAuth();
  const { isDark: isDarkTheme } = useThemeContext();
  const isSellerUser = user?.role?.id === 3;
  const isTeamManagerUser = user?.role?.id === 4;
  const isAgentUser = user?.role?.id === 5;
  const canAssignRows = isSellerUser || isTeamManagerUser || isAgentUser;
  const invoiceCaptureRef = useRef(null);
  const [invoiceGenPayload, setInvoiceGenPayload] = useState(null);

  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [rows, setRows] = useState([]);

  // Assignment states
  const [teamPickerRows, setTeamPickerRows] = useState([]);
  const [agentsByTeamUserRows, setAgentsByTeamUserRows] = useState({});
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTeamManagerId, setSelectedTeamManagerId] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');

  const [collectionsQuery, setCollectionsQuery] = useState('');
  const [rowQuery, setRowQuery] = useState('');
  const [searchColumn, setSearchColumn] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setPage(0);
  }, [rowQuery, selectedTableId, searchColumn]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newColumns, setNewColumns] = useState([
    { name: '', type: 'STRING', searchable: false, masked: false, field_type: 'OTHERS' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState(null);

  const [orderOpen, setOrderOpen] = useState(false);
  const [orderRow, setOrderRow] = useState(null);

  // Add Row states
  const [addRowOpen, setAddRowOpen] = useState(false);
  const [addRowTableId, setAddRowTableId] = useState('');
  const [addRowData, setAddRowData] = useState({});

  const addRowTable = useMemo(
    () => tables.find((t) => t.table_id === addRowTableId) || null,
    [tables, addRowTableId],
  );
  const addRowColumns = addRowTable?.columns || [];

  const openAddRow = () => {
    setAddRowTableId(selectedTableId || (tables.length > 0 ? tables[0].table_id : ''));
    setAddRowData({});
    setAddRowOpen(true);
  };

  const selectedTable = useMemo(
    () => tables.find((t) => t.table_id === selectedTableId) || null,
    [tables, selectedTableId],
  );

  const filteredTables = useMemo(() => {
    const q = collectionsQuery.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((t) => (t.table_name || '').toLowerCase().includes(q));
  }, [tables, collectionsQuery]);

  const visibleRows = useMemo(() => {
    const q = rowQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      if (!r || typeof r !== 'object') return false;
      if (searchColumn) {
        const v = getRowValueForColumn(r, searchColumn);
        return String(v ?? '').toLowerCase().includes(q);
      }
      return Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q));
    });
  }, [rows, rowQuery, searchColumn]);

  const paginatedRows = useMemo(() => {
    return visibleRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [visibleRows, page, rowsPerPage]);

  const loadTables = async () => {
    setError('');
    const resp = await fetchDataHubTables();
    if (resp?.success && Array.isArray(resp.data)) {
      setTables(resp.data);
      if (!selectedTableId && resp.data.length > 0) setSelectedTableId(resp.data[0].table_id);
    } else {
      setTables([]);
    }
  };

  const loadRows = async (tableId) => {
    if (!tableId) return [];
    setError('');
    const resp = await fetchDataHubRows(tableId);
    if (resp?.success && Array.isArray(resp.data)) {
      setRows(resp.data);
      return resp.data;
    }
    setRows([]);
    return [];
  };

  const loadTeamAndAgents = async () => {
    try {
      const membersResp = await fetchTeamMembers();
      const members = Array.isArray(membersResp?.data) ? membersResp.data : [];
      const managers = members.filter((m) => m?.member_type === 'team_manager');
      const managerLabelByUserId = managers.reduce((acc, manager) => {
        const managerUserId = Number(manager?.user_id);
        const label = String(manager?.full_name || '').trim();
        if (managerUserId && label) {
          acc[managerUserId] = label;
        }
        return acc;
      }, {});

      const agents = members.filter((m) => m?.member_type === 'agent');
      const groupedAgents = agents.reduce((acc, agent) => {
        const agentName = String(agent?.full_name || '').trim();
        const managerId = Number(agent?.assigned_team_manager?.id);
        const teamLabel = managerLabelByUserId[managerId] || String(agent?.assigned_team_manager?.name || '').trim();
        if (!agentName || !teamLabel) return acc;
        if (!acc[teamLabel]) acc[teamLabel] = [];
        acc[teamLabel].push(agentName);
        return acc;
      }, {});

      const teamRows = managers
        .map((m) => ({
          label: String(m?.full_name || '').trim(),
          userId: Number(m?.user_id),
        }))
        .filter((r) => r.label && Number.isFinite(r.userId));

      const atUsers = {};
      Object.keys(groupedAgents).forEach((teamLabel) => {
        const names = groupedAgents[teamLabel] || [];
        atUsers[teamLabel] = names
          .map((agentName) => {
            const row = agents.find((a) => {
              const mId = Number(a?.assigned_team_manager?.id);
              const tLab = managerLabelByUserId[mId] || String(a?.assigned_team_manager?.name || '').trim();
              return String(a?.full_name || '').trim() === agentName && tLab === teamLabel;
            });
            const uid = row ? Number(row.user_id) : NaN;
            return Number.isFinite(uid) ? { label: agentName, userId: uid } : null;
          })
          .filter(Boolean);
      });

      setTeamPickerRows(teamRows);
      setAgentsByTeamUserRows(atUsers);
    } catch {
      // Ignore failures
    }
  };

  const handleAssignSubmit = async () => {
    if (!selectedTeamManagerId || !selectedAgentId || selectedRows.length === 0) return;
    
    const mgr = teamPickerRows.find(t => String(t.userId) === String(selectedTeamManagerId));
    const managerName = mgr?.label || '';
    
    const teamLabel = mgr?.label || '';
    const agentsOfTeam = agentsByTeamUserRows[teamLabel] || [];
    const agt = agentsOfTeam.find(a => String(a.userId) === String(selectedAgentId));
    const agentName = agt?.label || '';

    setSaving(true);
    setError('');
    try {
      await Promise.all(selectedRows.map((r) => updateDataHubRow(selectedTableId, r.row_id, {
        assigned_team_manager_id: Number(selectedTeamManagerId),
        assigned_agent_id: Number(selectedAgentId),
        assigned_team_manager_name: managerName,
        assigned_agent_name: agentName,
      })));
      setAssignModalOpen(false);
      setSelectedRowIds([]);
      await loadRows(selectedTableId);
      await Swal.fire({
        icon: 'success',
        title: 'Assigned',
        text: 'Customers assigned successfully.',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (e) {
      setError(e.message || 'Failed to assign customers.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRowSubmit = async () => {
    if (!addRowTableId) {
      setError('Please select a collection.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // 1. Extract name, phone, email, address for Lead Pipeline
      let nameVal = '';
      let phoneVal = '';
      let emailVal = '';
      let addressVal = '';

      addRowColumns.forEach((col) => {
        const colNameLower = String(col.name || '').trim().toLowerCase();
        const val = String(addRowData[col.name] || '').trim();
        if (!val) return;

        if (col.field_type === 'NAME' || colNameLower.includes('name')) {
          if (!nameVal) nameVal = val;
        } else if (col.field_type === 'PHONE' || colNameLower.includes('phone') || colNameLower.includes('mobile') || colNameLower.includes('contact')) {
          if (!phoneVal) phoneVal = val;
        } else if (col.field_type === 'EMAIL' || colNameLower.includes('email') || colNameLower.includes('mail')) {
          if (!emailVal) emailVal = val;
        } else if (colNameLower.includes('address') || colNameLower.includes('location')) {
          if (!addressVal) addressVal = val;
        }
      });

      // 2. Insert row into Data Hub first
      const resp = await insertDataHubRow(addRowTableId, addRowData);
      if (!resp?.success) throw new Error(resp?.message || 'Failed to add row.');

      // 3. Create manual lead pipeline entry if name and phone are available
      if (nameVal && phoneVal) {
        try {
          await createManualPipelineLead({
            name: nameVal,
            phone: phoneVal,
            email: emailVal,
            address: addressVal,
            source: 'Manual lead',
            status: 'New Leads',
          });
        } catch (err) {
          console.error('Failed to create manual pipeline lead:', err);
        }
      }

      setAddRowOpen(false);
      setAddRowData({});
      
      // If the added row's table is currently selected, reload the rows
      if (addRowTableId === selectedTableId) {
        await loadRows(selectedTableId);
      } else {
        setSelectedTableId(addRowTableId);
      }

      await Swal.fire({
        icon: 'success',
        title: 'Row Added',
        text: 'Entry added to Data Hub and Lead Pipeline successfully.',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to add row.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    void loadTables();
    if (user?.role?.id === 3 || user?.role?.id === 4 || user?.role?.id === 5) {
      void loadTeamAndAgents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedTableId) void loadRows(selectedTableId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTableId]);

  useEffect(() => {
    if (!invoiceGenPayload) return;
    let cancelled = false;
    (async () => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => setTimeout(r, 160));
      if (cancelled) return;
      const host = invoiceCaptureRef.current;
      if (!host) {
        setInvoiceGenPayload(null);
        return;
      }
      try {
        const canvas = await html2canvas(host, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
        });
        if (cancelled) return;
        const dataUrl = canvas.toDataURL('image/png');
        const safe = `invoice-${String(invoiceGenPayload.orderNo).replace(/[^a-zA-Z0-9-_]/g, '_')}.png`;
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = safe;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch {
        if (!cancelled) await Swal.fire({ icon: 'error', title: 'Could not generate invoice', text: 'Try again or use another browser.' });
      } finally {
        if (!cancelled) setInvoiceGenPayload(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoiceGenPayload]);

  const requestOrderInvoiceDownload = useCallback(() => {
    if (!orderRow || !canDownloadSellerOrderInvoice(orderRow)) return;
    setInvoiceGenPayload(buildInvoicePayloadFromOrderRow(orderRow, user));
  }, [orderRow, user]);

  useEffect(() => {
    setSelectedRowIds([]);
  }, [selectedTableId, rows.length, rowQuery, searchColumn]);

  const addColumn = () => {
    setNewColumns((prev) => prev.concat({ name: '', type: 'STRING', searchable: false, masked: false, field_type: 'OTHERS' }));
  };

  const removeColumn = (idx) => {
    setNewColumns((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateColumn = (idx, patch) => {
    setNewColumns((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        table_name: newTableName,
        columns: newColumns.map((c) => ({
          name: c.name,
          type: c.type,
          searchable: c.searchable,
          masked: c.masked,
          field_type: c.field_type,
        })),
      };
      const resp = await createDataHubTable(payload);
      if (!resp?.success) throw new Error(resp?.message || 'Failed to create table');
      setCreateOpen(false);
      setNewTableName('');
      setNewColumns([{ name: '', type: 'STRING', searchable: false, masked: false, field_type: 'OTHERS' }]);
      await loadTables();
      if (resp?.data?.table_id) setSelectedTableId(resp.data.table_id);
    } catch (e) {
      setError(e.message || 'Failed to create table');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = () => {
    if (!selectedTable) return;
    setNewTableName(selectedTable.table_name || '');
    setNewColumns(
      Array.isArray(selectedTable.columns) && selectedTable.columns.length
        ? selectedTable.columns.map((c) => ({
            name: c.name || '',
            type: c.type || 'STRING',
            searchable: Boolean(c.searchable),
            masked: Boolean(c.masked),
            field_type: c.field_type || 'OTHERS',
          }))
        : [{ name: '', type: 'STRING', searchable: false, masked: false, field_type: 'OTHERS' }],
    );
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedTable) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        table_id: selectedTable.table_id,
        table_name: newTableName,
        columns: newColumns.map((c) => ({
          name: c.name,
          type: c.type,
          searchable: c.searchable,
          masked: c.masked,
          field_type: c.field_type,
        })),
      };
      const resp = await updateDataHubTable(payload);
      if (!resp?.success) throw new Error(resp?.message || 'Failed to update table');
      setEditOpen(false);
      await loadTables();
      setSelectedTableId(selectedTable.table_id);
    } catch (e) {
      setError(e.message || 'Failed to update table');
    } finally {
      setSaving(false);
    }
  };

  const columns = selectedTable?.columns || [];
  const hasCatalogueOrders = useMemo(
    () => rows.some((r) => r && typeof r === 'object' && Array.isArray(r.cart_items) && r.cart_items.length > 0),
    [rows],
  );
  const schemaHasStatusColumn = useMemo(
    () => columns.some((c) => String(c?.name || '').trim().toLowerCase() === 'status'),
    [columns],
  );
  const showCatalogueStatusColumn = hasCatalogueOrders && !schemaHasStatusColumn;
  /** Same normalisation as getRowValueForColumn — avoid a second "Order no." column if schema already has one. */
  const schemaHasOrderNoColumn = useMemo(
    () =>
      columns.some((c) => {
        const norm = String(c?.name || '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, ' ');
        return (
          norm === 'order no' ||
          norm === 'order no.' ||
          norm === 'order_no' ||
          norm === 'orderno' ||
          norm === 'order number' ||
          norm === 'order #'
        );
      }),
    [columns],
  );
  const showCatalogueOrderNoColumn = hasCatalogueOrders && !schemaHasOrderNoColumn;
  const catalogueExtraColCount = useMemo(() => {
    if (!hasCatalogueOrders) return 0;
    let n = 1; // Action
    if (showCatalogueStatusColumn) n += 1;
    if (showCatalogueOrderNoColumn) n += 1;
    return n;
  }, [hasCatalogueOrders, showCatalogueStatusColumn, showCatalogueOrderNoColumn]);
  const selectedRows = useMemo(
    () => visibleRows.filter((r) => selectedRowIds.includes(String(r?.row_id || ''))),
    [visibleRows, selectedRowIds],
  );
  const allVisibleSelected = paginatedRows.length > 0 && paginatedRows.every((r) => selectedRowIds.includes(String(r?.row_id || '')));
  const someVisibleSelected = paginatedRows.some((r) => selectedRowIds.includes(String(r?.row_id || '')));

  const handleDeleteTable = async (table) => {
    if (!table?.table_id) return;
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Are you sure to delete this table?',
      showCancelButton: true,
      confirmButtonText: 'OK',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#6b7280',
    });
    if (!result.isConfirmed) return;

    setError('');
    try {
      const resp = await deleteDataHubTable(table.table_id);
      if (!resp?.success) throw new Error(resp?.message || 'Failed to delete table');

      await loadTables();
      if (selectedTableId === table.table_id) {
        const remaining = tables.filter((t) => t.table_id !== table.table_id);
        setSelectedTableId(remaining[0]?.table_id || '');
        setRows([]);
      }
    } catch (e) {
      setError(e.message || 'Failed to delete table');
    }
  };

  const toggleRowSelection = (rowId) => {
    const id = String(rowId || '');
    if (!id) return;
    setSelectedRowIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.concat(id)));
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const paginatedSet = new Set(paginatedRows.map((r) => String(r?.row_id || '')));
      setSelectedRowIds((prev) => prev.filter((id) => !paginatedSet.has(id)));
      return;
    }
    const paginatedIds = paginatedRows.map((r) => String(r?.row_id || '')).filter(Boolean);
    setSelectedRowIds((prev) => Array.from(new Set(prev.concat(paginatedIds))));
  };

  const handleBulkDelete = async () => {
    if (!selectedTableId || selectedRows.length === 0) return;
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Are you sure you want to delete?',
      text: `Selected customers: ${selectedRows.length}`,
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#6b7280',
    });
    if (!result.isConfirmed) return;

    setError('');
    try {
      await Promise.all(selectedRows.map((r) => deleteDataHubRow(selectedTableId, r.row_id)));
      setSelectedRowIds([]);
      await loadRows(selectedTableId);
    } catch (e) {
      setError(e.message || 'Failed to delete selected customers');
    }
  };

  const openOrderRow = (row) => {
    setOrderRow(row || null);
    setOrderOpen(true);
  };

  const handleApproveOrder = async (row) => {
    if (!selectedTableId || !row?.row_id) return;
    const result = await Swal.fire({
      icon: 'question',
      title: 'Approve this order?',
      text: 'Approving will set the order to approved, add line items, and decrement stock (pending row was created at checkout).',
      input: 'textarea',
      inputLabel: 'Note / remark (optional)',
      inputPlaceholder: 'Add a note to save with the status…',
      inputAttributes: { maxlength: 500, 'aria-label': 'Note or remark' },
      showCancelButton: true,
      confirmButtonText: 'Approve',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
    });
    if (!result.isConfirmed) return;
    const note = typeof result.value === 'string' ? result.value : '';
    try {
      const resp = await approveCatalogueOrder({ tableId: selectedTableId, rowId: row.row_id, note });
      if (!resp?.success) throw new Error(resp?.message || 'Approve failed');
      const refreshed = await loadRows(selectedTableId);
      const fresh = (refreshed || []).find((r) => String(r?.row_id) === String(row.row_id));
      if (fresh && orderOpen) setOrderRow(fresh);
      await Swal.fire({ icon: 'success', title: 'Approved', timer: 1200, showConfirmButton: false });
    } catch (e) {
      await Swal.fire({ icon: 'error', title: 'Failed', text: e.message || 'Approve failed' });
    }
  };

  const handleRejectOrder = async (row) => {
    if (!selectedTableId || !row?.row_id) return;
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Reject this order?',
      input: 'textarea',
      inputLabel: 'Note / remark (optional)',
      inputPlaceholder: 'Reason or note (saved with status)…',
      inputAttributes: { maxlength: 500, 'aria-label': 'Note or remark' },
      showCancelButton: true,
      confirmButtonText: 'Reject',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
    });
    if (!result.isConfirmed) return;
    const note = typeof result.value === 'string' ? result.value : '';
    try {
      const resp = await rejectCatalogueOrder({ tableId: selectedTableId, rowId: row.row_id, note });
      if (!resp?.success) throw new Error(resp?.message || 'Reject failed');
      const refreshed = await loadRows(selectedTableId);
      const fresh = (refreshed || []).find((r) => String(r?.row_id) === String(row.row_id));
      if (fresh && orderOpen) setOrderRow(fresh);
      await Swal.fire({ icon: 'success', title: 'Rejected', timer: 1200, showConfirmButton: false });
    } catch (e) {
      await Swal.fire({ icon: 'error', title: 'Failed', text: e.message || 'Reject failed' });
    }
  };

  const handleDownloadSelectedCsv = async () => {
    if (!selectedRows.length) return;
    const csvColumns = columns.map((c) => c.name);
    const escapeCsv = (v) => {
      const s = String(v ?? '');
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const header = csvColumns.map(escapeCsv).join(',');
    const lines = selectedRows.map((r) => csvColumns.map((cn) => escapeCsv(getRowValueForColumn(r, cn))).join(','));
    const csv = [header].concat(lines).join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable?.table_name || 'selected_customers'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', backgroundColor: isDarkTheme ? '#0b1329' : '#f8fafc', display: 'flex' }}>
      {/* Left sidebar */}
      <Paper
        elevation={0}
        sx={{
          width: 320,
          borderRight: isDarkTheme ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid rgba(2, 6, 23, 0.08)',
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: isDarkTheme ? '#0f172a' : '#ffffff',
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography fontWeight={800} sx={{ color: isDarkTheme ? '#f8fafc' : '#0f172a', fontSize: 16 }}>
            Collections
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.25 }}>
            <TextField
              value={collectionsQuery}
              onChange={(e) => setCollectionsQuery(e.target.value)}
              placeholder="Search Collection"
              size="small"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: isDarkTheme ? '#f8fafc' : '#0f172a',
                  backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff',
                  '& fieldset': { borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.2)' : 'rgba(2,6,23,0.1)' },
                },
              }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: '#94a3b8', mr: 1 }} />,
              }}
            />
            {isSellerUser && (
              <IconButton
                onClick={() => setCreateOpen(true)}
                sx={{
                  border: isDarkTheme ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid rgba(2,6,23,0.10)',
                  color: isDarkTheme ? '#38bdf8' : '#0ea5e9',
                }}
              >
                <AddIcon />
              </IconButton>
            )}
          </Box>
        </Box>
        <Divider sx={{ borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.15)' : 'rgba(2,6,23,0.08)' }} />
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 0, height: 0 },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {filteredTables.map((t) => {
            const active = t.table_id === selectedTableId;
            return (
              <Box
                key={t.table_id}
                onClick={() => setSelectedTableId(t.table_id)}
                role="button"
                tabIndex={0}
                sx={{
                  px: 2,
                  py: 1.25,
                  cursor: 'pointer',
                  backgroundColor: active
                    ? (isDarkTheme ? 'rgba(56, 189, 248, 0.18)' : 'rgba(59, 130, 246, 0.10)')
                    : 'transparent',
                  '&:hover': { backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(2, 6, 23, 0.04)' },
                  borderBottom: isDarkTheme ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid rgba(2,6,23,0.05)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: active ? (isDarkTheme ? '#38bdf8' : '#2563eb') : (isDarkTheme ? '#e2e8f0' : '#0f172a'),
                      fontSize: 13,
                    }}
                  >
                    {t.table_name}
                  </Typography>
                  {isSellerUser && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteTable(t);
                      }}
                      sx={{ color: '#ef4444' }}
                      title="Delete table"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* Main */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography sx={{ fontWeight: 900, color: isDarkTheme ? '#f8fafc' : '#0f172a', fontSize: 18 }}>
            {selectedTable?.table_name || 'Lead Table'}
          </Typography>
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <TextField
              value={rowQuery}
              onChange={(e) => setRowQuery(e.target.value)}
              placeholder="Search by Row Values"
              size="small"
              sx={{
                width: 240,
                '& .MuiOutlinedInput-root': {
                  color: isDarkTheme ? '#f8fafc' : '#0f172a',
                  backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff',
                  '& fieldset': { borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.25)' : 'rgba(2,6,23,0.1)' },
                },
              }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: isDarkTheme ? '#94a3b8' : '#64748b', mr: 1 }} />,
              }}
            />
            <Select
              size="small"
              value={searchColumn}
              onChange={(e) => setSearchColumn(e.target.value)}
              displayEmpty
              sx={{
                width: 210,
                color: isDarkTheme ? '#f8fafc' : '#0f172a',
                backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff',
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.25)' : 'rgba(2,6,23,0.1)',
                },
                '.MuiSvgIcon-root': { color: isDarkTheme ? '#94a3b8' : 'inherit' },
              }}
              MenuProps={{
                PaperProps: {
                  sx: { backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff', color: isDarkTheme ? '#f8fafc' : '#0f172a' },
                },
              }}
            >
              <MenuItem value="">Select a Column to search</MenuItem>
              {columns.map((c) => (
                <MenuItem key={c.name} value={c.name}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>

            <Button
              variant="outlined"
              size="small"
              sx={{
                textTransform: 'none',
                color: isDarkTheme ? '#cbd5e1' : '#334155',
                borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.25)' : 'rgba(2,6,23,0.15)',
                '&.Mui-disabled': {
                  color: isDarkTheme ? 'rgba(203, 213, 225, 0.4)' : 'rgba(51, 65, 85, 0.4)',
                  borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.12)' : 'rgba(2,6,23,0.08)',
                },
              }}
              disabled
            >
              Upload File
            </Button>
            <Button
              variant="outlined"
              size="small"
              sx={{
                textTransform: 'none',
                color: isDarkTheme ? '#cbd5e1' : '#334155',
                borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.25)' : 'rgba(2,6,23,0.15)',
                '&.Mui-disabled': {
                  color: isDarkTheme ? 'rgba(203, 213, 225, 0.4)' : 'rgba(51, 65, 85, 0.4)',
                  borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.12)' : 'rgba(2,6,23,0.08)',
                },
              }}
              disabled
            >
              Upload Bulk File
            </Button>
            <Button
              variant="outlined"
              size="small"
              sx={{
                textTransform: 'none',
                color: isDarkTheme ? '#cbd5e1' : '#334155',
                borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.25)' : 'rgba(2,6,23,0.15)',
                '&.Mui-disabled': {
                  color: isDarkTheme ? 'rgba(203, 213, 225, 0.4)' : 'rgba(51, 65, 85, 0.4)',
                  borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.12)' : 'rgba(2,6,23,0.08)',
                },
              }}
              disabled
            >
              Download File
            </Button>

            {isSellerUser && (
              <Button
                variant="outlined"
                size="small"
                onClick={openEdit}
                disabled={!selectedTable}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  color: isDarkTheme ? '#38bdf8' : '#2563eb',
                  borderColor: isDarkTheme ? '#38bdf8' : '#2563eb',
                  '&:hover': { borderColor: isDarkTheme ? '#7dd3fc' : '#1d4ed8' },
                  '&.Mui-disabled': {
                    color: isDarkTheme ? 'rgba(56, 189, 248, 0.35)' : 'rgba(37, 99, 235, 0.35)',
                    borderColor: isDarkTheme ? 'rgba(56, 189, 248, 0.2)' : 'rgba(37, 99, 235, 0.2)',
                  },
                }}
              >
                Edit Collection
              </Button>
            )}

            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                backgroundColor: '#10b981',
                color: '#ffffff',
                '&:hover': { backgroundColor: '#059669' },
              }}
              onClick={openAddRow}
            >
              Add Row
            </Button>

            {canAssignRows && (
              <IconButton
                onClick={(e) => setBulkMenuAnchor(e.currentTarget)}
                disabled={selectedRows.length === 0}
                sx={{
                  border: isDarkTheme ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid rgba(2,6,23,0.10)',
                  color: selectedRows.length > 0 ? (isDarkTheme ? '#38bdf8' : '#0f172a') : (isDarkTheme ? '#64748b' : '#9ca3af'),
                }}
                title="Bulk actions"
              >
                <MoreVertIcon />
              </IconButton>
            )}

            <Menu
              anchorEl={bulkMenuAnchor}
              open={Boolean(bulkMenuAnchor)}
              onClose={() => setBulkMenuAnchor(null)}
              PaperProps={{
                sx: { backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff', color: isDarkTheme ? '#f8fafc' : '#0f172a' },
              }}
            >
              {isSellerUser && (
                <MenuItem
                  onClick={async () => {
                    setBulkMenuAnchor(null);
                    await handleBulkDelete();
                  }}
                >
                  Delete
                </MenuItem>
              )}
              <MenuItem
                onClick={async () => {
                  setBulkMenuAnchor(null);
                  await handleDownloadSelectedCsv();
                }}
              >
                Download File
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {error ? (
          <Box sx={{ px: 2, pb: 1 }}>
            <Typography sx={{ color: '#ef4444' }}>{error}</Typography>
          </Box>
        ) : null}

        <Box sx={{ flex: 1, minHeight: 0, p: 2, pt: 0 }}>
          <Paper
            elevation={0}
            sx={{
              border: isDarkTheme ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid rgba(2,6,23,0.10)',
              borderRadius: 2,
              overflow: 'hidden',
              backgroundColor: isDarkTheme ? '#0f172a' : '#ffffff',
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {canAssignRows && (
                    <TableCell sx={{ fontWeight: 800, backgroundColor: isDarkTheme ? '#1e3a8a' : '#1d4ed8', color: '#fff', width: 56 }}>
                      <Checkbox
                        size="small"
                        checked={allVisibleSelected}
                        indeterminate={!allVisibleSelected && someVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        sx={{ color: '#fff', '&.Mui-checked': { color: '#fff' }, '&.MuiCheckbox-indeterminate': { color: '#fff' } }}
                      />
                    </TableCell>
                  )}
                  {columns.map((c) => (
                    <TableCell key={c.name} sx={{ fontWeight: 800, backgroundColor: isDarkTheme ? '#1e3a8a' : '#1d4ed8', color: '#fff' }}>
                      {c.name}
                    </TableCell>
                  ))}
                  {showCatalogueStatusColumn ? (
                    <TableCell sx={{ fontWeight: 800, backgroundColor: isDarkTheme ? '#1e3a8a' : '#1d4ed8', color: '#fff', minWidth: 100 }}>
                      Status
                    </TableCell>
                  ) : null}
                  {showCatalogueOrderNoColumn ? (
                    <TableCell sx={{ fontWeight: 800, backgroundColor: isDarkTheme ? '#1e3a8a' : '#1d4ed8', color: '#fff', minWidth: 140 }}>
                      Order no.
                    </TableCell>
                  ) : null}
                  {hasCatalogueOrders ? (
                    <TableCell sx={{ fontWeight: 800, backgroundColor: isDarkTheme ? '#1e3a8a' : '#1d4ed8', color: '#fff', width: 160 }}>
                      Action
                    </TableCell>
                  ) : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={Math.max(columns.length + 1 + catalogueExtraColCount, 2)}
                      sx={{ py: 4, color: isDarkTheme ? '#94a3b8' : '#64748b', textAlign: 'center', backgroundColor: isDarkTheme ? '#0f172a' : '#ffffff' }}
                    >
                      No data
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((r) => (
                    <TableRow key={r.row_id} sx={{ '&:hover': { backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.03)' : 'rgba(2,6,23,0.02)' } }}>
                      {canAssignRows && (
                        <TableCell sx={{ borderBottom: isDarkTheme ? '1px solid rgba(148, 163, 184, 0.12)' : '1px solid #e2e8f0' }}>
                          <Checkbox
                            size="small"
                            checked={selectedRowIds.includes(String(r?.row_id || ''))}
                            onChange={() => toggleRowSelection(r?.row_id)}
                            sx={{ color: isDarkTheme ? '#94a3b8' : '#64748b', '&.Mui-checked': { color: '#3b82f6' } }}
                          />
                        </TableCell>
                      )}
                      {columns.map((c) => {
                        const raw = getRowValueForColumn(r, c.name);
                        const isStatusCol = String(c.name || '').trim().toLowerCase().replace(/\s+/g, ' ') === 'status';
                        return (
                          <TableCell
                            key={c.name}
                            sx={{
                              color: isDarkTheme ? '#f1f5f9' : '#0f172a',
                              borderBottom: isDarkTheme ? '1px solid rgba(148, 163, 184, 0.12)' : '1px solid #e2e8f0',
                            }}
                          >
                            {isStatusCol ? (
                              (() => {
                                const { label, color } = catalogueStatusDisplay(raw);
                                return (
                                  <Typography component="span" sx={{ fontWeight: 800, fontSize: 13, color }}>
                                    {label}
                                  </Typography>
                                );
                              })()
                            ) : (
                              String(raw ?? '')
                            )}
                          </TableCell>
                        );
                      })}
                      {showCatalogueStatusColumn ? (
                        <TableCell sx={{ whiteSpace: 'nowrap', borderBottom: isDarkTheme ? '1px solid rgba(148, 163, 184, 0.12)' : '1px solid #e2e8f0' }}>
                          {(() => {
                            const { label, color } = catalogueStatusDisplay(r?.status);
                            return (
                              <Typography component="span" sx={{ fontWeight: 800, fontSize: 13, color }}>
                                {label}
                              </Typography>
                            );
                          })()}
                        </TableCell>
                      ) : null}
                      {showCatalogueOrderNoColumn ? (
                        <TableCell sx={{ fontWeight: 700, color: isDarkTheme ? '#f1f5f9' : '#0f172a', whiteSpace: 'nowrap', borderBottom: isDarkTheme ? '1px solid rgba(148, 163, 184, 0.12)' : '1px solid #e2e8f0' }}>
                          {String(r?.order_no ?? '')}
                        </TableCell>
                      ) : null}
                      {hasCatalogueOrders ? (
                        <TableCell sx={{ borderBottom: isDarkTheme ? '1px solid rgba(148, 163, 184, 0.12)' : '1px solid #e2e8f0' }}>
                          {Array.isArray(r?.cart_items) && r.cart_items.length > 0 ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <IconButton size="small" onClick={() => openOrderRow(r)} sx={{ color: '#3b82f6' }} title="View order">
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                              {isSellerUser && !isFinalCatalogueHubStatus(r?.status) ? (
                                <>
                                  <IconButton
                                    size="small"
                                    onClick={() => void handleApproveOrder(r)}
                                    sx={{ color: '#10b981' }}
                                    title="Approve (✅)"
                                  >
                                    <CheckCircleIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => void handleRejectOrder(r)}
                                    sx={{ color: '#ef4444' }}
                                    title="Reject (❌)"
                                  >
                                    <CancelIcon fontSize="small" />
                                  </IconButton>
                                </>
                              ) : null}
                            </Box>
                          ) : (
                            <Typography sx={{ color: isDarkTheme ? '#64748b' : '#94a3b8', fontSize: 12 }}>—</Typography>
                          )}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={visibleRows.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(event, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              sx={{
                borderTop: isDarkTheme ? '1px solid rgba(148,163,184,0.15)' : '1px solid #e5e7eb',
                color: isDarkTheme ? '#e5e7eb' : '#0f172a',
                '.MuiSvgIcon-root': { color: isDarkTheme ? '#e5e7eb' : '#0f172a' },
                '.MuiTablePagination-select': { color: isDarkTheme ? '#e5e7eb' : '#0f172a' },
              }}
            />
          </Paper>
        </Box>
      </Box>

      {/* Order View Modal */}
      <Dialog
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            backgroundColor: isDarkTheme ? '#0f172a' : '#ffffff',
            color: isDarkTheme ? '#f8fafc' : '#0f172a',
            border: isDarkTheme ? '1px solid rgba(148, 163, 184, 0.2)' : 'none',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            pr: 1,
            flexWrap: 'wrap',
          }}
        >
          <Typography sx={{ fontWeight: 900, color: isDarkTheme ? '#f8fafc' : '#0f172a' }}>Cart Summary</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
            <Button
              variant="outlined"
              size="small"
              disabled={!orderRow || !canDownloadSellerOrderInvoice(orderRow)}
              onClick={() => requestOrderInvoiceDownload()}
              title={!orderRow || !canDownloadSellerOrderInvoice(orderRow) ? 'Available after order is approved' : 'Download online invoice (PNG)'}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                color: isDarkTheme ? '#38bdf8' : '#2563eb',
                borderColor: isDarkTheme ? '#38bdf8' : '#2563eb',
                '&.Mui-disabled': { color: isDarkTheme ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.4)' },
              }}
            >
              View invoice
            </Button>
            <IconButton onClick={() => setOrderOpen(false)} aria-label="Close" sx={{ color: isDarkTheme ? '#94a3b8' : '#64748b' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography sx={{ color: isDarkTheme ? '#f1f5f9' : '#0f172a', fontWeight: 800, fontSize: 13 }}>
              Customer: {String(orderRow?.customer_name || orderRow?.name || '')}
            </Typography>
            <Typography sx={{ color: isDarkTheme ? '#cbd5e1' : '#334155', fontSize: 13 }}>
              Phone: {String(orderRow?.customer_phone || orderRow?.phone || '')}
            </Typography>
            <Typography sx={{ color: isDarkTheme ? '#cbd5e1' : '#334155', fontSize: 13 }}>
              Email: {String(orderRow?.customer_email || orderRow?.email || '')}
            </Typography>
            {String(orderRow?.order_no || '').trim() ? (
              <Typography sx={{ color: isDarkTheme ? '#f1f5f9' : '#0f172a', fontSize: 13, fontWeight: 800, mt: 0.5 }}>
                Order no.: {String(orderRow.order_no)}
              </Typography>
            ) : null}
            {(() => {
              const { label, color } = catalogueStatusDisplay(orderRow?.status);
              if (label === '—' && !String(orderRow?.status || '').trim()) return null;
              return (
                <Typography sx={{ fontSize: 13, fontWeight: 800, mt: 0.5, color }}>
                  Status: {label}
                </Typography>
              );
            })()}
            <Divider sx={{ my: 1, borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.15)' : 'rgba(2, 6, 23, 0.08)' }} />
            {Array.isArray(orderRow?.cart_items) && orderRow.cart_items.length > 0 ? (
              orderRow.cart_items.map((it, idx) => (
                <Box
                  key={`${it.product_id || idx}`}
                  sx={{
                    display: 'flex',
                    justify: 'space-between',
                    gap: 2,
                    p: 1,
                    border: isDarkTheme ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid rgba(2,6,23,0.08)',
                    borderRadius: 1.5,
                    backgroundColor: isDarkTheme ? '#1e293b' : 'transparent',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, color: isDarkTheme ? '#f8fafc' : '#0f172a' }}>{String(it.product_name || '')}</Typography>
                    <Typography sx={{ color: isDarkTheme ? '#94a3b8' : '#64748b', fontSize: 12 }}>
                      Qty: {Number(it.qty) || 0} | Price: ₹{Number(it.price) || 0}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 900, color: isDarkTheme ? '#f8fafc' : '#0f172a' }}>
                    ₹{((Number(it.price) || 0) * (Number(it.qty) || 0)).toFixed(2)}
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography sx={{ color: isDarkTheme ? '#94a3b8' : '#64748b' }}>No cart items found.</Typography>
            )}
            <Divider sx={{ my: 1, borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.15)' : 'rgba(2, 6, 23, 0.08)' }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontWeight: 900, color: isDarkTheme ? '#f8fafc' : '#0f172a' }}>Total</Typography>
              <Typography sx={{ fontWeight: 900, color: isDarkTheme ? '#f8fafc' : '#0f172a' }}>
                ₹{Number(orderRow?.total_amount || 0).toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Assign Modal */}
      <Dialog
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            backgroundColor: isDarkTheme ? '#0f172a' : '#ffffff',
            color: isDarkTheme ? '#f8fafc' : '#0f172a',
            border: isDarkTheme ? '1px solid rgba(148, 163, 184, 0.2)' : 'none',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 800, color: isDarkTheme ? '#f8fafc' : '#0f172a' }}>Assign Customers</Typography>
          <IconButton onClick={() => setAssignModalOpen(false)} sx={{ color: isDarkTheme ? '#94a3b8' : '#64748b' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5, color: isDarkTheme ? '#cbd5e1' : '#475569' }}>Select Team (Manager)</Typography>
              <Select
                fullWidth
                size="small"
                value={selectedTeamManagerId}
                onChange={(e) => {
                  setSelectedTeamManagerId(e.target.value);
                  setSelectedAgentId('');
                }}
                displayEmpty
                sx={{
                  color: isDarkTheme ? '#f8fafc' : '#0f172a',
                  backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff',
                  '.MuiOutlinedInput-notchedOutline': { borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.25)' : 'rgba(2,6,23,0.15)' },
                  '.MuiSvgIcon-root': { color: isDarkTheme ? '#94a3b8' : 'inherit' },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: { backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff', color: isDarkTheme ? '#f8fafc' : '#0f172a' },
                  },
                }}
              >
                <MenuItem value="">Please select team</MenuItem>
                {teamPickerRows.map((t) => (
                  <MenuItem key={t.userId} value={String(t.userId)}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5, color: isDarkTheme ? '#cbd5e1' : '#475569' }}>Select Agent</Typography>
              <Select
                fullWidth
                size="small"
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                disabled={!selectedTeamManagerId}
                displayEmpty
                sx={{
                  color: isDarkTheme ? '#f8fafc' : '#0f172a',
                  backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff',
                  '.MuiOutlinedInput-notchedOutline': { borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.25)' : 'rgba(2,6,23,0.15)' },
                  '.MuiSvgIcon-root': { color: isDarkTheme ? '#94a3b8' : 'inherit' },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: { backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff', color: isDarkTheme ? '#f8fafc' : '#0f172a' },
                  },
                }}
              >
                <MenuItem value="">Please select agent</MenuItem>
                {(() => {
                  const mgr = teamPickerRows.find(t => String(t.userId) === String(selectedTeamManagerId));
                  const teamLabel = mgr?.label || '';
                  const agents = agentsByTeamUserRows[teamLabel] || [];
                  return agents.map((a) => (
                    <MenuItem key={a.userId} value={String(a.userId)}>
                      {a.label}
                    </MenuItem>
                  ));
                })()}
              </Select>
            </Box>

            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={() => setAssignModalOpen(false)} sx={{ textTransform: 'none', color: isDarkTheme ? '#94a3b8' : '#64748b' }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleAssignSubmit}
                disabled={saving || !selectedTeamManagerId || !selectedAgentId}
                sx={{ textTransform: 'none', backgroundColor: '#0ea5e9', '&:hover': { backgroundColor: '#0284c7' } }}
              >
                {saving ? 'Assigning...' : 'Assign'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Create Table Modal */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            backgroundColor: isDarkTheme ? '#0f172a' : '#ffffff',
            color: isDarkTheme ? '#f8fafc' : '#0f172a',
            border: isDarkTheme ? '1px solid rgba(148, 163, 184, 0.2)' : 'none',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 800, color: isDarkTheme ? '#f8fafc' : '#0f172a' }}>Create Table</Typography>
          <IconButton onClick={() => setCreateOpen(false)} sx={{ color: isDarkTheme ? '#94a3b8' : '#64748b' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 12, color: isDarkTheme ? '#94a3b8' : '#64748b', mb: 0.5 }}>Table Name</Typography>
            <TextField
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              placeholder="Enter Table Name"
              fullWidth
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: isDarkTheme ? '#f8fafc' : '#0f172a',
                  backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff',
                  '& fieldset': { borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.25)' : 'rgba(2,6,23,0.15)' },
                },
              }}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 0.8fr 0.8fr 1fr 64px', gap: 1.25, alignItems: 'center', px: 0.5 }}>
            <Typography sx={{ fontWeight: 800, color: isDarkTheme ? '#f8fafc' : '#0f172a' }}>Field Name</Typography>
            <Typography sx={{ fontWeight: 800, color: isDarkTheme ? '#f8fafc' : '#0f172a' }}>Type</Typography>
            <Typography sx={{ fontWeight: 800, color: isDarkTheme ? '#f8fafc' : '#0f172a' }}>Searchable</Typography>
            <Typography sx={{ fontWeight: 800, color: isDarkTheme ? '#f8fafc' : '#0f172a' }}>Masked</Typography>
            <Typography sx={{ fontWeight: 800, color: isDarkTheme ? '#f8fafc' : '#0f172a' }}>Fields</Typography>
            <Box />
          </Box>
          <Divider sx={{ my: 1.5, borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.15)' : 'rgba(2,6,23,0.08)' }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {newColumns.map((c, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1.3fr 1fr 0.8fr 0.8fr 1fr 64px',
                  gap: 1.25,
                  alignItems: 'center',
                }}
              >
                <TextField
                  value={c.name}
                  onChange={(e) => updateColumn(idx, { name: e.target.value })}
                  placeholder="Enter Column Name"
                  size="small"
                  error={!c.name}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: isDarkTheme ? '#f8fafc' : '#0f172a',
                      backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff',
                      '& fieldset': { borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.25)' : 'rgba(2,6,23,0.15)' },
                    },
                  }}
                />
                <Select
                  size="small"
                  value={c.type}
                  onChange={(e) => updateColumn(idx, { type: e.target.value })}
                  sx={{
                    color: isDarkTheme ? '#f8fafc' : '#0f172a',
                    backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff',
                    '.MuiOutlinedInput-notchedOutline': { borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.25)' : 'rgba(2,6,23,0.15)' },
                    '.MuiSvgIcon-root': { color: isDarkTheme ? '#94a3b8' : 'inherit' },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: { backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff', color: isDarkTheme ? '#f8fafc' : '#0f172a' },
                    },
                  }}
                >
                  {COLUMN_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <input
                    type="checkbox"
                    checked={c.searchable}
                    onChange={(e) => updateColumn(idx, { searchable: e.target.checked })}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <input type="checkbox" checked={c.masked} onChange={(e) => updateColumn(idx, { masked: e.target.checked })} />
                </Box>
                <Select
                  size="small"
                  value={c.field_type}
                  onChange={(e) => updateColumn(idx, { field_type: e.target.value })}
                  sx={{
                    color: isDarkTheme ? '#f8fafc' : '#0f172a',
                    backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff',
                    '.MuiOutlinedInput-notchedOutline': { borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.25)' : 'rgba(2,6,23,0.15)' },
                    '.MuiSvgIcon-root': { color: isDarkTheme ? '#94a3b8' : 'inherit' },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: { backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff', color: isDarkTheme ? '#f8fafc' : '#0f172a' },
                    },
                  }}
                >
                  {FIELD_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <IconButton onClick={() => removeColumn(idx)} disabled={newColumns.length === 1} sx={{ color: '#ef4444' }}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Button onClick={addColumn} sx={{ textTransform: 'none', color: isDarkTheme ? '#38bdf8' : '#2563eb' }}>
              + Add another field
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" onClick={() => setCreateOpen(false)} sx={{ textTransform: 'none', color: isDarkTheme ? '#cbd5e1' : 'inherit', borderColor: isDarkTheme ? 'rgba(148,163,184,0.3)' : 'inherit' }}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleCreate} disabled={saving} sx={{ textTransform: 'none', backgroundColor: '#3b82f6' }}>
                Save
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Edit Collection Modal */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            backgroundColor: isDarkTheme ? '#0f172a' : '#ffffff',
            color: isDarkTheme ? '#f8fafc' : '#0f172a',
            border: isDarkTheme ? '1px solid rgba(148, 163, 184, 0.2)' : 'none',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 800, color: isDarkTheme ? '#f8fafc' : '#0f172a' }}>Edit Collection</Typography>
          <IconButton onClick={() => setEditOpen(false)} sx={{ color: isDarkTheme ? '#94a3b8' : '#64748b' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 12, color: isDarkTheme ? '#94a3b8' : '#64748b', mb: 0.5 }}>Table Name</Typography>
            <TextField
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              placeholder="Enter Table Name"
              fullWidth
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: isDarkTheme ? '#f8fafc' : '#0f172a',
                  backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff',
                  '& fieldset': { borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.25)' : 'rgba(2,6,23,0.15)' },
                },
              }}
            />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 0.8fr 0.8fr 1fr 64px', gap: 1.25, alignItems: 'center', px: 0.5 }}>
            <Typography sx={{ fontWeight: 800, color: isDarkTheme ? '#f8fafc' : '#0f172a' }}>Field Name</Typography>
            <Typography sx={{ fontWeight: 800, color: isDarkTheme ? '#f8fafc' : '#0f172a' }}>Type</Typography>
            <Typography sx={{ fontWeight: 800, color: isDarkTheme ? '#f8fafc' : '#0f172a' }}>Searchable</Typography>
            <Typography sx={{ fontWeight: 800, color: isDarkTheme ? '#f8fafc' : '#0f172a' }}>Masked</Typography>
            <Typography sx={{ fontWeight: 800, color: isDarkTheme ? '#f8fafc' : '#0f172a' }}>Fields</Typography>
            <Box />
          </Box>
          <Divider sx={{ my: 1.5, borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.15)' : 'rgba(2,6,23,0.08)' }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {newColumns.map((c, idx) => (
              <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 0.8fr 0.8fr 1fr 64px', gap: 1.25, alignItems: 'center' }}>
                <TextField
                  value={c.name}
                  onChange={(e) => updateColumn(idx, { name: e.target.value })}
                  placeholder="Enter Column Name"
                  size="small"
                  error={!c.name}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: isDarkTheme ? '#f8fafc' : '#0f172a',
                      backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff',
                      '& fieldset': { borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.25)' : 'rgba(2,6,23,0.15)' },
                    },
                  }}
                />
                <Select
                  size="small"
                  value={c.type}
                  onChange={(e) => updateColumn(idx, { type: e.target.value })}
                  sx={{
                    color: isDarkTheme ? '#f8fafc' : '#0f172a',
                    backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff',
                    '.MuiOutlinedInput-notchedOutline': { borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.25)' : 'rgba(2,6,23,0.15)' },
                    '.MuiSvgIcon-root': { color: isDarkTheme ? '#94a3b8' : 'inherit' },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: { backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff', color: isDarkTheme ? '#f8fafc' : '#0f172a' },
                    },
                  }}
                >
                  {COLUMN_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <input type="checkbox" checked={c.searchable} onChange={(e) => updateColumn(idx, { searchable: e.target.checked })} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <input type="checkbox" checked={c.masked} onChange={(e) => updateColumn(idx, { masked: e.target.checked })} />
                </Box>
                <Select
                  size="small"
                  value={c.field_type}
                  onChange={(e) => updateColumn(idx, { field_type: e.target.value })}
                  sx={{
                    color: isDarkTheme ? '#f8fafc' : '#0f172a',
                    backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff',
                    '.MuiOutlinedInput-notchedOutline': { borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.25)' : 'rgba(2,6,23,0.15)' },
                    '.MuiSvgIcon-root': { color: isDarkTheme ? '#94a3b8' : 'inherit' },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: { backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff', color: isDarkTheme ? '#f8fafc' : '#0f172a' },
                    },
                  }}
                >
                  {FIELD_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <IconButton onClick={() => removeColumn(idx)} disabled={newColumns.length === 1} sx={{ color: '#ef4444' }}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Button onClick={addColumn} sx={{ textTransform: 'none', color: isDarkTheme ? '#38bdf8' : '#2563eb' }}>
              + Add another field
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" onClick={() => setEditOpen(false)} sx={{ textTransform: 'none', color: isDarkTheme ? '#cbd5e1' : 'inherit', borderColor: isDarkTheme ? 'rgba(148,163,184,0.3)' : 'inherit' }}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleEditSave} disabled={saving} sx={{ textTransform: 'none', backgroundColor: '#3b82f6' }}>
                Save
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Add Row Dialog Modal */}
      <Dialog
        open={addRowOpen}
        onClose={() => setAddRowOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            backgroundColor: isDarkTheme ? '#0f172a' : '#ffffff',
            color: isDarkTheme ? '#f8fafc' : '#0f172a',
            border: isDarkTheme ? '1px solid rgba(148, 163, 184, 0.2)' : 'none',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 800, color: isDarkTheme ? '#f8fafc' : '#0f172a' }}>Add Row to Collection</Typography>
          <IconButton onClick={() => setAddRowOpen(false)} sx={{ color: isDarkTheme ? '#94a3b8' : '#64748b' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5, color: isDarkTheme ? '#cbd5e1' : '#475569' }}>
                Select Collection
              </Typography>
              <Select
                fullWidth
                size="small"
                value={addRowTableId}
                onChange={(e) => {
                  setAddRowTableId(e.target.value);
                  setAddRowData({});
                }}
                displayEmpty
                sx={{
                  color: isDarkTheme ? '#f8fafc' : '#0f172a',
                  backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff',
                  '.MuiOutlinedInput-notchedOutline': { borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.25)' : 'rgba(2,6,23,0.15)' },
                  '.MuiSvgIcon-root': { color: isDarkTheme ? '#94a3b8' : 'inherit' },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: { backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff', color: isDarkTheme ? '#f8fafc' : '#0f172a' },
                  },
                }}
              >
                <MenuItem value="" disabled>Select a collection</MenuItem>
                {tables.map((t) => (
                  <MenuItem key={t.table_id} value={t.table_id}>
                    {t.table_name}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            {addRowTableId && addRowColumns.length > 0 ? (
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 800, color: isDarkTheme ? '#f8fafc' : '#0f172a' }}>
                  Fill Column Values
                </Typography>
                {addRowColumns.map((col) => (
                  <Box key={col.name}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5, color: isDarkTheme ? '#cbd5e1' : '#475569' }}>
                      {col.name} {col.field_type !== 'OTHERS' ? `(${col.field_type})` : ''}
                    </Typography>
                    {col.type === 'BOOLEAN' ? (
                      <Select
                        fullWidth
                        size="small"
                        value={addRowData[col.name] || ''}
                        onChange={(e) => setAddRowData((prev) => ({ ...prev, [col.name]: e.target.value }))}
                        displayEmpty
                        sx={{
                          color: isDarkTheme ? '#f8fafc' : '#0f172a',
                          backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff',
                          '.MuiOutlinedInput-notchedOutline': { borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.25)' : 'rgba(2,6,23,0.15)' },
                          '.MuiSvgIcon-root': { color: isDarkTheme ? '#94a3b8' : 'inherit' },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: { backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff', color: isDarkTheme ? '#f8fafc' : '#0f172a' },
                          },
                        }}
                      >
                        <MenuItem value="">Select value</MenuItem>
                        <MenuItem value="true">True</MenuItem>
                        <MenuItem value="false">False</MenuItem>
                      </Select>
                    ) : (
                      <TextField
                        fullWidth
                        size="small"
                        type={col.type === 'INTEGER' ? 'number' : 'text'}
                        placeholder={`Enter ${col.name}`}
                        value={addRowData[col.name] || ''}
                        onChange={(e) => setAddRowData((prev) => ({ ...prev, [col.name]: e.target.value }))}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: isDarkTheme ? '#f8fafc' : '#0f172a',
                            backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff',
                            '& fieldset': { borderColor: isDarkTheme ? 'rgba(148, 163, 184, 0.25)' : 'rgba(2,6,23,0.15)' },
                          },
                        }}
                      />
                    )}
                  </Box>
                ))}
              </Box>
            ) : addRowTableId ? (
              <Typography sx={{ color: isDarkTheme ? '#94a3b8' : '#64748b', fontSize: 13, mt: 1 }}>
                No columns found in this collection.
              </Typography>
            ) : null}

            {error ? (
              <Typography sx={{ color: '#ef4444', fontSize: 13, mt: 1 }}>
                {error}
              </Typography>
            ) : null}

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={() => setAddRowOpen(false)} sx={{ textTransform: 'none', color: isDarkTheme ? '#94a3b8' : '#64748b' }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleAddRowSubmit}
                disabled={saving || !addRowTableId}
                sx={{ textTransform: 'none', backgroundColor: '#2f855a', '&:hover': { backgroundColor: '#276749' } }}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Box
        aria-hidden
        sx={{ position: 'fixed', left: -12000, top: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden' }}
      >
        <div ref={invoiceCaptureRef}>
          {invoiceGenPayload ? <TaxInvoiceCaptureMarkup {...invoiceGenPayload} /> : null}
        </div>
      </Box>
    </Box>
  );
}

export default DataHubCollections;

