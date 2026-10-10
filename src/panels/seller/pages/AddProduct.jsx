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
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../../../context/AuthContext';
import { createProduct } from '../../../api/products';
import { fetchCategories } from '../../../api/categories';
import Swal from 'sweetalert2';

const units = ['kg', 'g', 'ltr', 'ml', 'pcs', 'piece', 'pack', 'box', 'bag', 'bottle', 'carton'];

function AddProduct() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    product_name: '',
    category: '',
    brand: '',
    unit: 'piece',
    purchase_price: '',
    sale_price: '',
    mrp: '',
    gst: '',
    minimum_stock_alert: '',
    barcode: '',
    description: '',
    initial_quantity: '',
  });
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await fetchCategories();
      if (response && response.success && Array.isArray(response.data)) {
        setCategories(response.data);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleClear = () => {
    setFormData({
      product_name: '',
      category: '',
      brand: '',
      unit: 'piece',
      purchase_price: '',
      sale_price: '',
      mrp: '',
      gst: '',
      minimum_stock_alert: '',
      barcode: '',
      description: '',
      initial_quantity: '',
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!formData.product_name || formData.product_name.trim() === '') {
      setError('Product name is required');
      return;
    }

    // Validate seller_user_id
    if (!user || !user.id) {
      setError('Seller user ID is required. Please login again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        product_name: formData.product_name.trim(),
        seller_user: user.id, // Required: seller_user_id from authenticated user
      };

      // Add optional fields only if they have values
      if (formData.category.trim()) payload.category = formData.category.trim();
      if (formData.brand.trim()) payload.brand = formData.brand.trim();
      if (formData.unit.trim()) payload.unit = formData.unit.trim();
      
      // Parse numeric fields - only add if valid numbers
      if (formData.purchase_price.trim()) {
        const purchasePrice = parseFloat(formData.purchase_price);
        if (!isNaN(purchasePrice) && purchasePrice >= 0) {
          payload.purchase_price = purchasePrice;
        }
      }
      if (formData.sale_price.trim()) {
        const salePrice = parseFloat(formData.sale_price);
        if (!isNaN(salePrice) && salePrice >= 0) {
          payload.sale_price = salePrice;
        }
      }
      if (formData.mrp.trim()) {
        const mrp = parseFloat(formData.mrp);
        if (!isNaN(mrp) && mrp >= 0) {
          payload.mrp = mrp;
        }
      }
      if (formData.gst.trim()) {
        const gst = parseFloat(formData.gst);
        if (!isNaN(gst) && gst >= 0) {
          payload.gst = gst;
        }
      }
      if (formData.minimum_stock_alert.trim()) {
        const minStock = parseInt(formData.minimum_stock_alert, 10);
        if (!isNaN(minStock) && minStock >= 0) {
          payload.minimum_stock_alert = minStock;
        }
      }
      if (formData.barcode.trim()) payload.barcode = formData.barcode.trim();
      if (formData.description.trim()) payload.description = formData.description.trim();
      
      // Add initial_quantity if provided (creates inventory transaction)
      if (formData.initial_quantity.trim()) {
        const initialQty = parseInt(formData.initial_quantity, 10);
        if (!isNaN(initialQty) && initialQty > 0) {
          payload.initial_quantity = initialQty;
        }
      }

      const response = await createProduct(payload);

      if (response && response.success) {
        // Build success message
        let successMessage = response.message || 'Product added successfully.';
        if (response.initial_stock_added) {
          successMessage += ` Initial stock of ${response.initial_stock_added} units has been added.`;
        }

        await Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: successMessage,
          confirmButtonColor: '#0ea5e9',
        });

        handleClear();
      } else {
        throw new Error(response.message || 'Failed to add product.');
      }
    } catch (err) {
      // Handle API error responses
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.errors?.product_name?.[0] ||
                          err.response?.data?.error ||
                          err.message || 
                          'Failed to add product.';
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
          maxWidth: 1000,
        }}
      >
        <Grid container spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Grid item>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#e5e7eb' }}>
              Add Product
            </Typography>
          </Grid>
        </Grid>

        <Card
          sx={{
            backgroundColor: '#020617',
            borderRadius: 2,
            border: '1px solid rgba(30,64,175,0.6)',
          }}
        >
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Grid container spacing={2.5}>
            {error && (
              <Grid item xs={12}>
                <Alert severity="error" onClose={() => setError('')}>
                  {error}
                </Alert>
              </Grid>
            )}

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="product_name"
                label="Product Name"
                value={formData.product_name}
                onChange={handleChange}
                size="small"
                required
                InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                InputProps={{ sx: { color: '#e5e7eb', backgroundColor: '#0b1c2d' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                name="category"
                label="Category"
                value={formData.category}
                onChange={handleChange}
                size="small"
                disabled={loadingCategories}
                InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                SelectProps={{ sx: { color: '#e5e7eb' } }}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#0b1c2d' } }}
              >
                <MenuItem value="">
                  <em>Select Category</em>
                </MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.category_id} value={category.category_name}>
                    {category.category_name}
                  </MenuItem>
                ))}
                {categories.length === 0 && !loadingCategories && (
                  <MenuItem value="" disabled>
                    No categories found
                  </MenuItem>
                )}
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="brand"
                label="Brand"
                value={formData.brand}
                onChange={handleChange}
                size="small"
                InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                InputProps={{ sx: { color: '#e5e7eb', backgroundColor: '#0b1c2d' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                name="unit"
                label="Unit"
                value={formData.unit}
                onChange={handleChange}
                size="small"
                InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                SelectProps={{ sx: { color: '#e5e7eb' } }}
                sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#0b1c2d' } }}
              >
                {units.map((u) => (
                  <MenuItem key={u} value={u}>
                    {u}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="purchase_price"
                label="Purchase Price (₹)"
                type="number"
                value={formData.purchase_price}
                onChange={handleChange}
                size="small"
                InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                InputProps={{ sx: { color: '#e5e7eb', backgroundColor: '#0b1c2d' } }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="sale_price"
                label="Sale Price (₹)"
                type="number"
                value={formData.sale_price}
                onChange={handleChange}
                size="small"
                InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                InputProps={{ sx: { color: '#e5e7eb', backgroundColor: '#0b1c2d' } }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="mrp"
                label="MRP (optional)"
                type="number"
                value={formData.mrp}
                onChange={handleChange}
                size="small"
                InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                InputProps={{ sx: { color: '#e5e7eb', backgroundColor: '#0b1c2d' } }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                name="gst"
                label="GST % (optional)"
                type="number"
                value={formData.gst}
                onChange={handleChange}
                size="small"
                InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                InputProps={{ sx: { color: '#e5e7eb', backgroundColor: '#0b1c2d' } }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="minimum_stock_alert"
                label="Minimum Stock Alert"
                type="number"
                value={formData.minimum_stock_alert}
                onChange={handleChange}
                size="small"
                inputProps={{ min: 0 }}
                InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                InputProps={{ sx: { color: '#e5e7eb', backgroundColor: '#0b1c2d' } }}
                helperText="Low stock alert threshold"
                FormHelperTextProps={{ sx: { color: '#6b7280', fontSize: '0.75rem' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="barcode"
                label="Barcode (or leave blank to auto-gen)"
                value={formData.barcode}
                onChange={handleChange}
                size="small"
                InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                InputProps={{ sx: { color: '#e5e7eb', backgroundColor: '#0b1c2d' } }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="initial_quantity"
                label="Initial Quantity (Optional)"
                type="number"
                value={formData.initial_quantity}
                onChange={handleChange}
                size="small"
                inputProps={{ min: 0 }}
                InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                InputProps={{ sx: { color: '#e5e7eb', backgroundColor: '#0b1c2d' } }}
                helperText="If provided, creates initial stock-in transaction and sets minimum_stock_alert"
                FormHelperTextProps={{ sx: { color: '#6b7280', fontSize: '0.75rem' } }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                name="description"
                label="Description"
                multiline
                minRows={3}
                value={formData.description}
                onChange={handleChange}
                size="small"
                InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                InputProps={{ sx: { color: '#e5e7eb', backgroundColor: '#0b1c2d' } }}
              />
            </Grid>

            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={handleClear}
                disabled={loading}
                sx={{
                  textTransform: 'none',
                  color: '#e5e7eb',
                  borderColor: 'rgba(255,255,255,0.2)',
                  '&:hover': { borderColor: '#22d3ee', color: '#22d3ee' },
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
                  backgroundColor: '#22d3ee',
                  color: '#0b1624',
                  fontWeight: 600,
                  '&:hover': { backgroundColor: '#06b6d4' },
                }}
              >
                {loading ? (
                  <>
                    <CircularProgress size={16} sx={{ mr: 1, color: '#0b1624' }} />
                    Saving...
                  </>
                ) : (
                  'Save Product'
                )}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      </Card>
    </Box>
  );
}

export default AddProduct;

