import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  MenuItem,
  TextField,
  Typography,
  alpha,
  Alert,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { stockOut, getInventorySummary } from '../../../api/inventory';
import { fetchSellerProducts } from '../../../api/products';
import { useAuth } from '../../../context/AuthContext';
import Swal from 'sweetalert2';

const reasons = ['Damaged', 'Expired', 'Lost', 'Return', 'Sale', 'Other'];

function StockOut() {
  const { user } = useAuth();
  const getToday = () => new Date().toISOString().slice(0, 10); // yyyy-mm-dd

  const [formData, setFormData] = useState({
    product: '',
    quantity: '',
    reason: 'Damaged',
    date: getToday(),
  });

  const [products, setProducts] = useState([]);
  const [availableStock, setAvailableStock] = useState(null);
  const [loadingStock, setLoadingStock] = useState(false);
  const [quantityError, setQuantityError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
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

  const loadAvailableStock = async (productId) => {
    if (!productId) {
      setAvailableStock(null);
      return;
    }

    setLoadingStock(true);
    try {
      const response = await getInventorySummary({ 
        product_id: productId,
        seller_user: user?.id 
      });
      
      if (response && response.success && Array.isArray(response.data) && response.data.length > 0) {
        const productStock = response.data[0];
        setAvailableStock({
          available: parseFloat(productStock.available_stock) || 0,
          unit: productStock.unit || 'unit',
        });
      } else {
        setAvailableStock({ available: 0, unit: 'unit' });
      }
    } catch (err) {
      console.error('Error loading available stock:', err);
      setAvailableStock(null);
    } finally {
      setLoadingStock(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
    
    // If product is changed, fetch available stock
    if (name === 'product') {
      setAvailableStock(null);
      setQuantityError('');
      if (value) {
        const productId = parseInt(value, 10);
        if (!isNaN(productId)) {
          loadAvailableStock(productId);
        }
      }
    }
    
    // If quantity is changed, validate against available stock
    if (name === 'quantity') {
      validateQuantity(value);
    }
  };

  const validateQuantity = (quantityValue) => {
    if (!quantityValue || quantityValue.trim() === '') {
      setQuantityError('');
      return;
    }

    const qty = parseFloat(quantityValue);
    if (isNaN(qty) || qty <= 0) {
      setQuantityError('Quantity must be greater than 0');
      return;
    }

    if (availableStock && qty > availableStock.available) {
      setQuantityError(`Quantity cannot exceed available stock (${availableStock.available.toFixed(2)} ${availableStock.unit})`);
      return;
    }

    setQuantityError('');
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // Validation
    if (!formData.product) {
      setError('Please select a product');
      return;
    }
    
    const quantity = parseFloat(formData.quantity);
    if (!formData.quantity || isNaN(quantity) || quantity <= 0) {
      setError('Please enter a valid quantity');
      return;
    }
    
    // Validate quantity against available stock
    if (availableStock && quantity > availableStock.available) {
      setError(`Quantity (${quantity}) cannot exceed available stock (${availableStock.available.toFixed(2)} ${availableStock.unit})`);
      return;
    }
    
    if (!formData.reason || formData.reason.trim() === '') {
      setError('Please select a reason');
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

      // Prepare payload
      const payload = {
        product: productId,
        quantity: parseFloat(formData.quantity),
        reason: formData.reason.trim(),
        date: formData.date,
      };

      const response = await stockOut(payload);

      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: response.message || 'Stock out recorded successfully.',
        confirmButtonColor: '#22d3ee',
      });

      // Reset form
      setFormData({
        product: '',
        quantity: '',
        reason: 'Damaged',
        date: getToday(),
      });
      setAvailableStock(null);
      setQuantityError('');
    } catch (err) {
      const errorMessage = err.message || 'Failed to record stock out.';
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
        p: { xs: 2, md: 3 },
        backgroundColor: '#0b1624',
        color: '#e5e7eb',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Card
        sx={{
          backgroundColor: '#0f1f33',
          border: '1px solid rgba(255,255,255,0.06)',
          width: '100%',
          maxWidth: 960,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            p: 2,
          }}
        >
          <Typography variant="h6" fontWeight={700} sx={{ color: '#e5e7eb' }}>
            Stock Out (remove)
          </Typography>
          <IconButton
            sx={{
              color: '#9ca3af',
              '&:hover': { backgroundColor: alpha('#22d3ee', 0.1), color: '#22d3ee' },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
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
            <Grid container spacing={2.5}>
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
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#0b1c2d' } }}
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
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="quantity"
                  label="Quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={handleChange}
                  size="small"
                  required
                  error={!!quantityError}
                  helperText={
                    quantityError || 
                    (availableStock !== null 
                      ? `Available: ${availableStock.available.toFixed(2)} ${availableStock.unit}` 
                      : loadingStock 
                        ? 'Loading available stock...' 
                        : formData.product 
                          ? 'Select a product to see available stock' 
                          : '')
                  }
                  inputProps={{ 
                    min: 0,
                    max: availableStock ? availableStock.available : undefined,
                    step: 0.01,
                  }}
                  InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                  InputProps={{ sx: { color: '#e5e7eb', backgroundColor: '#0b1c2d' } }}
                  FormHelperTextProps={{
                    sx: { 
                      color: quantityError ? '#ef4444' : '#9ca3af',
                      fontSize: '0.75rem' 
                    },
                  }}
                  disabled={loadingStock || !formData.product}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  name="reason"
                  label="Reason"
                  value={formData.reason}
                  onChange={handleChange}
                  size="small"
                  required
                  InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                  SelectProps={{ sx: { color: '#e5e7eb' } }}
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#0b1c2d' } }}
                >
                  {reasons.map((r) => (
                    <MenuItem key={r} value={r}>
                      {r}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="date"
                  label="Date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  size="small"
                  required
                  InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                  InputProps={{ sx: { color: '#e5e7eb', backgroundColor: '#0b1c2d' } }}
                />
              </Grid>

            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button
                variant="outlined"
                sx={{
                  textTransform: 'none',
                  color: '#e5e7eb',
                  borderColor: 'rgba(255,255,255,0.2)',
                  '&:hover': { borderColor: '#22d3ee', color: '#22d3ee' },
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                sx={{
                  textTransform: 'none',
                  backgroundColor: '#22d3ee',
                  color: '#0b1624',
                  fontWeight: 600,
                  '&:hover': { backgroundColor: '#06b6d4' },
                }}
              >
                {loading ? 'Removing...' : 'Remove Stock'}
              </Button>
            </Grid>
          </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default StockOut;

