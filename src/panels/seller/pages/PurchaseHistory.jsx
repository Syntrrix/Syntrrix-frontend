import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Autocomplete,
  Grid,
  Divider,
  Pagination,
  InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AddIcon from '@mui/icons-material/Add';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SearchIcon from '@mui/icons-material/Search';
import { fetchPurchaseHistory, createPurchase, updatePurchaseItem } from '../../../api/purchases';
import { fetchSuppliers } from '../../../api/suppliers';
import { fetchProducts } from '../../../api/products';
import { fetchBatchesByProduct, fetchBatches, updateBatch } from '../../../api/batches';
import { useAuth } from '../../../context/AuthContext';
import Swal from 'sweetalert2';
import { useThemeContext } from '../../../context/ThemeContext';

function PurchaseHistory() {
  const { isDark } = useThemeContext();
  const [purchases, setPurchases] = useState([]);
  const { user } = useAuth();
  const invoiceDateRef = useRef(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [error, setError] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [suppliers, setSuppliers] = useState([]);

  // Editable items state for View modal
  const [editableItems, setEditableItems] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [savingItem, setSavingItem] = useState(null);

  // Invoice viewer state
  const [invoiceViewerOpen, setInvoiceViewerOpen] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState(null);

  // Add New Purchase Modal State
  const [addPurchaseModalOpen, setAddPurchaseModalOpen] = useState(false);
  const [purchaseFormData, setPurchaseFormData] = useState({
    supplier: '',
    invoiceNumber: '',
    invoiceDate: '',
    invoiceFile: null,
  });
  const [purchaseRows, setPurchaseRows] = useState([
    {
      id: 1,
      product: '',
      batch: '',
      purchasePrice: '',
      sellingPrice: '',
      mrp: '',
      quantity: '',
      gst: '',
    },
  ]);
  const [purchaseProducts, setPurchaseProducts] = useState([]);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');
  const [netTotal, setNetTotal] = useState(0);
  const [loadingPurchaseData, setLoadingPurchaseData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    // Reload purchase history when supplier filter changes
    loadPurchaseHistory();
  }, [selectedSupplier]);

  useEffect(() => {
    if (addPurchaseModalOpen) {
      loadPurchaseInitialData();
    }
  }, [addPurchaseModalOpen]);

  useEffect(() => {
    calculatePurchaseTotal();
  }, [purchaseRows]);

  const loadSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const response = await fetchSuppliers();
      if (response && response.success && Array.isArray(response.data)) {
        const supplierList = response.data.map((s) => ({
          id: s.supplier_id,
          name: s.supplier_name,
        }));
        setSuppliers(supplierList);
      } else {
        setSuppliers([]);
      }
    } catch (err) {
      console.error('Error loading suppliers:', err);
      setSuppliers([]);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const loadPurchaseHistory = async () => {
    setLoading(true);
    setError('');
    try {
      // If selectedSupplier is empty, pass null to fetch all purchases
      // Otherwise, pass the supplier ID to filter by supplier
      const supplierId = selectedSupplier ? parseInt(selectedSupplier) : null;
      const response = await fetchPurchaseHistory(supplierId);
      setPurchaseHistory(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch purchase history.');
      setPurchaseHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // Format date with time
  const formatDateTime = (dateString, createdAt = null) => {
    if (!dateString) return 'N/A';

    try {
      // Check if dateString includes time (datetime format)
      let dateObj;
      if (dateString.includes('T') || dateString.includes(' ')) {
        // It's a datetime string
        dateObj = new Date(dateString);
      } else {
        // It's just a date, use created_at for time if available
        if (createdAt) {
          dateObj = new Date(createdAt);
        } else {
          // Just date, set time to start of day
          dateObj = new Date(dateString + 'T00:00:00');
        }
      }

      if (isNaN(dateObj.getTime())) {
        return dateString; // Return original if invalid
      }

      // Format: DD/MM/YYYY HH:MM
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');

      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      return dateString; // Return original if formatting fails
    }
  };

  // Transform raw purchase records (each with nested items) into grouped invoices
  const groupedInvoices = useMemo(() => {
    if (!purchaseHistory || purchaseHistory.length === 0) return [];

    // Backend returns one record per invoice, with nested items array
    const invoices = purchaseHistory.map((purchase) => {
      const items = (purchase.items || []).map((item) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.purchase_price) || 0;
        const gst = parseFloat(item.gst) || 0;
        const line = price * qty * (1 + gst / 100);
        return {
          item_id: item.item_id,
          product_id: item.product,
          batch_id: item.batch || item.batch_info?.batch_id || null,
          item: item.product_name,
          batch: item.batch_name,
          qty: item.quantity,
          price: item.purchase_price,
          gst: item.gst,
          line,
        };
      });

      const total = items.reduce((sum, item) => sum + item.line, 0);

      return {
        id: purchase.product_purchase_id,
        date: formatDateTime(purchase.invoice_date, purchase.created_at),
        dateForSorting: purchase.invoice_date || purchase.created_at, // Keep original for sorting
        supplier: purchase.supplier_name,
        invoice: purchase.invoice_number,
        total,
        items,
        invoice_file_url: purchase.invoice_file_url || null,
      };
    });

    // Sort by date (newest first) - use original date for sorting
    return invoices.sort((a, b) => new Date(b.dateForSorting) - new Date(a.dateForSorting));
  }, [purchaseHistory]);

  // Filter invoices based on search term
  const filteredInvoices = useMemo(() => {
    if (!searchTerm.trim()) {
      return groupedInvoices;
    }
    const searchLower = searchTerm.toLowerCase().trim();
    return groupedInvoices.filter((invoice) => {
      const supplierName = (invoice.supplier || '').toLowerCase();
      const invoiceNumber = (invoice.invoice || '').toString().toLowerCase();
      return (
        supplierName.includes(searchLower) ||
        invoiceNumber.includes(searchLower)
      );
    });
  }, [groupedInvoices, searchTerm]);

  // Reset page to 1 when search term changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  // Calculate paginated data
  const paginatedInvoices = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredInvoices.slice(startIndex, endIndex);
  }, [filteredInvoices, page, rowsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredInvoices.length / rowsPerPage);

  const handleView = (invoiceGroup) => {
    // `invoiceGroup` already has all items for that invoice
    setSelectedPurchase(invoiceGroup);
    // Initialize editable items with original values
    setEditableItems(invoiceGroup.items.map((item) => ({
      item_id: item.item_id,
      product_id: item.product_id,
      batch_id: item.batch_id,
      batch: item.batch, // batch_name
      qty: item.qty.toString(),
      originalBatch: item.batch,
      originalQty: item.qty.toString(),
    })));
    setIsEditing(false);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedPurchase(null);
    setEditableItems([]);
    setIsEditing(false);
    setSavingItem(null);
  };

  const handleViewInvoice = () => {
    if (selectedPurchase?.invoice_file_url) {
      let url = selectedPurchase.invoice_file_url;
      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000/';
      const baseUrl = API_BASE_URL.replace('/api', '').replace(/\/$/, '');

      // Backend serializer should return full URL like: http://127.0.0.1:8000/media/invoices/filename.pdf
      // But handle both absolute and relative URLs for safety
      if (!url || url === 'null' || url === 'undefined') {
        console.error('Invalid invoice URL:', url);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Invoice URL is not available.',
        });
        return;
      }

      if (!url.startsWith('http')) {
        // Relative URL - make it absolute
        if (url.startsWith('/media/invoices/')) {
          url = `${baseUrl}${url}`;
        } else if (url.startsWith('/invoices/')) {
          // Convert /invoices/ to /media/invoices/
          url = `${baseUrl}/media${url}`;
        } else if (url.startsWith('/media/')) {
          url = `${baseUrl}${url}`;
        } else {
          // Just filename or partial path
          const filename = url.split('/').pop();
          url = `${baseUrl}/media/invoices/${filename}`;
        }
      } else {
        // Absolute URL - ensure it uses /media/invoices/ path
        try {
          const urlObj = new URL(url);
          if (urlObj.pathname.startsWith('/invoices/') && !urlObj.pathname.startsWith('/media/invoices/')) {
            // Convert /invoices/ to /media/invoices/
            url = `${urlObj.protocol}//${urlObj.host}/media${urlObj.pathname}`;
          }
        } catch (e) {
          console.error('Error parsing invoice URL:', e);
        }
      }

      // Open invoice PDF in a new browser tab
      window.open(url, '_blank');
    } else {
      console.warn('No invoice_file_url available in selectedPurchase:', selectedPurchase);
      Swal.fire({
        icon: 'warning',
        title: 'No Invoice',
        text: 'No invoice file is available for this purchase.',
      });
    }
  };

  const handleCloseInvoiceViewer = () => {
    setInvoiceViewerOpen(false);
    setInvoiceUrl(null);
  };

  const handleEditItem = (index, field, value) => {
    setEditableItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveItem = async (index) => {
    const editableItem = editableItems[index];
    const originalItem = selectedPurchase.items[index];

    if (!editableItem.item_id) {
      setError('Item ID not found. Cannot update item.');
      return;
    }

    // Check if anything changed
    const batchChanged = editableItem.batch !== editableItem.originalBatch;
    const qtyChanged = editableItem.qty !== editableItem.originalQty;

    if (!batchChanged && !qtyChanged) {
      // No changes, nothing to save
      return;
    }

    // Validate quantity if changed
    let qty = null;
    if (qtyChanged) {
      qty = parseFloat(editableItem.qty);
      if (isNaN(qty) || qty <= 0) {
        setError('Invalid quantity. Must be greater than 0.');
        return;
      }
    }

    // Validate batch name if changed - update batch_name in batch table
    let batchNameToUpdate = null;
    let batchChangeValid = false;
    if (batchChanged) {
      const trimmedBatch = editableItem.batch.trim();
      if (trimmedBatch === '') {
        setError('Batch name cannot be empty. Please enter a valid batch name.');
        return;
      }

      // Check if we have a batch_id for the current batch
      if (!editableItem.batch_id) {
        setError('Batch ID not found. Cannot update batch name.');
        return;
      }

      // Set batch name to update
      batchNameToUpdate = trimmedBatch;
      batchChangeValid = true;
    }

    // Ensure we have at least one field to update
    if (!qtyChanged && !batchChangeValid) {
      setError('No valid fields to update. Please change quantity or batch name.');
      return;
    }

    setSavingItem(index);
    setError('');

    try {
      // Build the update payload for purchase item
      const updatePayload = {
        item_id: editableItem.item_id,
      };

      // Step 1: Update batch table's batch_name column if batch name changed
      if (batchChangeValid && batchNameToUpdate && editableItem.batch_id) {
        try {
          // Ensure batch_id is a valid positive integer
          const batchIdToSync = parseInt(editableItem.batch_id, 10);
          if (!batchIdToSync || batchIdToSync <= 0) {
            throw new Error('Invalid batch ID. Cannot update batch name.');
          }

          // Update batch table's batch_name column
          const batchUpdateResponse = await updateBatch(batchIdToSync, {
            batch_name: batchNameToUpdate,
          });

          if (!batchUpdateResponse.success) {
            throw new Error(batchUpdateResponse.message || 'Failed to update batch name in batch table.');
          }

          // Include batch_id in update payload to trigger backend sync of batch_name
          // The backend will refresh the batch relationship and update item.batch_name
          updatePayload.batch_id = batchIdToSync;

        } catch (batchErr) {
          setError(`Failed to update batch name: ${batchErr.message || 'Please try again.'}`);
          setSavingItem(null);
          return;
        }
      }

      // Step 2: Include quantity in update payload if changed
      if (qtyChanged && qty !== null) {
        updatePayload.quantity = qty;
      }

      // Step 3: Build clean payload with only valid values
      // This ensures we don't accidentally send invalid values
      const cleanPayload = {
        item_id: updatePayload.item_id,
      };

      // Add batch_id if batch name was changed (always include it to trigger sync)
      if (batchChangeValid && batchNameToUpdate && updatePayload.batch_id) {
        cleanPayload.batch_id = updatePayload.batch_id;
      }

      // Add quantity if it was changed
      if (qtyChanged && qty !== null && !isNaN(qty) && qty > 0) {
        cleanPayload.quantity = qty;
      }

      // Step 4: Validate we have at least one field to update
      const hasBatchId = cleanPayload.hasOwnProperty('batch_id') && cleanPayload.batch_id !== undefined && cleanPayload.batch_id !== null;
      const hasQuantity = cleanPayload.hasOwnProperty('quantity') && cleanPayload.quantity !== undefined && cleanPayload.quantity !== null;

      if (!hasBatchId && !hasQuantity) {
        setError('No valid fields to update. Please change quantity or batch name.');
        setSavingItem(null);
        return;
      }

      // Step 5: Call updatePurchaseItem ONCE with all changes (batch_id and/or quantity)
      // This ensures both batch_name sync and quantity update happen in a single transaction
      console.log('Updating purchase item with payload:', cleanPayload);
      const response = await updatePurchaseItem(cleanPayload);

      if (!response || !response.success) {
        console.error('Update purchase item failed:', response);
        throw new Error(response?.message || 'Failed to update purchase item.');
      }

      console.log('Update purchase item success:', response);

      // Update local state (batch name update already succeeded, quantity update succeeded if it was attempted)
      setSelectedPurchase((prev) => {
        const updatedItems = [...prev.items];
        const currentItem = updatedItems[index];

        // Update batch name if changed
        if (batchChangeValid && batchNameToUpdate) {
          updatedItems[index] = {
            ...currentItem,
            batch: batchNameToUpdate,
          };
        }

        // Update quantity if changed
        if (qtyChanged && qty !== null) {
          const itemToUpdate = updatedItems[index];
          updatedItems[index] = {
            ...itemToUpdate,
            qty: qty.toString(),
          };
          // Recalculate line total
          const item = updatedItems[index];
          const price = parseFloat(item.price) || 0;
          const gst = parseFloat(item.gst) || 0;
          item.line = price * qty * (1 + gst / 100);
          // Recalculate total
          const total = updatedItems.reduce((sum, i) => sum + i.line, 0);
          return { ...prev, items: updatedItems, total };
        }

        return { ...prev, items: updatedItems };
      });

      // Update editable items to mark as saved - use the updated batch name and quantity
      setEditableItems((prev) => {
        const updated = [...prev];
        // Use batchNameToUpdate if batch was changed, otherwise keep current value
        const newBatchValue = batchChangeValid && batchNameToUpdate ? batchNameToUpdate : editableItem.batch;
        // Use new qty if changed, otherwise keep current value
        const newQtyValue = qtyChanged && qty !== null ? qty.toString() : editableItem.qty;
        updated[index] = {
          ...updated[index],
          batch: newBatchValue,
          qty: newQtyValue,
          originalBatch: newBatchValue, // Update original to match new value
          originalQty: newQtyValue, // Update original to match new value
        };
        return updated;
      });

      // Reload purchase history to get fresh data and update the modal view
      if (selectedSupplier) {
        await loadPurchaseHistory();

        // Update selectedPurchase with fresh data from reloaded purchase history
        // Find the updated purchase in the newly loaded data
        const updatedPurchaseHistory = await fetchPurchaseHistory(parseInt(selectedSupplier));
        if (updatedPurchaseHistory && updatedPurchaseHistory.success && Array.isArray(updatedPurchaseHistory.data)) {
          const updatedPurchase = updatedPurchaseHistory.data.find(
            (p) => p.product_purchase_id === selectedPurchase.id
          );

          if (updatedPurchase) {
            // Rebuild the items array with updated batch names
            const updatedItems = (updatedPurchase.items || []).map((item) => {
              const qty = parseFloat(item.quantity) || 0;
              const price = parseFloat(item.purchase_price) || 0;
              const gst = parseFloat(item.gst) || 0;
              const line = price * qty * (1 + gst / 100);
              return {
                item_id: item.item_id,
                product_id: item.product,
                batch_id: item.batch || item.batch_info?.batch_id || null,
                item: item.product_name,
                batch: item.batch_name, // This will have the updated batch name
                qty: item.quantity,
                price: item.purchase_price,
                gst: item.gst,
                line,
              };
            });

            const total = updatedItems.reduce((sum, item) => sum + item.line, 0);

            // Update selectedPurchase with fresh data
            setSelectedPurchase({
              id: updatedPurchase.product_purchase_id,
              date: updatedPurchase.invoice_date,
              supplier: updatedPurchase.supplier_name,
              invoice: updatedPurchase.invoice_number,
              total,
              items: updatedItems,
              invoice_file_url: updatedPurchase.invoice_file_url || null,
            });

            // Also update editableItems to match the fresh data
            setEditableItems(updatedItems.map((item) => ({
              item_id: item.item_id,
              product_id: item.product_id,
              batch_id: item.batch_id,
              batch: item.batch,
              qty: item.qty.toString(),
              originalBatch: item.batch,
              originalQty: item.qty.toString(),
            })));
          }
        }
      }

      // Prepare success message
      let successMessage = 'Item updated successfully.';
      if (batchChangeValid && qtyChanged) {
        successMessage = 'Batch name and quantity updated successfully.';
      } else if (batchChangeValid) {
        successMessage = 'Batch name updated successfully.';
      } else if (qtyChanged) {
        successMessage = response?.message || 'Quantity updated successfully.';
      }

      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: successMessage,
        confirmButtonColor: '#0ea5e9',
      });
    } catch (err) {
      let errorMessage = 'Failed to update item.';
      if (err.response && err.response.data) {
        const apiError = err.response.data;
        errorMessage = apiError.message || apiError.error || JSON.stringify(apiError);
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#d32f2f',
      });
    } finally {
      setSavingItem(null);
    }
  };

  const handleCancelEdit = (index) => {
    // Reset specific item to original values
    setEditableItems((prev) => {
      const updated = [...prev];
      const originalItem = selectedPurchase.items[index];
      updated[index] = {
        item_id: originalItem.item_id,
        product_id: originalItem.product_id,
        batch_id: originalItem.batch_id,
        batch: originalItem.batch,
        qty: originalItem.qty.toString(),
        originalBatch: originalItem.batch,
        originalQty: originalItem.qty.toString(),
      };
      return updated;
    });
    setError('');
  };

  const loadPurchaseInitialData = async () => {
    setLoadingPurchaseData(true);
    try {
      const sellerUserId = user?.id || null;
      if (!sellerUserId) {
        setPurchaseError('Seller user ID not found. Please login again.');
        setLoadingPurchaseData(false);
        return;
      }

      const [productsRes, suppliersRes] = await Promise.all([
        fetchProducts(sellerUserId).catch((err) => {
          console.error('Error fetching products:', err);
          return { success: false, data: [] };
        }),
        fetchSuppliers().catch((err) => {
          console.error('Error fetching suppliers:', err);
          return { success: false, data: [] };
        }),
      ]);

      if (productsRes && productsRes.success && Array.isArray(productsRes.data)) {
        setPurchaseProducts(productsRes.data);
      } else {
        setPurchaseProducts([]);
      }

      if (suppliersRes && suppliersRes.success && Array.isArray(suppliersRes.data)) {
        // Update suppliers list if needed
        const supplierList = suppliersRes.data.map((supplier) => ({
          id: supplier.supplier_id,
          name: supplier.supplier_name,
        }));
        // Merge with existing suppliers if needed
      }
    } catch (err) {
      console.error('Error loading purchase data:', err);
      setPurchaseProducts([]);
    } finally {
      setLoadingPurchaseData(false);
    }
  };

  const calculatePurchaseTotal = () => {
    let total = 0;
    purchaseRows.forEach((row) => {
      const purchasePrice = parseFloat(row.purchasePrice) || 0;
      const sellingPrice = parseFloat(row.sellingPrice) || 0;
      const quantity = parseFloat(row.quantity) || 0;
      const gst = parseFloat(row.gst) || 0;
      // const lineTotal = sellingPrice * quantity * (1 + gst / 100);
      const lineTotal = purchasePrice * quantity * (1 + gst / 100);
      total += lineTotal;
    });
    setNetTotal(total);
  };

  const handlePurchaseFormChange = (field, value) => {
    setPurchaseFormData((prev) => ({ ...prev, [field]: value }));
    setPurchaseError('');
  };

  const handlePurchaseRowChange = (rowId, field, value) => {
    setPurchaseRows((prevRows) =>
      prevRows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
  };

  const addPurchaseRow = () => {
    const newRow = {
      id: Date.now(),
      product: '',
      batch: '',
      purchasePrice: '',
      sellingPrice: '',
      mrp: '',
      quantity: '',
      gst: '',
    };
    setPurchaseRows((prevRows) => [...prevRows, newRow]);
  };

  const removePurchaseRow = (rowId) => {
    if (purchaseRows.length > 1) {
      setPurchaseRows((prevRows) => prevRows.filter((row) => row.id !== rowId));
    }
  };

  const handlePurchaseRecalculate = () => {
    calculatePurchaseTotal();
  };

  const handlePurchaseFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPurchaseFormData((prev) => ({ ...prev, invoiceFile: file }));
      // Clear invoice file error when file is selected
      if (purchaseError && purchaseError.includes('invoice file')) {
        setPurchaseError('');
      }
    }
  };

  const handlePurchaseClear = () => {
    setPurchaseFormData({
      supplier: '',
      invoiceNumber: '',
      invoiceDate: '',
      invoiceFile: null,
    });
    setPurchaseRows([
      {
        id: 1,
        product: '',
        batch: '',
        purchasePrice: '',
        sellingPrice: '',
        mrp: '',
        quantity: '',
        gst: '',
      },
    ]);
    setPurchaseError('');
    setNetTotal(0);
  };

  const formatInvoiceDate = (value) => {
    if (!value) return value;
    if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return value;
    }
    if (value.includes('/')) {
      const [day, month, year] = value.split('/');
      if (year && month && day) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    const [year, month, day] = value.split('-');
    if (year && month && day) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return value;
  };

  const handlePurchaseSubmit = async () => {
    if (!purchaseFormData.supplier) {
      setPurchaseError('Please select a supplier');
      return;
    }
    if (!purchaseFormData.invoiceNumber) {
      setPurchaseError('Please enter invoice number');
      return;
    }
    if (!purchaseFormData.invoiceDate) {
      setPurchaseError('Please enter invoice date');
      return;
    }
    if (!purchaseFormData.invoiceFile) {
      setPurchaseError('Please attach invoice file');
      return;
    }

    const invalidRows = purchaseRows.filter(
      (row) =>
        !row.product ||
        !row.batch ||
        !row.purchasePrice ||
        !row.sellingPrice ||
        !row.quantity
    );

    if (invalidRows.length > 0) {
      setPurchaseError('Please fill all required fields in all rows (Product, Batch, Purchase Price, Selling Price, Quantity)');
      return;
    }

    setPurchaseLoading(true);
    setPurchaseError('');

    try {
      const items = purchaseRows.map((row, index) => {
        const productValue = String(row.product || '').trim();
        if (!productValue) {
          throw new Error(`Product is required for row ${index + 1}`);
        }

        let productId = null;
        let productNameForCreate = null;
        const productIdNum = parseInt(productValue);

        if (!isNaN(productIdNum) && productIdNum > 0) {
          if (purchaseProducts && purchaseProducts.length > 0) {
            const existingById = purchaseProducts.find((p) => Number(p.product_id) === productIdNum);
            if (existingById) {
              productId = existingById.product_id;
            } else {
              productNameForCreate = productValue;
            }
          } else {
            productNameForCreate = productValue;
          }
        } else {
          if (purchaseProducts && purchaseProducts.length > 0) {
            const existingProduct = purchaseProducts.find(
              (p) =>
                p.product_name &&
                p.product_name.trim().toLowerCase() === productValue.toLowerCase(),
            );
            if (existingProduct) {
              productId = existingProduct.product_id;
            } else {
              productNameForCreate = productValue;
            }
          } else {
            productNameForCreate = productValue;
          }
        }

        const batchValue = String(row.batch || '').trim();
        if (!batchValue) {
          throw new Error(`Batch is required for row ${index + 1}`);
        }

        const purchasePrice = parseFloat(String(row.purchasePrice || '').trim());
        const sellingPrice = parseFloat(String(row.sellingPrice || '').trim());
        const mrpValue = String(row.mrp || '').trim();
        const mrp = mrpValue !== '' ? parseFloat(mrpValue) : null;
        const quantity = parseInt(String(row.quantity || '').trim());
        const gstValue = String(row.gst || '').trim();
        const gst = gstValue !== '' ? parseFloat(gstValue) : 0;

        if (isNaN(purchasePrice) || purchasePrice <= 0) {
          throw new Error(`Invalid purchase price in row ${index + 1}. Must be greater than 0.`);
        }
        if (isNaN(sellingPrice) || sellingPrice <= 0) {
          throw new Error(`Invalid selling price in row ${index + 1}. Must be greater than 0.`);
        }
        if (mrp !== null && (isNaN(mrp) || mrp <= 0)) {
          throw new Error(`Invalid MRP in row ${index + 1}. Must be greater than 0 if provided.`);
        }
        if (isNaN(quantity) || quantity <= 0) {
          throw new Error(`Invalid quantity in row ${index + 1}. Must be greater than 0.`);
        }
        if (isNaN(gst) || gst < 0) {
          throw new Error(`Invalid GST in row ${index + 1}. Must be 0 or greater.`);
        }

        // Build item object according to API documentation (POST /purchases/)
        const item = {
          batch_name: batchValue, // Use batch_name as per API documentation
          purchase_price: Number(purchasePrice),
          selling_price: Number(sellingPrice),
          quantity: Number(quantity),
          gst: Number(gst) || 0,
        };

        // Add MRP only if provided (it's optional according to API documentation)
        if (mrp !== null && !isNaN(mrp) && mrp > 0) {
          item.mrp = Number(mrp);
        }

        if (productId) {
          item.product = Number(productId);
        } else if (productNameForCreate) {
          item.product_name = productNameForCreate;
          if (user?.id) {
            item.seller_user_id = user.id;
          }
        }

        if (!item.product && !item.product_name) {
          throw new Error(`Product is required in row ${index + 1}. Please enter a product ID or name.`);
        }
        if (!item.batch_name || item.batch_name.trim() === '') {
          throw new Error(`Batch is required in row ${index + 1}.`);
        }

        return item;
      });

      const supplierId = parseInt(purchaseFormData.supplier);
      if (isNaN(supplierId) || supplierId <= 0) {
        throw new Error('Invalid supplier selected. Please select a valid supplier.');
      }

      if (!items || items.length === 0) {
        throw new Error('No items to save. Please add at least one item.');
      }

      const purchaseData = {
        supplier: supplierId,
        invoice_number: purchaseFormData.invoiceNumber.trim(),
        invoice_date: formatInvoiceDate(purchaseFormData.invoiceDate),
        items: items,
      };

      if (purchaseFormData.invoiceFile) {
        purchaseData.invoice_file = purchaseFormData.invoiceFile;
      }

      if (!purchaseData.invoice_date || !purchaseData.invoice_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error('Invalid invoice date format. Please enter a valid date.');
      }

      if (!purchaseData.invoice_number || purchaseData.invoice_number.trim() === '') {
        throw new Error('Invoice number is required.');
      }

      const response = await createPurchase(purchaseData);

      if (!response) {
        throw new Error('No response received from server. Please try again.');
      }

      if (response.success === false) {
        let errorMsg = 'Failed to save purchase entries.';
        if (response.message) {
          errorMsg = typeof response.message === 'string' ? response.message : JSON.stringify(response.message);
        } else if (response.errors) {
          if (typeof response.errors === 'string') {
            errorMsg = response.errors;
          } else if (Array.isArray(response.errors)) {
            errorMsg = response.errors.map(e => typeof e === 'string' ? e : JSON.stringify(e)).join(', ');
          } else if (typeof response.errors === 'object') {
            const errorKeys = Object.keys(response.errors);
            const errorMessages = errorKeys.map(key => {
              const fieldError = response.errors[key];
              if (typeof fieldError === 'string') return `${key}: ${fieldError}`;
              if (Array.isArray(fieldError)) return `${key}: ${fieldError.join(', ')}`;
              return `${key}: ${JSON.stringify(fieldError)}`;
            });
            errorMsg = errorMessages.join('; ');
          }
        }
        throw new Error(errorMsg);
      }

      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: response.message || 'Purchase entries saved successfully.',
        confirmButtonColor: '#0ea5e9',
      });

      handlePurchaseClear();
      setAddPurchaseModalOpen(false);

      // Reload purchase history if supplier is selected
      if (selectedSupplier) {
        loadPurchaseHistory();
      }
    } catch (err) {
      let errorMessage = 'Failed to save purchase entries.';
      if (err.response && err.response.data) {
        const apiError = err.response.data;
        if (apiError.errors) {
          errorMessage = JSON.stringify(apiError.errors);
        } else if (apiError.message) {
          errorMessage = apiError.message;
        } else if (apiError.error) {
          errorMessage = String(apiError.error);
        } else if (apiError.detail) {
          errorMessage = String(apiError.detail);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setPurchaseError(errorMessage);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#d32f2f',
        width: '600px',
      });
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleOpenAddPurchaseModal = () => {
    setAddPurchaseModalOpen(true);
    handlePurchaseClear();
  };

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 3 },
        backgroundColor: isDark ? '#020617' : '#f1f5f9',
        height: 'calc(100vh - 64px)',
        overflow: 'hidden',
        color: isDark ? '#e5e7eb' : '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
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
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Header with Add New Purchase Button */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            flexShrink: 0,
          }}
        >
          <Typography variant="h5" fontWeight={700} sx={{ color: isDark ? '#e5e7eb' : '#0f172a' }}>
            Purchase History
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAddPurchaseModal}
            sx={{
              textTransform: 'none',
              px: 3,
              borderRadius: '24px',
              backgroundColor: '#0ea5e9',
              '&:hover': { backgroundColor: '#0284c7' },
            }}
          >
            Add New Purchase
          </Button>
        </Box>

        {/* Filter Section */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexShrink: 0 }}>
          <Autocomplete
            options={suppliers}
            getOptionLabel={(option) => option?.name || ''}
            value={
              selectedSupplier
                ? suppliers.find((s) => String(s.id) === String(selectedSupplier)) || null
                : null
            }
            onChange={(_, newValue) => {
              setSelectedSupplier(newValue ? newValue.id : '');
            }}
            loading={loadingSuppliers}
            size="small"
            sx={{ width: 300 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Filter by Supplier"
                placeholder="Search supplier by name"
                disabled={loadingSuppliers}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: isDark ? '#0f2339' : '#f8fafc',
                    color: isDark ? '#e5e7eb' : '#0f172a',
                    borderRadius: 2,
                  },
                  '& .MuiInputLabel-root': {
                    color: isDark ? '#9ca3af' : '#475569',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(148, 163, 184, 0.3)' : '#cbd5e1',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(148, 163, 184, 0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#0ea5e9',
                  },
                }}
                InputProps={{
                  ...params.InputProps,
                  sx: {
                    ...params.InputProps.sx,
                    color: isDark ? '#e5e7eb' : '#0f172a',
                  },
                }}
              />
            )}
            noOptionsText={loadingSuppliers ? 'Loading suppliers...' : 'No suppliers found'}
            PaperComponent={({ children, ...other }) => (
              <Paper {...other} sx={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#e5e7eb' : '#0f172a' }}>
                {children}
              </Paper>
            )}
          />
          {loadingSuppliers && (
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
              Loading suppliers...
            </Typography>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Search Bar */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexShrink: 0 }}>
          <TextField
            fullWidth
            placeholder="Search by Supplier Name or Invoice Number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#9ca3af' }} />
                </InputAdornment>
              ),
              sx: {
                color: isDark ? '#e5e7eb' : '#0f172a',
                backgroundColor: isDark ? '#0f2339' : '#f8fafc',
                borderRadius: 2,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDark ? 'rgba(148, 163, 184, 0.3)' : '#cbd5e1',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(148, 163, 184, 0.5)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#0ea5e9',
                },
              },
            }}
          />
        </Box>

        {/* Purchase History Table */}
        <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <TableContainer
            component={Paper}
            sx={{
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderRadius: 2,
              border: isDark ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid #e2e8f0',
              flexGrow: 1,
              overflow: 'auto',
              minHeight: 0,
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      backgroundColor: isDark ? '#1e293b' : '#0ea5e9',
                      color: '#ffffff',
                      fontWeight: 700,
                      borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                    }}
                  >
                    Date
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: isDark ? '#1e293b' : '#0ea5e9',
                      color: '#ffffff',
                      fontWeight: 700,
                      borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                    }}
                  >
                    Supplier
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: isDark ? '#1e293b' : '#0ea5e9',
                      color: '#ffffff',
                      fontWeight: 700,
                      borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                    }}
                  >
                    Invoice
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: isDark ? '#1e293b' : '#0ea5e9',
                      color: '#ffffff',
                      fontWeight: 700,
                      borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                    }}
                  >
                    Total
                  </TableCell>
                  <TableCell
                    sx={{
                      backgroundColor: isDark ? '#1e293b' : '#0ea5e9',
                      color: '#ffffff',
                      fontWeight: 700,
                      borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                      textAlign: 'center',
                    }}
                  >
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={40} sx={{ color: '#0ea5e9' }} />
                    </TableCell>
                  </TableRow>
                ) : groupedInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: '#9ca3af' }}>
                      {selectedSupplier ? 'No purchase history available for this supplier' : 'Select a supplier to load purchase history'}
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#9ca3af' }}>
                      No purchases match your search criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInvoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'rgba(148, 163, 184, 0.05)',
                        },
                        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                      }}
                    >
                      <TableCell sx={{ color: '#e5e7eb' }}>
                        {invoice.date}
                      </TableCell>
                      <TableCell sx={{ color: '#e5e7eb' }}>
                        {invoice.supplier}
                      </TableCell>
                      <TableCell sx={{ color: '#e5e7eb' }}>
                        {invoice.invoice}
                      </TableCell>
                      <TableCell sx={{ color: '#e5e7eb' }}>
                        ₹{invoice.total.toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleView(invoice)}
                          sx={{
                            textTransform: 'none',
                            color: '#0ea5e9',
                            borderColor: '#0ea5e9',
                            '&:hover': {
                              borderColor: '#0284c7',
                              backgroundColor: 'rgba(14, 165, 233, 0.1)',
                            },
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Pagination */}
        {!loading && filteredInvoices.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              mt: 3,
              mb: 2,
              flexShrink: 0,
            }}
          >
            <Pagination
              count={totalPages}
              page={page}
              onChange={(event, value) => setPage(value)}
              color="primary"
              sx={{
                '& .MuiPaginationItem-root': {
                  color: '#e5e7eb',
                  '&.Mui-selected': {
                    backgroundColor: '#0ea5e9',
                    color: '#fff',
                    '&:hover': {
                      backgroundColor: '#0284c7',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(148, 163, 184, 0.1)',
                  },
                },
                '& .MuiPaginationItem-ellipsis': {
                  color: '#9ca3af',
                },
              }}
            />
          </Box>
        )}
      </Card>

      {/* Purchase Detail Modal */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#0f172a',
            color: '#e5e7eb',
            borderRadius: 2,
            border: '1px solid rgba(148, 163, 184, 0.25)',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            pb: 2,
            color: '#e5e7eb',
            fontWeight: 600,
          }}
        >
          <Typography variant="h6" fontWeight={700} sx={{ color: '#e5e7eb' }}>
            Purchase {selectedPurchase?.invoice}
          </Typography>
          <IconButton
            onClick={handleCloseModal}
            sx={{
              color: '#9ca3af',
              '&:hover': {
                backgroundColor: 'rgba(148, 163, 184, 0.1)',
                color: '#e5e7eb',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            pt: 3,
            overflowY: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {selectedPurchase && (
            <>
              <Box sx={{ mb: 3, mt: 2, pb: 2, borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>
                  Supplier: <strong style={{ color: '#e5e7eb' }}>{selectedPurchase.supplier}</strong> - Date:{' '}
                  <strong style={{ color: '#e5e7eb' }}>{selectedPurchase.date}</strong> - Total:{' '}
                  <strong style={{ color: '#22d3ee' }}>₹{selectedPurchase.total.toFixed(2)}</strong>
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              {selectedPurchase?.invoice_file_url && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<PictureAsPdfIcon />}
                    onClick={handleViewInvoice}
                    sx={{
                      textTransform: 'none',
                      color: '#0ea5e9',
                      borderColor: '#0ea5e9',
                      '&:hover': {
                        borderColor: '#0284c7',
                        backgroundColor: 'rgba(14, 165, 233, 0.1)',
                      },
                    }}
                  >
                    View Invoice
                  </Button>
                </Box>
              )}

              <TableContainer
                component={Paper}
                sx={{
                  backgroundColor: '#0f172a',
                  borderRadius: 2,
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                        Item
                      </TableCell>
                      <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                        Batch
                      </TableCell>
                      <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                        Qty
                      </TableCell>
                      <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                        Price
                      </TableCell>
                      <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                        GST
                      </TableCell>
                      <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                        Line
                      </TableCell>
                      <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)', textAlign: 'center' }}>
                        Action
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPurchase.items.map((item, index) => {
                      const editableItem = editableItems[index] || {};
                      const batchChanged = editableItem.batch !== editableItem.originalBatch;
                      const qtyChanged = editableItem.qty !== editableItem.originalQty;
                      const hasChanges = batchChanged || qtyChanged;

                      return (
                        <TableRow
                          key={index}
                          sx={{
                            '&:hover': { backgroundColor: 'rgba(148, 163, 184, 0.05)' },
                            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                          }}
                        >
                          <TableCell sx={{ color: '#e5e7eb' }}>
                            {item.item}
                          </TableCell>
                          <TableCell>
                            <TextField
                              value={editableItem.batch || item.batch || ''}
                              onChange={(e) => handleEditItem(index, 'batch', e.target.value)}
                              size="small"
                              fullWidth
                              InputProps={{
                                sx: {
                                  color: '#e5e7eb',
                                  backgroundColor: '#020617',
                                  borderRadius: 1,
                                  '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: hasChanges ? '#0ea5e9' : 'rgba(148, 163, 184, 0.3)',
                                  },
                                  '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: hasChanges ? '#0ea5e9' : 'rgba(148, 163, 184, 0.5)',
                                  },
                                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#0ea5e9',
                                  },
                                },
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              value={editableItem.qty || item.qty || ''}
                              onChange={(e) => handleEditItem(index, 'qty', e.target.value)}
                              type="number"
                              size="small"
                              fullWidth
                              InputProps={{
                                sx: {
                                  color: '#e5e7eb',
                                  backgroundColor: '#020617',
                                  borderRadius: 1,
                                  '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: hasChanges ? '#0ea5e9' : 'rgba(148, 163, 184, 0.3)',
                                  },
                                  '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: hasChanges ? '#0ea5e9' : 'rgba(148, 163, 184, 0.5)',
                                  },
                                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#0ea5e9',
                                  },
                                },
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: '#e5e7eb' }}>
                            ₹{item.price}
                          </TableCell>
                          <TableCell sx={{ color: '#e5e7eb' }}>
                            {item.gst}%
                          </TableCell>
                          <TableCell sx={{ color: '#22d3ee', fontWeight: 600 }}>
                            ₹{item.line.toFixed(2)}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            {hasChanges && (
                              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => handleSaveItem(index)}
                                  disabled={savingItem === index}
                                  sx={{
                                    textTransform: 'none',
                                    backgroundColor: '#10b981',
                                    '&:hover': { backgroundColor: '#059669' },
                                    minWidth: '60px',
                                  }}
                                >
                                  {savingItem === index ? <CircularProgress size={16} /> : 'Save'}
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleCancelEdit(index)}
                                  disabled={savingItem === index}
                                  sx={{
                                    textTransform: 'none',
                                    color: '#9ca3af',
                                    borderColor: 'rgba(148, 163, 184, 0.3)',
                                    '&:hover': { borderColor: '#ef4444', color: '#ef4444' },
                                    minWidth: '60px',
                                  }}
                                >
                                  Cancel
                                </Button>
                              </Box>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Viewer Modal */}
      <Dialog
        open={invoiceViewerOpen}
        onClose={handleCloseInvoiceViewer}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#0f172a',
            color: '#e5e7eb',
            borderRadius: 2,
            border: '1px solid rgba(148, 163, 184, 0.25)',
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            pb: 2,
            color: '#e5e7eb',
            fontWeight: 600,
          }}
        >
          <Typography variant="h6" fontWeight={700} sx={{ color: '#e5e7eb' }}>
            Invoice - {selectedPurchase?.invoice}
          </Typography>
          <IconButton
            onClick={handleCloseInvoiceViewer}
            sx={{
              color: '#9ca3af',
              '&:hover': {
                backgroundColor: 'rgba(148, 163, 184, 0.1)',
                color: '#e5e7eb',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            pt: 3,
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '70vh',
            p: 0,
          }}
        >
          {invoiceUrl ? (
            <Box
              sx={{
                width: '100%',
                height: '70vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'column',
              }}
            >
              {invoiceUrl.toLowerCase().endsWith('.pdf') || invoiceUrl.toLowerCase().includes('.pdf') ? (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Open in new tab button */}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 1,
                      mb: 1,
                      px: 2,
                      pt: 1,
                    }}
                  >
                    <Button
                      variant="outlined"
                      href={invoiceUrl}
                      target="_blank"
                      size="small"
                      sx={{
                        color: '#0ea5e9',
                        borderColor: '#0ea5e9',
                        '&:hover': {
                          borderColor: '#0284c7',
                          backgroundColor: 'rgba(14, 165, 233, 0.1)',
                        },
                      }}
                    >
                      Open in New Tab
                    </Button>
                    <Button
                      variant="contained"
                      href={invoiceUrl}
                      download
                      size="small"
                      sx={{
                        backgroundColor: '#0ea5e9',
                        '&:hover': { backgroundColor: '#0284c7' },
                      }}
                    >
                      Download
                    </Button>
                  </Box>
                  {/* PDF Viewer */}
                  <Box
                    sx={{
                      flex: 1,
                      width: '100%',
                      height: '100%',
                      position: 'relative',
                    }}
                  >
                    <iframe
                      src={invoiceUrl}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        borderRadius: '8px',
                      }}
                      title="Invoice PDF"
                      allow="fullscreen"
                    />
                  </Box>
                </Box>
              ) : (
                <img
                  src={invoiceUrl}
                  alt="Invoice"
                  onError={(e) => {
                    console.error('Error loading image:', e);
                    e.target.style.display = 'none';
                  }}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: '8px',
                  }}
                />
              )}
            </Box>
          ) : (
            <Box
              sx={{
                p: 3,
                textAlign: 'center',
                color: '#9ca3af',
              }}
            >
              <Typography variant="body1">No invoice URL available.</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Add New Purchase Modal */}
      <Dialog
        open={addPurchaseModalOpen}
        onClose={() => setAddPurchaseModalOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            color: isDark ? '#e5e7eb' : '#0f172a',
            borderRadius: 2,
            border: isDark ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid #e2e8f0',
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            color: isDark ? '#e5e7eb' : '#0f172a',
            fontWeight: 600,
            pb: 2,
            fontSize: '1.25rem',
            borderBottom: isDark ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid #e2e8f0',
          }}
        >
          New Purchase
        </DialogTitle>
        <DialogContent
          sx={{
            pt: 3,
            px: 3,
            overflowY: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {purchaseError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPurchaseError('')}>
              {purchaseError}
            </Alert>
          )}

          {loadingPurchaseData ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Invoice Details Section */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    options={suppliers}
                    getOptionLabel={(option) => option?.name || ''}
                    value={
                      purchaseFormData.supplier
                        ? suppliers.find((s) => String(s.id) === String(purchaseFormData.supplier)) || null
                        : null
                    }
                    onChange={(_, newValue) => {
                      handlePurchaseFormChange('supplier', newValue ? String(newValue.id) : '');
                    }}
                    loading={loadingSuppliers}
                    size="small"
                    fullWidth
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Search supplier by name"
                        required
                        disabled={loadingSuppliers}
                        sx={{
                          mt: 4,
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: isDark ? '#0f2339' : '#f8fafc',
                            color: isDark ? '#e5e7eb' : '#0f172a',
                            borderRadius: 1,
                          },
                          '& .MuiInputLabel-root': {
                            color: isDark ? '#9ca3af' : '#475569',
                          },
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: isDark ? 'rgba(148, 163, 184, 0.3)' : '#cbd5e1',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: isDark ? 'rgba(148, 163, 184, 0.5)' : '#94a3b8',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#10b981',
                          },
                        }}
                        InputProps={{
                          ...params.InputProps,
                          sx: {
                            ...params.InputProps.sx,
                            color: isDark ? '#e5e7eb' : '#0f172a',
                          },
                        }}
                      />
                    )}
                    noOptionsText={loadingSuppliers ? 'Loading suppliers...' : 'No suppliers found'}
                    PaperComponent={({ children, ...other }) => (
                      <Paper {...other} sx={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#e5e7eb' : '#0f172a' }}>
                        {children}
                      </Paper>
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    placeholder="Invoice No"
                    value={purchaseFormData.invoiceNumber}
                    onChange={(e) => handlePurchaseFormChange('invoiceNumber', e.target.value)}
                    size="small"
                    required
                    InputProps={{
                      sx: {
                        color: isDark ? '#e5e7eb' : '#0f172a',
                        mt: 4,
                        backgroundColor: isDark ? '#0f2339' : '#f8fafc',
                        borderRadius: 1,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: isDark ? 'rgba(148, 163, 184, 0.3)' : '#cbd5e1',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: isDark ? 'rgba(148, 163, 184, 0.5)' : '#94a3b8',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#10b981',
                        },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Invoice Date"
                    type="date"
                    value={purchaseFormData.invoiceDate}
                    onChange={(e) => handlePurchaseFormChange('invoiceDate', e.target.value)}
                    size="small"
                    required
                    InputLabelProps={{ sx: { color: isDark ? '#9ca3af' : '#475569', mt: 4 }, shrink: true }}
                    InputProps={{
                      inputRef: invoiceDateRef,
                      sx: {
                        color: isDark ? '#e5e7eb' : '#0f172a',
                        mt: 4,
                        backgroundColor: isDark ? '#0f2339' : '#f8fafc',
                        borderRadius: 1,
                        pr: 0,
                        '& input[type="date"]::-webkit-calendar-picker-indicator': {
                          display: 'none',
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: isDark ? 'rgba(148, 163, 184, 0.3)' : '#cbd5e1',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: isDark ? 'rgba(148, 163, 184, 0.5)' : '#94a3b8',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#10b981',
                        },
                      },
                      endAdornment: (
                        <IconButton
                          size="small"
                          sx={{ color: isDark ? '#9ca3af' : '#475569' }}
                          onClick={() => {
                            if (invoiceDateRef.current) {
                              if (typeof invoiceDateRef.current.showPicker === 'function') {
                                invoiceDateRef.current.showPicker();
                              } else {
                                invoiceDateRef.current.focus();
                              }
                            }
                          }}
                        >
                          <CalendarTodayIcon fontSize="small" />
                        </IconButton>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2, borderColor: isDark ? 'rgba(148, 163, 184, 0.4)' : '#e2e8f0' }} />

              {/* Product Table Headers */}
              <Box
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  mb: 1,
                  px: 1,
                  gap: 1,
                }}
              >

              </Box>

              {/* Product Rows */}
              {purchaseRows.map((row) => (
                <Box
                  key={row.id}
                  sx={{
                    mb: 1.5,
                    p: 1,
                    borderRadius: 1.5,
                    background: isDark ? 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.6))' : '#f1f5f9',
                    border: isDark ? '1px solid rgba(148,163,184,0.25)' : '1px solid #cbd5e1',
                  }}
                >
                  <Grid container spacing={1} alignItems="center">
                    <Grid item xs={12} md={3.3}>
                      <Autocomplete
                        freeSolo
                        options={purchaseProducts.map((product) => ({
                          id: product.product_id,
                          label: `${product.product_name} (ID: ${product.product_id})`,
                          name: product.product_name,
                        }))}
                        value={(() => {
                          if (row.product && purchaseProducts.length > 0) {
                            const productIdNum = parseInt(row.product);
                            const foundProduct = purchaseProducts.find((p) => {
                              if (!isNaN(productIdNum) && p.product_id === productIdNum) {
                                return true;
                              }
                              return p.product_name && p.product_name.toLowerCase() === row.product.toLowerCase();
                            });
                            if (foundProduct) {
                              return {
                                id: foundProduct.product_id,
                                label: `${foundProduct.product_name} (ID: ${foundProduct.product_id})`,
                                name: foundProduct.product_name,
                              };
                            }
                          }
                          return row.product || '';
                        })()}
                        onChange={(event, newValue) => {
                          if (typeof newValue === 'string') {
                            handlePurchaseRowChange(row.id, 'product', newValue);
                          } else if (newValue && typeof newValue === 'object' && newValue.name) {
                            handlePurchaseRowChange(row.id, 'product', newValue.name);
                          } else {
                            handlePurchaseRowChange(row.id, 'product', '');
                          }
                        }}
                        onInputChange={(event, newInputValue, reason) => {
                          if (reason === 'input') {
                            handlePurchaseRowChange(row.id, 'product', newInputValue || '');
                          } else if (reason === 'clear') {
                            handlePurchaseRowChange(row.id, 'product', '');
                          }
                        }}
                        getOptionLabel={(option) => {
                          if (typeof option === 'string') {
                            return option;
                          }
                          if (option && option.name) {
                            return option.name;
                          }
                          if (option && option.label) {
                            return option.label;
                          }
                          return '';
                        }}
                        isOptionEqualToValue={(option, value) => {
                          if (typeof value === 'string') {
                            return option.name === value || option.id.toString() === value;
                          }
                          if (value && typeof value === 'object') {
                            return option.id === value.id;
                          }
                          return false;
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Select or enter product..."
                            size="small"
                            required
                            fullWidth
                            InputProps={{
                              ...params.InputProps,
                              sx: {
                                width: '200px',
                                height: '40px',
                                color: isDark ? '#e5e7eb' : '#0f172a',
                                backgroundColor: isDark ? '#020617' : '#ffffff',
                                borderRadius: 1,
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: isDark ? 'rgba(148, 163, 184, 0.3)' : '#cbd5e1',
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: isDark ? 'rgba(148, 163, 184, 0.5)' : '#94a3b8',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#10b981',
                                },
                              },
                            }}
                          />
                        )}
                        sx={{
                          '& .MuiAutocomplete-popupIndicator': {
                            color: isDark ? '#9ca3af' : '#475569',
                          },
                          '& .MuiAutocomplete-clearIndicator': {
                            color: isDark ? '#9ca3af' : '#475569',
                          },
                          '& .MuiAutocomplete-option': {
                            color: isDark ? '#e5e7eb' : '#0f172a',
                            backgroundColor: isDark ? '#020617' : '#ffffff',
                            '&:hover': {
                              backgroundColor: isDark ? '#0f2339' : '#f1f5f9',
                            },
                            '&[aria-selected="true"]': {
                              backgroundColor: isDark ? '#0f2339' : '#e2e8f0',
                            },
                          },
                          '& .MuiAutocomplete-listbox': {
                            backgroundColor: isDark ? '#020617' : '#ffffff',
                            border: isDark ? '1px solid rgba(148, 163, 184, 0.3)' : '1px solid #cbd5e1',
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={6} md={1.2}>
                      <TextField
                        fullWidth
                        placeholder="Batch"
                        value={row.batch}
                        onChange={(e) => handlePurchaseRowChange(row.id, 'batch', e.target.value)}
                        size="small"
                        required
                        InputProps={{
                          sx: {
                            color: isDark ? '#e5e7eb' : '#0f172a',
                            backgroundColor: isDark ? '#020617' : '#ffffff',
                            borderRadius: 1,
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: isDark ? 'rgba(148, 163, 184, 0.3)' : '#cbd5e1',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: isDark ? 'rgba(148, 163, 184, 0.5)' : '#94a3b8',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#10b981',
                            },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={6} md={1.2}>
                      <TextField
                        fullWidth
                        placeholder="P.Price"
                        type="number"
                        value={row.purchasePrice}
                        onChange={(e) => handlePurchaseRowChange(row.id, 'purchasePrice', e.target.value)}
                        size="small"
                        required
                        InputProps={{
                          sx: {
                            color: isDark ? '#e5e7eb' : '#0f172a',
                            backgroundColor: isDark ? '#020617' : '#ffffff',
                            borderRadius: 1,
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: isDark ? 'rgba(148, 163, 184, 0.3)' : '#cbd5e1',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: isDark ? 'rgba(148, 163, 184, 0.5)' : '#94a3b8',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#10b981',
                            },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={6} md={1.2}>
                      <TextField
                        fullWidth
                        placeholder="S.Price"
                        type="number"
                        value={row.sellingPrice}
                        onChange={(e) => handlePurchaseRowChange(row.id, 'sellingPrice', e.target.value)}
                        size="small"
                        required
                        InputProps={{
                          sx: {
                            color: isDark ? '#e5e7eb' : '#0f172a',
                            backgroundColor: isDark ? '#020617' : '#ffffff',
                            borderRadius: 1,
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: isDark ? 'rgba(148, 163, 184, 0.3)' : '#cbd5e1',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: isDark ? 'rgba(148, 163, 184, 0.5)' : '#94a3b8',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#10b981',
                            },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={6} md={1.2}>
                      <TextField
                        fullWidth
                        placeholder="MRP"
                        type="number"
                        value={row.mrp}
                        onChange={(e) => handlePurchaseRowChange(row.id, 'mrp', e.target.value)}
                        size="small"
                        InputProps={{
                          sx: {
                            color: isDark ? '#e5e7eb' : '#0f172a',
                            backgroundColor: isDark ? '#020617' : '#ffffff',
                            borderRadius: 1,
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: isDark ? 'rgba(148, 163, 184, 0.3)' : '#cbd5e1',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: isDark ? 'rgba(148, 163, 184, 0.5)' : '#94a3b8',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#10b981',
                            },
                          },
                        }}
                        FormHelperTextProps={{
                          sx: { color: isDark ? '#9ca3af' : '#475569', fontSize: '0.7rem', mt: 0.5 },
                        }}
                      />
                    </Grid>
                    <Grid item xs={6} md={0.9}>
                      <TextField
                        fullWidth
                        placeholder="Qty"
                        type="number"
                        value={row.quantity}
                        onChange={(e) => handlePurchaseRowChange(row.id, 'quantity', e.target.value)}
                        size="small"
                        required
                        InputProps={{
                          sx: {
                            color: isDark ? '#e5e7eb' : '#0f172a',
                            backgroundColor: isDark ? '#020617' : '#ffffff',
                            borderRadius: 1,
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: isDark ? 'rgba(148, 163, 184, 0.3)' : '#cbd5e1',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: isDark ? 'rgba(148, 163, 184, 0.5)' : '#94a3b8',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#10b981',
                            },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={6} md={0.9}>
                      <TextField
                        fullWidth
                        placeholder="GST %"
                        type="number"
                        value={row.gst}
                        onChange={(e) => handlePurchaseRowChange(row.id, 'gst', e.target.value)}
                        size="small"
                        InputProps={{
                          sx: {
                            color: isDark ? '#e5e7eb' : '#0f172a',
                            backgroundColor: isDark ? '#020617' : '#ffffff',
                            borderRadius: 1,
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: isDark ? 'rgba(148, 163, 184, 0.3)' : '#cbd5e1',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: isDark ? 'rgba(148, 163, 184, 0.5)' : '#94a3b8',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#10b981',
                            },
                          },
                        }}
                        FormHelperTextProps={{
                          sx: { color: isDark ? '#9ca3af' : '#475569', fontSize: '0.7rem', mt: 0.5 },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={1} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <IconButton
                        size="small"
                        onClick={() => removePurchaseRow(row.id)}
                        disabled={purchaseRows.length === 1}
                        sx={{
                          color: purchaseRows.length === 1 ? '#4b5563' : (isDark ? '#9ca3af' : '#475569'),
                          '&:hover': {
                            backgroundColor: purchaseRows.length === 1 ? 'transparent' : 'rgba(239, 68, 68, 0.15)',
                            color: purchaseRows.length === 1 ? '#4b5563' : '#ef4444',
                          },
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Box>
              ))}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2, mb: 3 }}>
                <Button
                  variant="outlined"
                  onClick={addPurchaseRow}
                  sx={{
                    textTransform: 'none',
                    borderRadius: '24px',
                    color: isDark ? '#e5e7eb' : '#0f172a',
                    borderColor: isDark ? 'rgba(148,163,184,0.6)' : '#cbd5e1',
                    '&:hover': { borderColor: '#0ea5e9', color: '#0ea5e9' },
                  }}
                >
                  + Add Row
                </Button>
                <Button
                  variant="contained"
                  onClick={handlePurchaseRecalculate}
                  sx={{
                    textTransform: 'none',
                    borderRadius: '24px',
                    backgroundColor: '#0ea5e9',
                    '&:hover': { backgroundColor: '#0284c7' },
                  }}
                >
                  Recalculate
                </Button>
              </Box>

              {/* File Upload Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ color: isDark ? '#cbd5e1' : '#475569', mb: 0.5 }}>
                  Attach Invoice (images/pdf) <span style={{ color: '#ef4444' }}>*</span>
                </Typography>
                <Button
                  variant="outlined"
                  component="label"
                  required
                  sx={{
                    textTransform: 'none',
                    borderRadius: '24px',
                    color: isDark ? '#e5e7eb' : '#0f172a',
                    borderColor: (purchaseError && purchaseError.includes('invoice file') && !purchaseFormData.invoiceFile) ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1'),
                    '&:hover': { borderColor: '#0ea5e9', color: '#0ea5e9' },
                  }}
                >
                  BROWSE...
                  <input
                    type="file"
                    hidden
                    accept="image/*,.pdf"
                    onChange={handlePurchaseFileChange}
                    required
                  />
                </Button>
                <Typography
                  variant="body2"
                  sx={{
                    color: (purchaseError && purchaseError.includes('invoice file') && !purchaseFormData.invoiceFile) ? '#ef4444' : (isDark ? '#cbd5e1' : '#475569'),
                    ml: 1,
                    display: 'inline-block'
                  }}
                >
                  {purchaseFormData.invoiceFile ? purchaseFormData.invoiceFile.name : ((purchaseError && purchaseError.includes('invoice file')) ? 'No files selected.' : '')}
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            p: 2.5,
            pt: 1,
            borderTop: isDark ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: isDark ? '#cbd5e1' : '#0f172a', fontSize: '1.1rem', fontWeight: 600 }}
          >
            Net: ₹{netTotal.toFixed(2)}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setAddPurchaseModalOpen(false);
                handlePurchaseClear();
              }}
              sx={{
                textTransform: 'none',
                borderRadius: '24px',
                color: isDark ? '#e5e7eb' : '#0f172a',
                borderColor: isDark ? 'rgba(148,163,184,0.6)' : '#cbd5e1',
                '&:hover': { borderColor: '#ef4444', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.08)' },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePurchaseSubmit}
              disabled={purchaseLoading}
              variant="contained"
              sx={{
                textTransform: 'none',
                borderRadius: '24px',
                backgroundColor: '#0ea5e9',
                '&:hover': { backgroundColor: '#0284c7' },
              }}
            >
              {purchaseLoading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Save Purchase'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PurchaseHistory;

