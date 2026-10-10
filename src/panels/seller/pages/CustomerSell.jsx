import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CircularProgress,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';

import {
  addToCart,
  createCustomer,
  fetchCustomerCart,
  fetchCustomers,
  placeCustomerOrder,
  removeFromCart,
} from '../../../api/customers';
import { fetchSellerProducts } from '../../../api/products';
import { fetchProductBatchesForCart } from '../../../api/batches';

function CustomerSell() {
  const navigate = useNavigate();
  const location = useLocation();

  const preselectedCustomerId = useMemo(() => {
    const fromState = location?.state?.customerId;
    return fromState ? String(fromState) : '';
  }, [location?.state?.customerId]);

  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customers, setCustomers] = useState([]);

  const [sellSelectedCustomer, setSellSelectedCustomer] = useState('');
  const [sellOrderDate, setSellOrderDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [sellInvoiceNumber, setSellInvoiceNumber] = useState('');
  const [sellCustomerForm, setSellCustomerForm] = useState({
    full_name: '',
    email: '',
    mobile_number: '',
    whatsapp_number: '',
  });
  const [sellCustomerValidation, setSellCustomerValidation] = useState({
    mobile_number: '',
    whatsapp_number: '',
  });
  const [sellIsExistingCustomer, setSellIsExistingCustomer] = useState(false);
  const [sellRows, setSellRows] = useState([
    {
      id: 1,
      product: '',
      productId: null,
      batch: '',
      batchId: null,
      batchData: null,
      quantity: '',
      price: '',
      mrp: '',
      gst: '',
      total: 0,
      availableQuantity: 0,
    },
  ]);

  const [sellProducts, setSellProducts] = useState([]);
  const [sellBatches, setSellBatches] = useState({});
  const [loadingSellProducts, setLoadingSellProducts] = useState(false);
  const [loadingSellBatches, setLoadingSellBatches] = useState({});

  const [sellError, setSellError] = useState('');
  const [sellLoading, setSellLoading] = useState(false);
  const [grandTotal, setGrandTotal] = useState(0);

  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    setSellInvoiceNumber(`INV-${year}${month}${day}-${randomPart}`);
  }, []);

  useEffect(() => {
    loadCustomers();
    loadSellProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!preselectedCustomerId) return;
    setSellSelectedCustomer(preselectedCustomerId);
    const found = customers.find((c) => String(c.id) === String(preselectedCustomerId));
    if (found) {
      setSellIsExistingCustomer(true);
      setSellCustomerForm({
        full_name: found.full_name || found.name || '',
        email: found.email || '',
        mobile_number: found.mobile_number || '',
        whatsapp_number: found.whatsapp_number || '',
      });
      setSellCustomerValidation({ mobile_number: '', whatsapp_number: '' });
    }
  }, [preselectedCustomerId, customers]);

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

  const loadSellProducts = async () => {
    setLoadingSellProducts(true);
    try {
      const response = await fetchSellerProducts();
      if (response && response.success && Array.isArray(response.data)) {
        setSellProducts(response.data);
      } else {
        setSellProducts([]);
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setSellProducts([]);
    } finally {
      setLoadingSellProducts(false);
    }
  };

  const loadSellBatches = async (productId) => {
    if (!productId) return;
    setLoadingSellBatches((prev) => ({ ...prev, [productId]: true }));
    try {
      const response = await fetchProductBatchesForCart(productId, 1);
      if (response && response.success && Array.isArray(response.data)) {
        const filteredBatches = response.data.filter((batch) => {
          const hasExpiryDate = batch.expiry_date && String(batch.expiry_date).trim() !== '';
          const hasAvailableQuantity = (batch.available_quantity ?? 0) > 0;
          return hasExpiryDate && hasAvailableQuantity;
        });
        setSellBatches((prev) => ({ ...prev, [productId]: filteredBatches }));
      } else {
        setSellBatches((prev) => ({ ...prev, [productId]: [] }));
      }
    } catch (err) {
      console.error('Error loading batches:', err);
      setSellBatches((prev) => ({ ...prev, [productId]: [] }));
    } finally {
      setLoadingSellBatches((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const handleSellRowChange = (rowId, field, value) => {
    setSellRows((prevRows) => {
      const updatedRows = prevRows.map((row) => {
        if (row.id !== rowId) return row;

        const updatedRow = { ...row, [field]: value };

        if (field === 'product') {
          const product = typeof value === 'object' ? value : sellProducts.find((p) => p.product_id === value || p.product_name === value);
          if (product) {
            setSellError('');
            updatedRow.productId = product.product_id;
            updatedRow.product = product.product_name;
            updatedRow.batch = '';
            updatedRow.batchId = null;
            updatedRow.batchData = null;
            updatedRow.quantity = '';
            updatedRow.price = '';
            updatedRow.mrp = '';
            updatedRow.gst = product.gst || '';
            updatedRow.total = 0;
            updatedRow.availableQuantity = 0;
            loadSellBatches(product.product_id);
          }
        }

        if (field === 'batch') {
          const productId = updatedRow.productId;
          if (productId && sellBatches[productId]) {
            const batch = sellBatches[productId].find((b) => b.batch_name === value || b.batch_id === value);
            if (batch) {
              const isDuplicate = prevRows.some((r) => r.id !== rowId && r.productId === productId && r.batchId === batch.batch_id);
              if (isDuplicate) {
                setSellError(`Batch "${batch.batch_name}" is already selected for this product in another row. Please select a different batch.`);
                return row;
              }

              setSellError('');
              updatedRow.batchId = batch.batch_id;
              updatedRow.batch = batch.batch_name;
              updatedRow.batchData = batch;
              const availableQty = parseFloat(batch.available_quantity) || 0;
              updatedRow.quantity = Math.floor(availableQty).toString();
              updatedRow.price = batch.selling_price || '';
              updatedRow.mrp = batch.mrp || '';
              updatedRow.availableQuantity = Math.floor(availableQty);
            }
          }
        }

        if (field === 'quantity') {
          if (value === '' || value === null || value === undefined) {
            updatedRow.quantity = '';
            updatedRow.total = 0;
            return updatedRow;
          }

          const numValue = parseInt(value, 10);
          if (isNaN(numValue) || numValue < 0) {
            updatedRow.quantity = '';
            updatedRow.total = 0;
            return updatedRow;
          }

          const availableQty = Math.floor(updatedRow.availableQuantity || 0);
          if (numValue > availableQty) {
            updatedRow.quantity = availableQty.toString();
            setSellError(`Quantity cannot exceed available quantity (${availableQty})`);
          } else {
            updatedRow.quantity = numValue.toString();
          }
        }

        const qty = parseInt(updatedRow.quantity, 10) || 0;
        const price = parseFloat(updatedRow.price) || 0;
        const gst = parseFloat(updatedRow.gst) || 0;
        updatedRow.total = qty * price * (1 + gst / 100);

        return updatedRow;
      });

      const total = updatedRows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
      setGrandTotal(total);
      return updatedRows;
    });
  };

  const handleAddSellRow = () => {
    if (sellProducts.length === 0 && !loadingSellProducts) {
      loadSellProducts();
    }

    const newRow = {
      id: Date.now(),
      product: '',
      productId: null,
      batch: '',
      batchId: null,
      batchData: null,
      quantity: '',
      price: '',
      mrp: '',
      gst: '',
      total: 0,
      availableQuantity: 0,
    };
    setSellRows((prevRows) => [newRow, ...prevRows]);
  };

  const handleRemoveSellRow = (rowId) => {
    if (sellRows.length <= 1) return;
    setSellRows((prevRows) => {
      const filtered = prevRows.filter((row) => row.id !== rowId);
      const total = filtered.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
      setGrandTotal(total);
      return filtered;
    });
  };

  const handleCancel = () => {
    navigate('/seller/customers/purchase');
  };

  const handlePlaceSellOrder = async () => {
    let customerIdForOrder = sellSelectedCustomer ? parseInt(sellSelectedCustomer) : null;

    const customerFormErrors = {
      mobile_number: '',
      whatsapp_number: '',
    };

    if (!customerIdForOrder) {
      if (!sellCustomerForm.full_name.trim()) {
        setSellError('Please enter customer full name');
        return;
      }
      if (!sellCustomerForm.email.trim()) {
        setSellError('Please enter customer email');
        return;
      }

      const mobileDigits = (sellCustomerForm.mobile_number || '').replace(/\D/g, '');
      if (mobileDigits.length !== 10) {
        customerFormErrors.mobile_number = 'Phone number must be exactly 10 digits';
      }

      const whatsappDigits = (sellCustomerForm.whatsapp_number || '').replace(/\D/g, '');
      if (whatsappDigits.length !== 10) {
        customerFormErrors.whatsapp_number = 'WhatsApp number must be exactly 10 digits';
      }

      if (customerFormErrors.mobile_number || customerFormErrors.whatsapp_number) {
        setSellCustomerValidation(customerFormErrors);
        setSellError('Please fix the errors in customer details');
        return;
      }
    }

    for (let i = 0; i < sellRows.length; i++) {
      const row = sellRows[i];
      if (!row.productId || !row.batchId || !row.quantity || !row.price) {
        setSellError(`Please fill all required fields in row ${i + 1}`);
        return;
      }
      const qty = parseFloat(row.quantity);
      if (qty <= 0 || qty > row.availableQuantity) {
        setSellError(`Invalid quantity in row ${i + 1}. Must be between 1 and ${row.availableQuantity}`);
        return;
      }
    }

    const productBatchCombos = sellRows.map((row) => `${row.productId}-${row.batchId}`);
    const uniqueCombos = new Set(productBatchCombos);
    if (productBatchCombos.length !== uniqueCombos.size) {
      setSellError('The same product-batch combination cannot be selected in multiple rows. Please select different batches.');
      return;
    }

    setSellLoading(true);
    setSellError('');

    try {
      if (!customerIdForOrder) {
        const payload = {
          full_name: sellCustomerForm.full_name.trim(),
          email: sellCustomerForm.email.trim(),
          mobile_number: sellCustomerForm.mobile_number.trim(),
          whatsapp_number: sellCustomerForm.whatsapp_number.trim(),
          address: '',
        };
        const createResp = await createCustomer(payload);
        if (!createResp || createResp.success === false || !createResp.data) {
          throw new Error(createResp?.message || 'Failed to create customer before placing order.');
        }
        const newCustomer = createResp.data;
        const newCustomerId = newCustomer.customer_id || newCustomer.id;
        if (!newCustomerId) {
          throw new Error('Customer created but ID not returned from server.');
        }
        customerIdForOrder = newCustomerId;

        setCustomers((prev) => [
          ...(prev || []),
          {
            ...newCustomer,
            id: newCustomerId,
            name: newCustomer.full_name || newCustomer.name,
          },
        ]);
      }

      const existingCartResponse = await fetchCustomerCart(parseInt(customerIdForOrder));
      if (existingCartResponse && existingCartResponse.success && existingCartResponse.data) {
        const existingCartItems = existingCartResponse.data;
        const removePromises = existingCartItems.map((item) => removeFromCart(item.cart_id));
        if (removePromises.length > 0) {
          await Promise.all(removePromises);
        }
      }

      const cartPromises = sellRows.map((row) => {
        return addToCart({
          customer: parseInt(customerIdForOrder),
          product: row.productId,
          quantity: parseFloat(row.quantity),
          batch: row.batchId,
        });
      });
      await Promise.all(cartPromises);

      const response = await placeCustomerOrder({
        customer_id: parseInt(customerIdForOrder),
        invoice_number: sellInvoiceNumber || undefined,
        invoice_date: sellOrderDate || undefined,
      });

      if (response && response.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Order Placed Successfully',
          text: response.message || 'Order placed successfully.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#0ea5e9',
        });
        navigate('/seller/customers/purchase');
      } else {
        throw new Error(response?.error || response?.message || 'Failed to place order.');
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to place order.';
      setSellError(errorMessage);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#d32f2f',
      });
    } finally {
      setSellLoading(false);
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 3 },
        backgroundColor: '#020617',
        height: 'calc(100vh - 64px)',
        overflow: 'hidden',
        color: '#e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <Card
        sx={{
          backgroundColor: '#020617',
          borderRadius: 2,
          border: '1px solid rgba(148, 163, 184, 0.25)',
          boxShadow: '0 20px 45px rgba(15,23,42,0.85)',
          p: { xs: 2, md: 3 },
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton
              onClick={handleCancel}
              sx={{
                color: '#9ca3af',
                border: '1px solid rgba(148, 163, 184, 0.25)',
                '&:hover': { backgroundColor: 'rgba(148, 163, 184, 0.1)', color: '#e5e7eb' },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h5" fontWeight={700} sx={{ color: '#e5e7eb' }}>
                Sell
              </Typography>
              {sellInvoiceNumber && (
                <Typography variant="body2" sx={{ color: '#9ca3af', mt: 0.25 }}>
                  Invoice: <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{sellInvoiceNumber}</span>
                </Typography>
              )}
            </Box>
          </Box>

          <Button
            onClick={handleCancel}
            sx={{ textTransform: 'none', color: '#9ca3af' }}
          >
            Cancel
          </Button>
        </Box>

        {sellError && (
          <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }} onClose={() => setSellError('')}>
            {sellError}
          </Alert>
        )}

        <Box sx={{ mb: 3, flexShrink: 0 }}>
          <Grid container spacing={3} alignItems="flex-start" mt={4}>
            <Grid item xs={12} md={3}>
              <TextField
                label="Date"
                type="date"
                value={sellOrderDate}
                onChange={(e) => setSellOrderDate(e.target.value)}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true, sx: { color: '#9ca3af' } }}
                InputProps={{
                  sx: {
                    color: '#e5e7eb',
                    backgroundColor: '#0f2339',
                    borderRadius: 1,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.5)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0ea5e9' },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Invoice Number"
                value={sellInvoiceNumber}
                onChange={(e) => setSellInvoiceNumber(e.target.value)}
                size="small"
                fullWidth
                InputLabelProps={{ sx: { color: '#9ca3af' } }}
                InputProps={{
                  sx: {
                    color: '#e5e7eb',
                    backgroundColor: '#0f2339',
                    borderRadius: 1,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.5)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0ea5e9' },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6} width={200}>
              <Autocomplete
                freeSolo
                options={customers}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  return option.full_name || option.name || '';
                }}
                value={
                  sellIsExistingCustomer && sellSelectedCustomer
                    ? customers.find((c) => String(c.id) === String(sellSelectedCustomer)) || null
                    : sellCustomerForm.full_name || ''
                }
                onChange={(_, newValue) => {
                  if (!newValue) {
                    setSellSelectedCustomer('');
                    setSellIsExistingCustomer(false);
                    setSellCustomerForm({ full_name: '', email: '', mobile_number: '', whatsapp_number: '' });
                    setSellCustomerValidation({ mobile_number: '', whatsapp_number: '' });
                    return;
                  }

                  if (typeof newValue === 'string') {
                    setSellSelectedCustomer('');
                    setSellIsExistingCustomer(false);
                    setSellCustomerForm((prev) => ({ ...prev, full_name: newValue }));
                    return;
                  }

                  const customerObj = newValue;
                  const newId = customerObj.id;
                  const previousCustomer = sellSelectedCustomer;

                  setSellSelectedCustomer(newId);
                  setSellIsExistingCustomer(true);
                  setSellCustomerForm({
                    full_name: customerObj.full_name || customerObj.name || '',
                    email: customerObj.email || '',
                    mobile_number: customerObj.mobile_number || '',
                    whatsapp_number: customerObj.whatsapp_number || '',
                  });
                  setSellCustomerValidation({ mobile_number: '', whatsapp_number: '' });

                  if (String(newId) !== String(previousCustomer) && previousCustomer !== '') {
                    setSellRows([
                      {
                        id: 1,
                        product: '',
                        productId: null,
                        batch: '',
                        batchId: null,
                        batchData: null,
                        quantity: '',
                        price: '',
                        mrp: '',
                        gst: '',
                        total: 0,
                        availableQuantity: 0,
                      },
                    ]);
                    setSellBatches({});
                    setGrandTotal(0);
                    setSellError('');
                  }
                }}
                onInputChange={(_, newInput) => {
                  setSellIsExistingCustomer(false);
                  setSellSelectedCustomer('');
                  setSellCustomerForm((prev) => ({ ...prev, full_name: newInput || '' }));
                }}
                loading={loadingCustomers}
                size="small"
                fullWidth
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Full Name"
                    placeholder="Search or type customer name"
                    disabled={loadingCustomers}
                    InputLabelProps={{ sx: { color: '#9ca3af' } }}
                    InputProps={{
                      ...params.InputProps,
                      sx: {
                        ...params.InputProps.sx,
                        backgroundColor: '#0f2339',
                        color: '#e5e7eb',
                        borderRadius: 1,
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.5)' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0ea5e9' },
                      },
                    }}
                  />
                )}
                noOptionsText={loadingCustomers ? 'Loading customers...' : 'No customers found'}
                PaperComponent={({ children, ...other }) => (
                  <Paper {...other} sx={{ backgroundColor: '#1e293b', color: '#e5e7eb' }}>
                    {children}
                  </Paper>
                )}
              />
            </Grid>
          </Grid>

          <Grid container spacing={3} sx={{ mt: 4 }}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Email"
                value={sellCustomerForm.email}
                onChange={(e) => setSellCustomerForm((prev) => ({ ...prev, email: e.target.value }))}
                size="small"
                fullWidth
                InputLabelProps={{ sx: { color: '#9ca3af' } }}
                InputProps={{
                  sx: {
                    color: '#e5e7eb',
                    backgroundColor: '#0f2339',
                    borderRadius: 1,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.5)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0ea5e9' },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Phone Number"
                value={sellCustomerForm.mobile_number}
                onChange={(e) => {
                  const raw = e.target.value || '';
                  const digits = raw.replace(/\D/g, '').slice(0, 10);
                  setSellCustomerForm((prev) => ({ ...prev, mobile_number: digits }));
                  setSellCustomerValidation((prev) => ({ ...prev, mobile_number: '' }));
                }}
                size="small"
                fullWidth
                inputMode="numeric"
                error={!!sellCustomerValidation.mobile_number}
                helperText={sellCustomerValidation.mobile_number}
                InputLabelProps={{ sx: { color: '#9ca3af' } }}
                InputProps={{
                  sx: {
                    color: '#e5e7eb',
                    backgroundColor: '#0f2339',
                    borderRadius: 1,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.5)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0ea5e9' },
                  },
                }}
                FormHelperTextProps={{ sx: { color: '#ef4444' } }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="WhatsApp Number"
                value={sellCustomerForm.whatsapp_number}
                onChange={(e) => {
                  const raw = e.target.value || '';
                  const digits = raw.replace(/\D/g, '').slice(0, 10);
                  setSellCustomerForm((prev) => ({ ...prev, whatsapp_number: digits }));
                  setSellCustomerValidation((prev) => ({ ...prev, whatsapp_number: '' }));
                }}
                size="small"
                fullWidth
                inputMode="numeric"
                error={!!sellCustomerValidation.whatsapp_number}
                helperText={sellCustomerValidation.whatsapp_number}
                InputLabelProps={{ sx: { color: '#9ca3af' } }}
                InputProps={{
                  sx: {
                    color: '#e5e7eb',
                    backgroundColor: '#0f2339',
                    borderRadius: 1,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.5)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0ea5e9' },
                  },
                }}
                FormHelperTextProps={{ sx: { color: '#ef4444' } }}
              />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <TableContainer
            component={Paper}
            sx={{
              backgroundColor: '#0b1624',
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.08)',
              // Keep initial height compact (1 row visible),
              // but allow scrolling when many rows are added.
              maxHeight: '50vh',
              overflowY: 'auto',
              overflowX: 'auto',
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ backgroundColor: '#0b1624', color: '#9ca3af', fontWeight: 600 }}>
                    Sr. No.
                  </TableCell>
                  <TableCell sx={{ backgroundColor: '#0b1624', color: '#9ca3af', fontWeight: 600 }}>
                    Product Name
                  </TableCell>
                  <TableCell sx={{ backgroundColor: '#0b1624', color: '#9ca3af', fontWeight: 600 }}>
                    Batch
                  </TableCell>
                  <TableCell sx={{ backgroundColor: '#0b1624', color: '#9ca3af', fontWeight: 600 }}>
                    Quantity
                  </TableCell>
                  <TableCell sx={{ backgroundColor: '#0b1624', color: '#9ca3af', fontWeight: 600 }}>
                    Price
                  </TableCell>
                  <TableCell sx={{ backgroundColor: '#0b1624', color: '#9ca3af', fontWeight: 600 }}>
                    MRP
                  </TableCell>
                  <TableCell sx={{ backgroundColor: '#0b1624', color: '#9ca3af', fontWeight: 600 }}>
                    GST
                  </TableCell>
                  <TableCell sx={{ backgroundColor: '#0b1624', color: '#9ca3af', fontWeight: 600 }}>
                    Total
                  </TableCell>
                  <TableCell align="center" sx={{ backgroundColor: '#0b1624', color: '#9ca3af', fontWeight: 600 }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sellRows.map((row, index) => {
                  const allProductBatches = row.productId ? (sellBatches[row.productId] || []) : [];
                  const productBatches = allProductBatches.filter((batch) => {
                    const isAlreadySelected = sellRows.some(
                      (r) => r.id !== row.id && r.productId === row.productId && r.batchId === batch.batch_id,
                    );
                    return !isAlreadySelected;
                  });
                  const loadingBatches = row.productId ? (loadingSellBatches[row.productId] || false) : false;

                  return (
                    <TableRow key={row.id}>
                      <TableCell sx={{ color: '#e5e7eb' }}>{index + 1}</TableCell>
                      <TableCell>
                        <Autocomplete
                          options={sellProducts.filter((p) => p && p.product_id)}
                          getOptionLabel={(option) => option.product_name || ''}
                          value={sellProducts.find((p) => p.product_id === row.productId) || null}
                          onChange={(_, newValue) => handleSellRowChange(row.id, 'product', newValue)}
                          loading={loadingSellProducts}
                          size="small"
                          sx={{
                            width: 220,
                            '& .MuiOutlinedInput-root': { backgroundColor: '#020617', color: '#e5e7eb' },
                            '& .MuiAutocomplete-input': { color: '#e5e7eb' },
                            '& .MuiAutocomplete-option': {
                              color: '#e5e7eb',
                              backgroundColor: '#020617',
                              '&:hover': { backgroundColor: '#0f2339' },
                            },
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Select Product"
                              InputProps={{ ...params.InputProps, sx: { color: '#e5e7eb' } }}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        {row.productId ? (
                          <TextField
                            select
                            fullWidth
                            size="small"
                            value={row.batch || ''}
                            onChange={(e) => handleSellRowChange(row.id, 'batch', e.target.value)}
                            disabled={loadingBatches || !row.productId}
                            sx={{
                              width: 240,
                              '& .MuiOutlinedInput-root': { backgroundColor: '#020617', color: '#e5e7eb' },
                            }}
                            SelectProps={{
                              sx: { color: '#e5e7eb' },
                              displayEmpty: true,
                              renderValue: (selected) =>
                                selected ? selected : <em style={{ color: '#9ca3af' }}>Select Batch</em>,
                              MenuProps: {
                                PaperProps: { sx: { backgroundColor: '#1e293b', color: '#e5e7eb' } },
                              },
                            }}
                          >
                            <MenuItem value="">
                              <em>Select Batch</em>
                            </MenuItem>
                            {loadingBatches ? (
                              <MenuItem value="" disabled>
                                Loading batches...
                              </MenuItem>
                            ) : productBatches.length > 0 ? (
                              productBatches.map((batch) => {
                                const expiryInfo = batch.expiry_date
                                  ? ` | Exp: ${new Date(batch.expiry_date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })}`
                                  : '';
                                return (
                                  <MenuItem key={batch.batch_id} value={batch.batch_name}>
                                    {batch.batch_name} (Qty: {batch.available_quantity.toFixed(2)}
                                    {expiryInfo})
                                  </MenuItem>
                                );
                              })
                            ) : (
                              <MenuItem value="" disabled>
                                No batches available
                              </MenuItem>
                            )}
                          </TextField>
                        ) : (
                          <TextField
                            size="small"
                            placeholder="Select Product First"
                            disabled
                            sx={{
                              width: 240,
                              '& .MuiOutlinedInput-root': { backgroundColor: '#020617', color: '#9ca3af' },
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={row.quantity}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              handleSellRowChange(row.id, 'quantity', '');
                              return;
                            }
                            const intValue = parseInt(value, 10);
                            if (!isNaN(intValue) && intValue >= 0) {
                              handleSellRowChange(row.id, 'quantity', intValue.toString());
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' || e.key === 'Delete') return;
                            if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
                              e.preventDefault();
                            }
                          }}
                          disabled={!row.batchId}
                          inputProps={{ min: 1, max: row.availableQuantity, step: 1 }}
                          sx={{
                            width: 110,
                            '& .MuiOutlinedInput-root': { backgroundColor: '#020617', color: '#e5e7eb' },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#e5e7eb' }}>₹{parseFloat(row.price || 0).toFixed(2)}</TableCell>
                      <TableCell sx={{ color: '#e5e7eb' }}>₹{parseFloat(row.mrp || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={row.gst}
                          disabled
                          inputProps={{ min: 0, step: 0.01, readOnly: true }}
                          sx={{
                            width: 90,
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: '#020617',
                              color: '#e5e7eb',
                              '&.Mui-disabled': { backgroundColor: '#0f2339', color: '#e5e7eb' },
                            },
                            '& .MuiInputBase-input.Mui-disabled': {
                              WebkitTextFillColor: '#e5e7eb',
                              color: '#e5e7eb',
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#22d3ee', fontWeight: 600 }}>
                        ₹{parseFloat(row.total || 0).toFixed(2)}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveSellRow(row.id)}
                          disabled={sellRows.length === 1}
                          sx={{
                            color: '#f97373',
                            '&:hover': { backgroundColor: 'rgba(248,113,113,0.15)', color: '#ef4444' },
                            '&:disabled': { color: 'rgba(255,255,255,0.3)' },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}

                <TableRow
                  sx={{
                    backgroundColor: 'rgba(14, 165, 233, 0.1)',
                    borderTop: '2px solid rgba(14, 165, 233, 0.3)',
                    '& .MuiTableCell-root': { borderBottom: 'none' },
                  }}
                >
                  <TableCell colSpan={7} align="right" sx={{ color: '#e5e7eb', fontWeight: 700, fontSize: '1rem' }}>
                    Grand Total:
                  </TableCell>
                  <TableCell sx={{ color: '#22d3ee', fontWeight: 700, fontSize: '1rem' }}>
                    ₹{grandTotal.toFixed(2)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <Box>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddSellRow}
                sx={{
                  textTransform: 'none',
                  color: '#e5e7eb',
                  borderColor: 'rgba(148, 163, 184, 0.3)',
                  '&:hover': { borderColor: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.1)' },
                }}
              >
                Add Row
              </Button>
            </Box>

            <Button
              variant="contained"
              onClick={handlePlaceSellOrder}
              disabled={
                sellRows.length === 0 ||
                sellLoading ||
                grandTotal === 0 ||
                (!sellSelectedCustomer && !sellCustomerForm.full_name)
              }
              sx={{
                textTransform: 'none',
                backgroundColor: '#0ea5e9',
                '&:hover': { backgroundColor: '#0284c7' },
                '&:disabled': { backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.3)' },
              }}
            >
              {sellLoading ? (
                <>
                  <CircularProgress size={18} sx={{ color: '#e5e7eb', mr: 1 }} />
                  Placing Order...
                </>
              ) : (
                'Place Order'
              )}
            </Button>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}

export default CustomerSell;

