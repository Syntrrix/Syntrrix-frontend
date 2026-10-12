import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogTitle,
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
  CircularProgress,
  Alert,
  Autocomplete,
  InputAdornment,
  Pagination,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import {
  fetchCustomerPurchaseHistory,
  fetchCustomers,
  deleteCustomerPurchaseItem,
} from '../../../api/customers';
import Swal from 'sweetalert2';
import { useThemeContext } from '../../../context/ThemeContext';

function CustomerPurchase() {
  const { isDark } = useThemeContext();
  const navigate = useNavigate();
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState([]); // raw API rows
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [error, setError] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  const [deletingItemId, setDeletingItemId] = useState(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    // Load purchase history: all customers by default, or filtered by selected customer
    loadCustomerPurchaseHistory();
  }, [selectedCustomer]);

  // Static customers data
  const getStaticCustomers = () => {
    return [
      { id: 1, name: 'Rajesh Kumar' },
      { id: 2, name: 'Priya Sharma' },
      { id: 3, name: 'Amit Patel' },
      { id: 4, name: 'Sneha Desai' },
      { id: 5, name: 'Vikram Singh' },
      { id: 6, name: 'Anjali Mehta' },
      { id: 7, name: 'Rahul Gupta' },
      { id: 8, name: 'Kavita Reddy' },
    ];
  };

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const response = await fetchCustomers();
      if (response && response.success && Array.isArray(response.data) && response.data.length > 0) {
        const customerList = response.data.map((c) => ({
          ...c,
          id: c.customer_id || c.id,
          name: c.full_name || c.name,
        }));
        setCustomers(customerList);
      } else {
        setCustomers([]);
      }
    } catch (err) {
      console.error('Error loading customers:', err);
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Static data for testing/display
  const getStaticPurchaseHistory = (customerId) => {
    const customer = customers.find((c) => c.id === parseInt(customerId));
    const customerName = customer ? customer.name : 'Customer';
    
    return [
      {
        product_purchase_id: 1,
        invoice_number: 'INV-2025-001',
        invoice_date: '2025-01-15',
        customer_name: customerName,
        items: [
          {
            product_name: 'Wheat',
            batch_name: 'WHEAT-2025-001',
            quantity: 100,
            selling_price: 25.50,
            gst: 5,
          },
          {
            product_name: 'Rice',
            batch_name: 'RICE-2025-002',
            quantity: 50,
            selling_price: 45.00,
            gst: 5,
          },
        ],
      },
      {
        product_purchase_id: 2,
        invoice_number: 'INV-2025-002',
        invoice_date: '2025-01-10',
        customer_name: customerName,
        items: [
          {
            product_name: 'Corn',
            batch_name: 'CORN-2025-001',
            quantity: 75,
            selling_price: 20.00,
            gst: 12,
          },
          {
            product_name: 'Barley',
            batch_name: 'BARLEY-2025-001',
            quantity: 30,
            selling_price: 35.00,
            gst: 5,
          },
        ],
      },
      {
        product_purchase_id: 3,
        invoice_number: 'INV-2025-003',
        invoice_date: '2025-01-05',
        customer_name: customerName,
        items: [
          {
            product_name: 'Soybean',
            batch_name: 'SOY-2025-001',
            quantity: 200,
            selling_price: 55.00,
            gst: 12,
          },
        ],
      },
      {
        product_purchase_id: 4,
        invoice_number: 'INV-2024-125',
        invoice_date: '2024-12-28',
        customer_name: customerName,
        items: [
          {
            product_name: 'Wheat',
            batch_name: 'WHEAT-2024-050',
            quantity: 150,
            selling_price: 24.00,
            gst: 5,
          },
          {
            product_name: 'Rice',
            batch_name: 'RICE-2024-080',
            quantity: 80,
            selling_price: 42.50,
            gst: 5,
          },
          {
            product_name: 'Corn',
            batch_name: 'CORN-2024-045',
            quantity: 100,
            selling_price: 18.50,
            gst: 12,
          },
        ],
      },
    ];
  };

  const loadCustomerPurchaseHistory = async () => {
    setLoading(true);
    setError('');
    try {
      // If customer is selected, filter by customer; otherwise, load all purchase history
      const customerId = selectedCustomer ? parseInt(selectedCustomer) : null;
      const response = await fetchCustomerPurchaseHistory(customerId);
      // Use API data if available
      if (response && response.success && response.data && response.data.length > 0) {
        setPurchaseHistory(response.data);
      } else {
        setPurchaseHistory([]);
      }
    } catch (err) {
      console.error('Error loading purchase history:', err);
      setError(err.message || 'Failed to load purchase history.');
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
        const price = parseFloat(item.unit_price || item.selling_price || item.purchase_price) || 0;
        const gst = parseFloat(item.gst) || 0;
        const line = parseFloat(item.line_total) || (price * qty * (1 + gst / 100));
        return {
          item_id: item.item_id,
          product_id: item.product,
          batch_id: item.batch || item.batch_info?.batch_id || null,
          item: item.product_name || item.product?.product_name || 'Product',
          batch: item.batch_info?.batch_name || item.batch_name || '',
          qty: item.quantity,
          price: item.unit_price || item.selling_price || item.purchase_price,
          gst: item.gst,
          line,
        };
      });

      const total = parseFloat(purchase.total_amount) || items.reduce((sum, item) => sum + item.line, 0);

      const invoiceDate = purchase.invoice_date || purchase.created_at;
      const createdAt = purchase.created_at;

      return {
        id: purchase.purchase_id || purchase.customer_purchase_id || purchase.id,
        date: formatDateTime(invoiceDate, createdAt),
        dateForSorting: invoiceDate || createdAt, // Keep original for sorting
        customer: purchase.customer?.full_name || purchase.customer_name || purchase.buyer_name || 'Customer',
        invoice: purchase.invoice_number,
        total,
        items,
        customerWhatsapp: purchase.customer?.whatsapp_number || purchase.whatsapp_number || null,
        customerMobile: purchase.customer?.mobile_number || purchase.mobile_number || null,
      };
    });

    // Sort by date (newest first) - use original date for sorting
    return invoices.sort((a, b) => new Date(b.dateForSorting) - new Date(a.dateForSorting));
  }, [purchaseHistory]);

  // Filter invoices based on search term (customer name and invoice number)
  const filteredInvoices = useMemo(() => {
    if (!searchTerm.trim()) {
      return groupedInvoices;
    }
    const searchLower = searchTerm.toLowerCase().trim();
    return groupedInvoices.filter((invoice) => {
      const customerName = (invoice.customer || '').toLowerCase();
      const invoiceNumber = (invoice.invoice || '').toString().toLowerCase();
      return (
        customerName.includes(searchLower) ||
        invoiceNumber.includes(searchLower)
      );
    });
  }, [groupedInvoices, searchTerm]);

  // Reset page to 1 when search term or customer filter changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedCustomer]);

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
    setModalOpen(true);
  };

  const handleDeleteItem = async (item, index) => {
    if (!selectedPurchase || !item?.item_id) return;

    const confirmResult = await Swal.fire({
      title: 'Are you sure you want to delete this product?',
      text: 'This will remove the product from the invoice and restore its stock back to inventory.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    try {
      setDeletingItemId(item.item_id);

      const payload = {
        purchase_id: selectedPurchase.id,
        item_id: item.item_id,
      };

      const response = await deleteCustomerPurchaseItem(payload);

      if (!response || response.success === false) {
        throw new Error(response?.error || response?.message || 'Failed to delete product from invoice.');
      }

      const updatedPurchase = response.data;

      // Rebuild items in the same shape as groupedInvoices
      const updatedItems = (updatedPurchase.items || []).map((it) => {
        const qty = parseFloat(it.quantity) || 0;
        const price = parseFloat(it.unit_price || it.selling_price || it.purchase_price) || 0;
        const gst = parseFloat(it.gst) || 0;
        const line = parseFloat(it.line_total) || (price * qty * (1 + gst / 100));
        return {
          item_id: it.item_id,
          product_id: it.product,
          batch_id: it.batch || it.batch_info?.batch_id || null,
          item: it.product_name || it.product?.product_name || 'Product',
          batch: it.batch_info?.batch_name || it.batch_name || '',
          qty: it.quantity,
          price: it.unit_price || it.selling_price || it.purchase_price,
          gst: it.gst,
          line,
        };
      });

      const newTotal = updatedItems.reduce((sum, it) => sum + it.line, 0);

      setSelectedPurchase((prev) => ({
        ...(prev || {}),
        id: updatedPurchase.purchase_id,
        date: formatDateTime(updatedPurchase.invoice_date, updatedPurchase.created_at),
        dateForSorting: updatedPurchase.invoice_date || updatedPurchase.created_at,
        customer: updatedPurchase.customer_name || (prev ? prev.customer : 'Customer'),
        invoice: updatedPurchase.invoice_number,
        total: newTotal,
        items: updatedItems,
      }));

      // Refresh list view in background
      loadCustomerPurchaseHistory();

      await Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: response.message || 'Product deleted from invoice successfully.',
        confirmButtonColor: '#0ea5e9',
      });
    } catch (err) {
      const msg =
        (err.response && err.response.data && (err.response.data.error || err.response.data.message)) ||
        err.message ||
        'Failed to delete product from invoice.';
      setError(msg);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: msg,
        confirmButtonColor: '#d32f2f',
      });
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedPurchase(null);
  };

  const handleViewInvoice = (invoice) => {
    // Navigate to invoice page with invoice data
    navigate('/seller/customers/invoice', { state: { invoice } });
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
        {/* Header with Sell Button */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            flexShrink: 0,
          }}
        >
          <Typography variant="h5" fontWeight={700} sx={{ color: '#e5e7eb' }}>
            Customer Purchase History
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/seller/customers/sell')}
            sx={{
              textTransform: 'none',
              px: 3,
              backgroundColor: '#0ea5e9',
              '&:hover': { backgroundColor: '#0284c7' },
            }}
          >
            Sell
          </Button>
        </Box>

        {/* Filter Section */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexShrink: 0 }}>
          <Autocomplete
            options={customers}
            getOptionLabel={(option) => option?.name || ''}
            value={
              selectedCustomer
                ? customers.find((c) => String(c.id) === String(selectedCustomer)) || null
                : null
            }
            onChange={(_, newValue) => {
              setSelectedCustomer(newValue ? newValue.id : '');
            }}
            loading={loadingCustomers}
            size="small"
            sx={{ width: 300 }}
            ListboxProps={{
              sx: {
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              },
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Filter by Customer"
                placeholder="Search customer by name"
                disabled={loadingCustomers}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#0f2339',
                    color: '#e5e7eb',
                    borderRadius: 1,
                  },
                  '& .MuiInputLabel-root': {
                    color: '#9ca3af',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(148, 163, 184, 0.3)',
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
                    color: '#e5e7eb',
                  },
                }}
              />
            )}
            noOptionsText={loadingCustomers ? 'Loading customers...' : 'No customers found'}
            PaperComponent={({ children, ...other }) => (
              <Paper
                {...other}
                sx={{
                  backgroundColor: '#1e293b',
                  color: '#e5e7eb',
                  '&::-webkit-scrollbar': { display: 'none' },
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {children}
              </Paper>
            )}
          />
          {loadingCustomers && (
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
              Loading customers...
            </Typography>
          )}
        </Box>

        {/* Search Bar */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexShrink: 0 }}>
          <TextField
            fullWidth
            placeholder="Search by Customer Name or Invoice Number..."
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
                color: '#e5e7eb',
                backgroundColor: '#0f2339',
                borderRadius: 1,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(148, 163, 184, 0.3)',
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

        {error && (
          <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Purchase History Table */}
        <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <TableContainer
            component={Paper}
            sx={{
              backgroundColor: '#0f172a',
              borderRadius: 2,
              border: '1px solid rgba(148, 163, 184, 0.25)',
              flexGrow: 1,
              overflow: 'auto',
              minHeight: 0,
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    backgroundColor: '#1e293b',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  Date
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: '#1e293b',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  Customer
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: '#1e293b',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  Invoice
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: '#1e293b',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  Total
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: '#1e293b',
                    color: '#e5e7eb',
                    fontWeight: 600,
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
                    {selectedCustomer ? 'No purchase history available for this customer' : 'Select a customer to load purchase history'}
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
                      {invoice.customer}
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
                  Customer: <strong style={{ color: '#e5e7eb' }}>{selectedPurchase.customer}</strong> - Date:{' '}
                  <strong style={{ color: '#e5e7eb' }}>{selectedPurchase.date}</strong> - Total:{' '}
                  <strong style={{ color: '#0ea5e9' }}>₹{selectedPurchase.total.toFixed(2)}</strong>
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<ReceiptIcon />}
                  onClick={() => handleViewInvoice(selectedPurchase)}
                  sx={{
                    backgroundColor: '#0ea5e9',
                    '&:hover': { backgroundColor: '#0284c7' },
                  }}
                >
                  View Invoice
                </Button>
              </Box>

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
                    {selectedPurchase.items.map((item, index) => (
                      <TableRow
                        key={index}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'rgba(148, 163, 184, 0.05)',
                          },
                          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                        }}
                      >
                        <TableCell sx={{ color: '#e5e7eb' }}>
                          {item.item}
                        </TableCell>
                        <TableCell sx={{ color: '#e5e7eb' }}>
                          {item.batch || 'N/A'}
                        </TableCell>
                        <TableCell sx={{ color: '#e5e7eb' }}>
                          {item.qty}
                        </TableCell>
                        <TableCell sx={{ color: '#e5e7eb' }}>
                          ₹{item.price}
                        </TableCell>
                        <TableCell sx={{ color: '#e5e7eb' }}>
                          {item.gst}%
                        </TableCell>
                        <TableCell sx={{ color: '#0ea5e9', fontWeight: 600 }}>
                          ₹{item.line.toFixed(2)}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteItem(item, index)}
                            disabled={deletingItemId === item.item_id}
                            sx={{
                              color: '#f97373',
                              '&:hover': {
                                backgroundColor: 'rgba(248,113,113,0.15)',
                                color: '#ef4444',
                              },
                              '&.Mui-disabled': {
                                color: 'rgba(148,163,184,0.5)',
                              },
                            }}
                          >
                            {deletingItemId === item.item_id ? (
                              <CircularProgress size={18} sx={{ color: '#f97373' }} />
                            ) : (
                              <DeleteIcon fontSize="small" />
                            )}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default CustomerPurchase;


