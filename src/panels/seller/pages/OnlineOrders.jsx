import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  CircularProgress,
  Divider,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import Swal from 'sweetalert2';
import html2canvas from 'html2canvas';
import { fetchSellerOnlineOrders } from '../../../api/catalogue';
import { useAuth } from '../../../context/AuthContext';
import { useThemeContext } from '../../../context/ThemeContext';
import TaxInvoiceCaptureMarkup from '../../../components/TaxInvoiceCaptureMarkup';

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s.-]+/g, '');
}

function getRowValueCI(row, keys) {
  if (!row || typeof row !== 'object') return '';
  const wanted = (Array.isArray(keys) ? keys : [keys]).map((k) => normalizeKey(k)).filter(Boolean);
  if (wanted.length === 0) return '';
  for (const [rk, rv] of Object.entries(row)) {
    if (wanted.includes(normalizeKey(rk))) return rv ?? '';
  }
  return '';
}

function formatDateTime(raw) {
  if (!raw) return '—';
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(raw);
    return d.toLocaleString();
  } catch {
    return String(raw);
  }
}

/** Same mapping as Data Hub catalogue status column (DataHubCollections). */
function onlineOrderStatusDisplay(raw) {
  const s = String(raw || '').trim();
  const u = s.toUpperCase();
  if (!u) return { label: '—', color: '#64748b' };
  if (u === 'PREVIEW') return { label: 'Preview', color: '#7c3aed' };
  if (u === 'PENDING') return { label: 'Pending', color: '#d97706' };
  if (u === 'APPROVED' || u.startsWith('ACCEPT')) return { label: s, color: '#059669' };
  if (u === 'REJECTED' || u.startsWith('REJECT')) return { label: s, color: '#dc2626' };
  return { label: s || '—', color: '#0f172a' };
}

function canDownloadSellerOrderInvoice(row) {
  if (!row || typeof row !== 'object') return false;
  if (!Array.isArray(row.cart_items) || row.cart_items.length === 0) return false;
  const u = String(getRowValueCI(row, ['status']) || '').trim().toUpperCase();
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
    orderNo: String(getRowValueCI(row, ['order_no', 'order no', 'orderno']) || '').trim() || '—',
    invoiceDateIso: row?.updated_on || row?.inserted_on || new Date().toISOString(),
    customerName: String(getRowValueCI(row, ['customer_name', 'name']) || '').trim() || 'Customer',
    customerPhone: String(getRowValueCI(row, ['customer_phone', 'phone', 'mobile_number']) || '').trim(),
    lines,
    total,
  };
}

