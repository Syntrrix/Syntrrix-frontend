import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  Grid,
  alpha,
} from '@mui/material';
import { getInventorySummary } from '../../../api/inventory';
import { fetchProducts } from '../../../api/products';

function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');

  useEffect(() => {
    loadProducts();
    loadInventory();
  }, []);

  useEffect(() => {
    loadInventory();
  }, [selectedProduct]);

  const loadProducts = async () => {
    try {
      const response = await fetchProducts();
      if (response && response.success && Array.isArray(response.data)) {
        setProducts(response.data);
      }
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  const loadInventory = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (selectedProduct) {
        params.product_id = parseInt(selectedProduct);
      }
      const response = await getInventorySummary(params);
      if (response && response.success && Array.isArray(response.data)) {
        setInventory(response.data);
      } else {
        setInventory([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load inventory.');
      setInventory([]);
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
      }}
    >
      <Card
        sx={{
          backgroundColor: '#0f1f33',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2}>
            <Grid container spacing={2} alignItems="center" justifyContent="space-between">
              <Grid item>
                <Typography variant="h4" fontWeight={600} sx={{ color: '#e5e7eb' }}>
            Inventory
          </Typography>
              </Grid>
              <Grid item>
                <TextField
                  select
                  label="Filter by Product"
                  size="small"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  sx={{
                    minWidth: 250,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#0b1c2d',
                      color: '#e5e7eb',
                    },
                    '& .MuiInputLabel-root': {
                      color: '#9ca3af',
                    },
                    '& .MuiSelect-icon': {
                      color: '#9ca3af',
                    },
                  }}
                  SelectProps={{
                    sx: { color: '#e5e7eb' },
                    displayEmpty: true,
                    renderValue: (selected) => {
                      if (!selected) {
                        return <em style={{ color: '#9ca3af' }}>All Products</em>;
                      }
                      const product = products.find((p) => p.product_id === parseInt(selected));
                      return product ? product.product_name : '';
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>All Products</em>
                  </MenuItem>
                  {products.map((product) => (
                    <MenuItem key={product.product_id} value={product.product_id}>
                      {product.product_name} (ID: {product.product_id})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            {error && (
              <Alert severity="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer
                component={Paper}
                sx={{
                  backgroundColor: '#0b1624',
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ backgroundColor: '#0b1624', color: '#9ca3af', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        Product
                      </TableCell>
                      <TableCell sx={{ backgroundColor: '#0b1624', color: '#9ca3af', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        Batch
                      </TableCell>
                      <TableCell sx={{ backgroundColor: '#0b1624', color: '#9ca3af', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        Current Stock
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inventory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4, color: '#9ca3af' }}>
                          No inventory data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      inventory.map((item, index) => (
                        <TableRow
                          key={index}
                          sx={{
                            '&:hover': { backgroundColor: alpha('#22d3ee', 0.05) },
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          <TableCell sx={{ color: '#e5e7eb', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            {item.product_name || `Product ID: ${item.product_id}`}
                          </TableCell>
                          <TableCell sx={{ color: '#e5e7eb', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            {item.batch_name || (item.batch_id ? `Batch ID: ${item.batch_id}` : 'N/A')}
                          </TableCell>
                          <TableCell sx={{ color: '#22d3ee', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            {item.current_stock ?? item.quantity ?? 0}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
        </Stack>
      </CardContent>
    </Card>
    </Box>
  );
}

export default Inventory;




