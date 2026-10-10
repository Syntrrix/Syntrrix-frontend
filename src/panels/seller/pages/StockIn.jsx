import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  TextField,
  Typography,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import { stockIn } from '../../../api/inventory';
import { fetchBatchesByProduct } from '../../../api/batches';
import { fetchSellerProducts } from '../../../api/products';
import Swal from 'sweetalert2';

function StockIn() {
  const generateBillNumber = () => `BILL-${Math.floor(100000 + Math.random() * 900000)}`;
  const getToday = () => new Date().toISOString().slice(0, 10); // yyyy-mm-dd

  const [formData, setFormData] = useState({
    product: '',
    batch: '',
    quantity: '',
    reason: 'Purchase',
    reference_id: generateBillNumber(),
    date: getToday(),
  });

  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]); // batches for selected product
  const [selectedBatchStock, setSelectedBatchStock] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      // Fetch only products belonging to the logged-in seller
      const productsRes = await fetchSellerProducts().catch(() => ({ success: false, data: [] }));

      if (productsRes && productsRes.success && Array.isArray(productsRes.data)) {
        setProducts(productsRes.data);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Ensure date & bill are initialized correctly on first render
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      bill_number: prev.bill_number || generateBillNumber(),
      date: prev.date || getToday(),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Prevent editing quantity when a batch is selected
    if (name === 'quantity' && formData.batch) {
      return; // Don't allow editing quantity when batch is selected
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');

    // When product changes, fetch batches for that product
    if (name === 'product') {
      setFormData((prev) => ({
        ...prev,
        batch: '',
        quantity: '', // Clear quantity when product changes
      }));
      setBatches([]);
      setSelectedBatchStock(null);
      const productIdNum = parseInt(value);
      if (!isNaN(productIdNum) && productIdNum > 0) {
        loadBatches(productIdNum);
      }
    }

    // When batch changes, show its available quantity
    if (name === 'batch') {
      const found = batches.find((b) => b.batch_name === value);
      if (found) {
        // Use available_quantity from API response (purchased_quantity - stocked_in_quantity)
        const availableQty = found.available_quantity ?? found.quantity ?? found.current_stock;
        setSelectedBatchStock(availableQty !== undefined ? availableQty : null);
        // Auto-fill quantity with available qty for this batch (read-only)
        if (availableQty !== undefined && availableQty !== null && availableQty > 0) {
          setFormData((prev) => ({
            ...prev,
            quantity: availableQty.toString(),
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            quantity: '',
          }));
        }
      } else {
        setSelectedBatchStock(null);
        // Clear quantity when batch is cleared
        setFormData((prev) => ({
          ...prev,
          quantity: '',
        }));
      }
    }
  };

  const loadBatches = async (productId) => {
    setLoadingBatches(true);
    try {
      const res = await fetchBatchesByProduct(productId);
      if (res && res.success && Array.isArray(res.data)) {
        setBatches(res.data);
      } else {
        setBatches([]);
      }
    } catch (err) {
      console.error('Failed to load batches', err);
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  };

  const handleClear = () => {
    setFormData({
      product: '',
      batch: '',
      quantity: '',
      reason: 'Purchase',
      reference_id: generateBillNumber(),
      date: getToday(),
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // Validation according to API documentation
    // Required: product, quantity, date
    // Optional: batch_name, reason, reference_id
    if (!formData.product) {
      setError('Please select a product');
      return;
    }
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      setError('Please enter a valid quantity greater than 0');
      return;
    }
    if (!formData.date) {
      setError('Please enter a date');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Resolve product ID
      let productId = null;
      const productIdNum = parseInt(formData.product);
      if (!isNaN(productIdNum) && productIdNum > 0) {
        productId = productIdNum;
      } else {
        const product = products.find(
          (p) => p.product_name && p.product_name.toLowerCase() === formData.product.toLowerCase()
        );
        if (product) {
          productId = product.product_id;
        } else {
          throw new Error('Product not found. Please select a valid product.');
        }
      }

      // Prepare payload according to API documentation
      // POST /inventory/stock-in/
      // Required: product, quantity, date
      // Optional: batch_name, reason, reference_id
      const payload = {
        product: productId,
        quantity: parseFloat(formData.quantity),
        date: formData.date,
      };

      // Add batch_name if batch is selected (optional field)
      if (formData.batch && formData.batch.trim() !== '') {
        payload.batch_name = formData.batch.trim();
      }

      // Add reason if provided (optional field)
      if (formData.reason && formData.reason.trim() !== '') {
        payload.reason = formData.reason.trim();
      }

      // Add reference_id if provided (optional field)
      if (formData.reference_id && formData.reference_id.trim() !== '') {
        payload.reference_id = formData.reference_id.trim();
      }

      const response = await stockIn(payload);

      // Handle successful response according to API documentation
      // Response: { success: true, message: string, transaction_id: number, data: {...} }
      if (response && response.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: response.message || 'Stock in recorded successfully.',
          confirmButtonColor: '#0ea5e9',
        });

        handleClear();
      } else {
        throw new Error(response?.message || 'Failed to record stock in.');
      }
    } catch (err) {
      // Handle API errors - check for error response structure
      let errorMessage = 'Failed to record stock in.';
      
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        if (errorData.errors) {
          // Validation errors from API
          const errorFields = Object.keys(errorData.errors);
          errorMessage = errorFields.map(field => 
            `${field}: ${Array.isArray(errorData.errors[field]) ? errorData.errors[field].join(', ') : errorData.errors[field]}`
          ).join('\n');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
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
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 3 },
        backgroundColor: '#020617',
        minHeight: '100%',
        color: '#e5e7eb',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Card
        sx={{
          backgroundColor: '#020617',
          borderRadius: 2,
          border: '1px solid rgba(148, 163, 184, 0.25)',
          boxShadow: '0 20px 45px rgba(15,23,42,0.85)',
          p: { xs: 2, md: 3 },
          width: '100%',
          maxWidth: 1200,
        }}
      >
        <Grid container spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Grid item>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#e5e7eb' }}>
              Stock In
            </Typography>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loadingData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Card
            sx={{
              backgroundColor: '#020617',
              borderRadius: 2,
              border: '1px solid rgba(30,64,175,0.6)',
            }}
          >
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Grid container spacing={2}>
                {/* Row 1: Product */}
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    name="product"
                    label="Product"
                    value={formData.product}
                    onChange={handleChange}
                    size="small"
                    required
                    InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                    SelectProps={{ sx: { color: '#e5e7eb' } }}
                    sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#0f2339', borderRadius: 1 } }}
                  >
                    <MenuItem value="">
                      <em>Select Product</em>
                    </MenuItem>
                    {products.map((p) => (
                      <MenuItem key={p.product_id} value={p.product_id}>
                        {p.product_name} (ID: {p.product_id})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

              {/* Divider */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1.5, borderColor: 'rgba(148,163,184,0.4)' }} />
              </Grid>

                {/* Row 2: Batch + Quantity */}
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    name="batch"
                    label="Batch (Optional)"
                    placeholder="Select batch"
                    size="small"
                    value={formData.batch}
                    onChange={handleChange}
                    disabled={loadingBatches}
                    InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                    SelectProps={{
                      sx: { color: '#e5e7eb' },
                      displayEmpty: true,
                      renderValue: (selected) => {
                        if (!selected) {
                          return <em style={{ color: '#9ca3af' }}>Select Batch</em>;
                        }
                        return selected;
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': { backgroundColor: '#0f2339', borderRadius: 1 },
                      '& .MuiSelect-icon': { color: '#9ca3af' },
                    }}
                  >
                    <MenuItem value="">
                      <em>Select Batch</em>
                    </MenuItem>
                    {batches.map((b, idx) => {
                      // Use available_quantity from API (purchased_quantity - stocked_in_quantity)
                      const availableQty = b.available_quantity ?? b.quantity ?? b.current_stock;
                      return (
                        <MenuItem key={`${b.batch_name}-${idx}`} value={b.batch_name}>
                          {b.batch_name} {availableQty !== undefined ? `(Available: ${Number(availableQty).toFixed(2)})` : ''}
                        </MenuItem>
                      );
                    })}
                    {batches.length === 0 && !loadingBatches && (
                      <MenuItem value="" disabled>
                        No batches found for this product
                      </MenuItem>
                    )}
                  </TextField>
                  {selectedBatchStock !== null && (
                    <Typography variant="body2" sx={{ color: '#9ca3af', mt: 0.5 }}>
                      Available quantity for batch: {Number(selectedBatchStock).toFixed(2)}
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="quantity"
                    label="Quantity"
                    type="number"
                    size="small"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                    readOnly={!!formData.batch} // Make read-only when batch is selected
                    InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                    InputProps={{
                      readOnly: !!formData.batch, // Make read-only when batch is selected
                      sx: { 
                        color: '#e5e7eb', 
                        backgroundColor: formData.batch ? '#1a2332' : '#0f2339', // Different background when read-only
                        borderRadius: 1,
                        cursor: formData.batch ? 'not-allowed' : 'text',
                      },
                    }}
                    helperText={formData.batch ? 'Quantity is auto-filled from selected batch' : ''}
                    FormHelperTextProps={{
                      sx: { color: '#9ca3af', fontSize: '0.75rem' },
                    }}
                  />
                </Grid>

                {/* Row 3: Reason + Reference ID */}
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    name="reason"
                    label="Reason"
                    size="small"
                    value={formData.reason}
                    onChange={handleChange}
                    required
                    InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                    SelectProps={{ sx: { color: '#e5e7eb' } }}
                    sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#0f2339', borderRadius: 1 } }}
                  >
                    <MenuItem value="Purchase">Purchase</MenuItem>
                    <MenuItem value="Manual Adjustment">Manual Adjustment</MenuItem>
                    <MenuItem value="Return">Return</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="reference_id"
                    label="Reference ID (Optional)"
                    placeholder="e.g., Invoice number"
                    size="small"
                    value={formData.reference_id}
                    onChange={handleChange}
                    InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                    InputProps={{
                      sx: { color: '#e5e7eb', backgroundColor: '#0f2339', borderRadius: 1 },
                    }}
                  />
                </Grid>

                {/* Row 4: Date */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="date"
                    label="Date"
                    type="date"
                    size="small"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                    InputProps={{
                      sx: { color: '#e5e7eb', backgroundColor: '#0f2339', borderRadius: 1 },
                    }}
                  />
                </Grid>

              {/* Actions */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleClear}
                    sx={{
                      textTransform: 'none',
                      color: '#e5e7eb',
                      borderColor: 'rgba(255,255,255,0.2)',
                      '&:hover': { borderColor: '#0ea5e9', color: '#0ea5e9' },
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    sx={{
                      textTransform: 'none',
                      px: 4,
                      backgroundColor: '#0ea5e9',
                      '&:hover': { backgroundColor: '#0284c7' },
                    }}
                  >
                    {loading ? 'Adding...' : 'Add Stock'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        )}
      </Card>
    </Box>
  );
}

export default StockIn;