function OnlineOrders() {
  const { isDark } = useThemeContext();
  const { user } = useAuth();
  const invoiceCaptureRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewRow, setViewRow] = useState(null);
  const [nameSearch, setNameSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [invoicePreviewPayload, setInvoicePreviewPayload] = useState(null);
  const [invoiceGenPayload, setInvoiceGenPayload] = useState(null);
  const rowsPerPage = 10;

  const loadOnlineOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const rowsResp = await fetchSellerOnlineOrders();
      if (rowsResp?.success && Array.isArray(rowsResp.data)) {
        setRows(rowsResp.data);
      } else {
        setRows([]);
      }
    } catch (e) {
      setRows([]);
      setError(e?.message || 'Failed to load online orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOnlineOrders();
  }, []);

  const shownRows = useMemo(() => {
    const qName = nameSearch.trim().toLowerCase();
    return rows.filter((r) => {
      if (qName) {
        const nm = String(getRowValueCI(r, ['name', 'customer_name']) || '').toLowerCase();
        if (!nm.includes(qName)) return false;
      }
      const status = String(getRowValueCI(r, ['status']) || '').trim();
      if (statusFilter !== 'ALL') {
        const u = status.toUpperCase();
        if (statusFilter === 'PENDING' && u !== 'PENDING') return false;
        if (statusFilter === 'ACCEPT' && !(u === 'APPROVED' || u.startsWith('ACCEPT'))) return false;
        if (statusFilter === 'REJECT' && !(u === 'REJECTED' || u.startsWith('REJECT'))) return false;
      }
      return true;
    });
  }, [rows, nameSearch, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [nameSearch, statusFilter, rows.length]);

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

  const currentInvoiceEligible = useMemo(() => canDownloadSellerOrderInvoice(viewRow), [viewRow]);
  const openInvoicePreview = useCallback(() => {
    if (!viewRow || !currentInvoiceEligible) return;
    setInvoicePreviewPayload(buildInvoicePayloadFromOrderRow(viewRow, user));
  }, [viewRow, currentInvoiceEligible, user]);
  const requestInvoiceDownload = useCallback(() => {
    if (!viewRow || !currentInvoiceEligible) return;
    setInvoiceGenPayload(buildInvoicePayloadFromOrderRow(viewRow, user));
  }, [viewRow, currentInvoiceEligible, user]);

  const totalPages = Math.max(1, Math.ceil(shownRows.length / rowsPerPage));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return shownRows.slice(start, start + rowsPerPage);
  }, [shownRows, page]);

  const allChecked = pagedRows.length > 0 && pagedRows.every((r, idx) => selectedIds.includes(String(r.row_id || idx)));

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 3 },
        backgroundColor: isDark ? '#020617' : '#f1f5f9',
        minHeight: 'calc(100vh - 64px)',
        color: isDark ? '#e5e7eb' : '#0f172a',
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
    >
      <Card
        sx={{
          backgroundColor: isDark ? '#020617' : '#ffffff',
          borderRadius: 2,
          border: isDark ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid #e2e8f0',
          boxShadow: isDark ? '0 20px 45px rgba(15,23,42,0.85)' : '0 10px 30px rgba(0,0,0,0.05)',
          p: { xs: 2, md: 3 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5" fontWeight={700} sx={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            Online Orders
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search by name..."
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              sx={{ minWidth: { xs: 180, sm: 220 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                  </InputAdornment>
                ),
                sx: {
                  color: '#e5e7eb',
                  backgroundColor: '#0f2339',
                  borderRadius: 1,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(148, 163, 184, 0.45)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(148, 163, 184, 0.7)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#0ea5e9',
                  },
                },
              }}
            />
            <TextField
              size="small"
              select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 140 }}
              InputLabelProps={{
                sx: {
                  color: '#cbd5e1',
                  '&.Mui-focused': { color: '#38bdf8' },
                },
              }}
              SelectProps={{
                sx: {
                  color: '#e5e7eb',
                  backgroundColor: '#0f2339',
                  borderRadius: 1,
                  '& .MuiSelect-icon': {
                    color: '#cbd5e1',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(148, 163, 184, 0.45)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(148, 163, 184, 0.7)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#0ea5e9',
                  },
                },
                MenuProps: {
                  PaperProps: {
                    sx: {
                      backgroundColor: '#0f172a',
                      color: '#e5e7eb',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      '& .MuiMenuItem-root.Mui-selected': {
                        backgroundColor: 'rgba(14, 165, 233, 0.18)',
                      },
                      '& .MuiMenuItem-root:hover': {
                        backgroundColor: 'rgba(148, 163, 184, 0.12)',
                      },
                    },
                  },
                },
              }}
            >
              <MenuItem value="ALL">All</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="ACCEPT">Accept</MenuItem>
              <MenuItem value="REJECT">Reject</MenuItem>
            </TextField>
            <Button variant="outlined" onClick={() => void loadOnlineOrders()} sx={{ textTransform: 'none' }}>
              Refresh
            </Button>
          </Box>
        </Box>

        {error ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        <TableContainer
          component={Paper}
          sx={{
            backgroundColor: '#0f172a',
            borderRadius: 2,
            border: '1px solid rgba(148, 163, 184, 0.25)',
            overflow: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ backgroundColor: '#1e293b' }}>
                  <Checkbox
                    checked={allChecked}
                    indeterminate={!allChecked && selectedIds.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds((prev) => {
                          const add = pagedRows.map((r, idx) => String(r.row_id || idx));
                          return Array.from(new Set([...prev, ...add]));
                        });
                      } else {
                        const remove = new Set(pagedRows.map((r, idx) => String(r.row_id || idx)));
                        setSelectedIds((prev) => prev.filter((id) => !remove.has(id)));
                      }
                    }}
                  />
                </TableCell>
                <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 700 }}>Created At / Time</TableCell>
                <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 700 }}>Phone</TableCell>
                <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 700 }}>Address</TableCell>
                <TableCell
                  sx={{
                    backgroundColor: '#1e293b',
                    color: '#e5e7eb',
                    fontWeight: 700,
                    py: 1.25,
                    verticalAlign: 'middle',
                    minWidth: 100,
                  }}
                >
                  Status
                </TableCell>
                <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 700 }}>Order No</TableCell>
                <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 700 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={34} />
                  </TableCell>
                </TableRow>
              ) : shownRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                    No online order entries found.
                  </TableCell>
                </TableRow>
              ) : (
                pagedRows.map((r, idx) => {
                  const rowId = String(r.row_id || ((page - 1) * rowsPerPage + idx));
                  const checked = selectedIds.includes(rowId);
                  return (
                    <TableRow key={rowId} hover>
                      <TableCell>
                        <Checkbox
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, rowId]);
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => id !== rowId));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#e5e7eb' }}>
                        {formatDateTime(getRowValueCI(r, ['created_at', 'inserted_on', 'createdat', 'updated_on']))}
                      </TableCell>
                      <TableCell sx={{ color: '#e5e7eb' }}>{String(getRowValueCI(r, ['name', 'customer_name']) || '—')}</TableCell>
                      <TableCell sx={{ color: '#e5e7eb' }}>{String(getRowValueCI(r, ['phone', 'mobile_number', 'customer_phone']) || '—')}</TableCell>
                      <TableCell sx={{ color: '#e5e7eb' }}>{String(getRowValueCI(r, ['email']) || '—')}</TableCell>
                      <TableCell sx={{ color: '#e5e7eb' }}>{String(getRowValueCI(r, ['address']) || '—')}</TableCell>
                      <TableCell
                        sx={{
                          color: '#e5e7eb',
                          py: 1.25,
                          verticalAlign: 'middle',
                          minWidth: 100,
                        }}
                      >
                        {(() => {
                          const { label, color } = onlineOrderStatusDisplay(getRowValueCI(r, ['status']));
                          return (
                            <Typography component="span" sx={{ fontWeight: 800, fontSize: 13, color, lineHeight: 1.45 }}>
                              {label}
                            </Typography>
                          );
                        })()}
                      </TableCell>
                      <TableCell sx={{ color: '#e5e7eb' }}>{String(getRowValueCI(r, ['order_no', 'order no', 'orderno']) || '—')}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityIcon />}
                          sx={{ textTransform: 'none' }}
                          onClick={() => setViewRow(r)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {!loading && shownRows.length > 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => setPage(p)}
              color="primary"
              sx={{
                '& .MuiPaginationItem-root': {
                  color: '#e5e7eb',
                  '&.Mui-selected': {
                    backgroundColor: '#0ea5e9',
                    color: '#fff',
                    '&:hover': { backgroundColor: '#0284c7' },
                  },
                },
              }}
            />
          </Box>
        ) : null}
      </Card>

      <Dialog open={Boolean(viewRow)} onClose={() => setViewRow(null)} fullWidth maxWidth="md">
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            pr: 1,
          }}
        >
          <Typography sx={{ fontWeight: 900 }}>Cart Summary</Typography>
          <IconButton onClick={() => setViewRow(null)} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography sx={{ color: '#0f172a', fontWeight: 800, fontSize: 13 }}>
              Customer: {String(getRowValueCI(viewRow, ['name', 'customer_name']) || '')}
            </Typography>
            <Typography sx={{ color: '#334155', fontSize: 13 }}>
              Phone: {String(getRowValueCI(viewRow, ['phone', 'mobile_number', 'customer_phone']) || '')}
            </Typography>
            <Typography sx={{ color: '#334155', fontSize: 13 }}>
              Email: {String(getRowValueCI(viewRow, ['email']) || '')}
            </Typography>
            <Typography sx={{ color: '#334155', fontSize: 13 }}>
              Address: {String(getRowValueCI(viewRow, ['address']) || '')}
            </Typography>
            {String(getRowValueCI(viewRow, ['order_no', 'order no', 'orderno']) || '').trim() ? (
              <Typography sx={{ color: '#0f172a', fontSize: 13, fontWeight: 800, mt: 0.5 }}>
                Order no.: {String(getRowValueCI(viewRow, ['order_no', 'order no', 'orderno']))}
              </Typography>
            ) : null}
            {(() => {
              const { label, color } = onlineOrderStatusDisplay(getRowValueCI(viewRow, ['status']));
              if (label === '—' && !String(getRowValueCI(viewRow, ['status']) || '').trim()) return null;
              return (
                <Typography component="span" sx={{ fontSize: 13, fontWeight: 800, mt: 0.5, color, display: 'block' }}>
                  Status: {label}
                </Typography>
              );
            })()}
            <Divider sx={{ my: 1 }} />
            {Array.isArray(viewRow?.cart_items) && viewRow.cart_items.length > 0 ? (
              viewRow.cart_items.map((it, idx) => (
                <Box
                  key={`${it.product_id || idx}`}
                  sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, p: 1, border: '1px solid rgba(2,6,23,0.08)', borderRadius: 1.5 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, color: '#0f172a' }}>{String(it.product_name || it.name || '')}</Typography>
                    <Typography sx={{ color: '#64748b', fontSize: 12 }}>
                      Qty: {Number(it.qty) || 0} | Price: ₹{Number(it.price) || 0}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 900, color: '#0f172a' }}>
                    ₹{((Number(it.price) || 0) * (Number(it.qty) || 0)).toFixed(2)}
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography sx={{ color: '#64748b' }}>No cart items found.</Typography>
            )}
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontWeight: 900, color: '#0f172a' }}>Total</Typography>
              <Typography sx={{ fontWeight: 900, color: '#0f172a' }}>
                ₹
                {(
                  Array.isArray(viewRow?.cart_items)
                    ? viewRow.cart_items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0)
                    : 0
                ).toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={openInvoicePreview}
                disabled={!currentInvoiceEligible}
                sx={{ textTransform: 'none' }}
                title={currentInvoiceEligible ? 'View invoice' : 'Invoice is available only for approved orders'}
              >
                View Invoice
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={requestInvoiceDownload}
                disabled={!currentInvoiceEligible}
                sx={{ textTransform: 'none' }}
                title={currentInvoiceEligible ? 'Download invoice as PNG' : 'Invoice is available only for approved orders'}
              >
                Download Invoice
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(invoicePreviewPayload)} onClose={() => setInvoicePreviewPayload(null)} fullWidth maxWidth="md">
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            pr: 1,
          }}
        >
          <Typography sx={{ fontWeight: 900 }}>Online Invoice</Typography>
          <IconButton onClick={() => setInvoicePreviewPayload(null)} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {invoicePreviewPayload ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'center' }}>
              <TaxInvoiceCaptureMarkup {...invoicePreviewPayload} />
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" onClick={requestInvoiceDownload} sx={{ textTransform: 'none' }}>
                  Download Invoice
                </Button>
              </Box>
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>
      <Box
        sx={{
          position: 'fixed',
          left: -10000,
          top: -10000,
          width: 0,
          height: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
        aria-hidden
      >
        <Box ref={invoiceCaptureRef}>
          {invoiceGenPayload ? <TaxInvoiceCaptureMarkup {...invoiceGenPayload} /> : null}
        </Box>
      </Box>
    </Box>
  );
}

export default OnlineOrders;

