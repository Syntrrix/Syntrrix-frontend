import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  InputAdornment,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import {
  fetchCustomers,
  fetchSellerProducts,
  fetchCustomerCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  placeCustomerOrder,
} from '../../../api/customers';
import { fetchProductBatchesForCart } from '../../../api/batches';
import { getInventorySummary } from '../../../api/inventory';
import Swal from 'sweetalert2';
import CloseIcon from '@mui/icons-material/Close';

function Billing() {
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [quantityModalOpen, setQuantityModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [availableStock, setAvailableStock] = useState(null);
  const [productBatches, setProductBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [batchAvailableQuantity, setBatchAvailableQuantity] = useState(null);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingAvailableStock, setLoadingAvailableStock] = useState(false);
  const [quantityError, setQuantityError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCart, setLoadingCart] = useState(false);
  const [error, setError] = useState('');

  // Load customers and products on mount
  useEffect(() => {
    loadCustomers();
    loadProducts();
  }, []);

  // Load cart when customer changes
  useEffect(() => {
    if (selectedCustomer) {
      loadCart();
    } else {
      setCartItems([]);
    }
  }, [selectedCustomer]);

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const response = await fetchCustomers();
      if (response && response.success && Array.isArray(response.data)) {
        setCustomers(response.data);
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

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await fetchSellerProducts();
      if (response && response.success && Array.isArray(response.data)) {
        setProducts(response.data);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Failed to load products. Please try again.');
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadCart = async () => {
    if (!selectedCustomer) return;
    setLoadingCart(true);
    try {
      const response = await fetchCustomerCart(parseInt(selectedCustomer));
      if (response && response.success && Array.isArray(response.data)) {
        setCartItems(response.data);
      } else {
        setCartItems([]);
      }
    } catch (err) {
      console.error('Error loading cart:', err);
      setCartItems([]);
    } finally {
      setLoadingCart(false);
    }
  };

  const handleAddToCart = async (product) => {
    if (!selectedCustomer) {
      Swal.fire({
        icon: 'warning',
        title: 'Select Customer',
        text: 'Please select a customer first.',
        confirmButtonColor: '#0ea5e9',
      });
      return;
    }
    setSelectedProduct(product);
    setQuantity(1);
    setQuantityError('');
    setSelectedBatch(null);
    setSelectedBatchId('');
    setBatchAvailableQuantity(null);
    setProductBatches([]);
    setAvailableStock(null);
    setQuantityModalOpen(true);
    
    // Load available stock and batches for the product
    const productId = product.product_id || product.id;
    if (productId) {
      loadAvailableStock(productId);
      loadProductBatches(productId);
    }
  };
  
  const loadAvailableStock = async (productId) => {
    setLoadingAvailableStock(true);
    try {
      const response = await getInventorySummary({ product_id: productId });
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
      setAvailableStock({ available: 0, unit: 'unit' });
    } finally {
      setLoadingAvailableStock(false);
    }
  };
  
  const loadProductBatches = async (productId) => {
    setLoadingBatches(true);
    try {
      const response = await fetchProductBatchesForCart(productId, 1);
      if (response && response.success && Array.isArray(response.data)) {
        // API already filters batches with available_quantity >= min_quantity
        setProductBatches(response.data || []);
      } else {
        setProductBatches([]);
      }
    } catch (err) {
      console.error('Error loading batches:', err);
      setProductBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  };
  
  const handleBatchChange = (e) => {
    const batchName = e.target.value;
    setSelectedBatchId(batchName);
    setQuantityError('');
    
    if (batchName && batchName.trim() !== '') {
      const found = productBatches.find(b => b.batch_name === batchName);
      if (found) {
        const availableQty = parseFloat(found.available_quantity) || 0;
        setSelectedBatch(found);
        setBatchAvailableQuantity(availableQty);
        // Auto-fill quantity with batch's available quantity
        setQuantity(availableQty);
      } else {
        setSelectedBatch(null);
        setBatchAvailableQuantity(null);
        setQuantity(1);
      }
    } else {
      setSelectedBatch(null);
      setBatchAvailableQuantity(null);
      setQuantity(1);
    }
  };
  
  const handleQuantityChange = (e) => {
    const value = e.target.value;
    const qty = parseFloat(value) || 0;
    
    // Validate against batch available quantity
    if (batchAvailableQuantity !== null && qty > batchAvailableQuantity) {
      setQuantityError(`Quantity cannot exceed available batch quantity (${batchAvailableQuantity.toFixed(2)})`);
      setQuantity(Math.min(qty, batchAvailableQuantity));
    } else if (qty <= 0) {
      setQuantityError('Quantity must be greater than 0');
      setQuantity(1);
    } else {
      setQuantityError('');
      setQuantity(qty);
    }
  };

  const handleCloseQuantityModal = () => {
    setQuantityModalOpen(false);
    setSelectedProduct(null);
    setQuantity(1);
    setAvailableStock(null);
    setProductBatches([]);
    setSelectedBatch(null);
    setSelectedBatchId('');
    setBatchAvailableQuantity(null);
    setQuantityError('');
  };

  const handleConfirmAddToCart = async () => {
    if (!selectedProduct || !selectedCustomer || quantity <= 0) {
      setQuantityError('Please enter a valid quantity');
      return;
    }
    
    // Validate batch selection
    if (!selectedBatchId || selectedBatchId.trim() === '') {
      setQuantityError('Please select a batch');
      return;
    }
    
    // Validate quantity against batch available quantity
    if (batchAvailableQuantity !== null && quantity > batchAvailableQuantity) {
      setQuantityError(`Quantity cannot exceed available batch quantity (${batchAvailableQuantity.toFixed(2)})`);
      return;
    }

    setLoading(true);
    setQuantityError('');
    try {
      const payload = {
        customer: parseInt(selectedCustomer),
        product: selectedProduct.product_id || selectedProduct.id,
        quantity: parseFloat(quantity),
        batch: selectedBatch?.batch_id || null, // Include batch_id if available
      };

      const response = await addToCart(payload);
      if (response && response.success) {
        // Close modal first
        handleCloseQuantityModal();
        // Reload cart to get updated data
        await loadCart();
        // Show success alert after modal is closed
        await Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: response.message || 'Product added to cart.',
          confirmButtonColor: '#0ea5e9',
        });
      } else {
        throw new Error(response.error || 'Failed to add product to cart.');
      }
    } catch (err) {
      // Close modal first even on error
      handleCloseQuantityModal();
      const errorMessage = err.message || 'Failed to add product to cart.';
      // Show error alert after modal is closed
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

  const handleOpenCart = () => {
    if (!selectedCustomer) {
      Swal.fire({
        icon: 'warning',
        title: 'Select Customer',
        text: 'Please select a customer first.',
        confirmButtonColor: '#0ea5e9',
      });
      return;
    }
    setCartOpen(true);
  };

  const handleCloseCart = () => {
    setCartOpen(false);
  };

  const handlePlaceOrder = async () => {
    if (!selectedCustomer) {
      Swal.fire({
        icon: 'warning',
        title: 'Select Customer',
        text: 'Please select a customer first.',
        confirmButtonColor: '#0ea5e9',
      });
      return;
    }

    if (cartItems.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Empty Cart',
        text: 'Please add products to cart before placing an order.',
        confirmButtonColor: '#0ea5e9',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customer_id: parseInt(selectedCustomer),
      };

      const response = await placeCustomerOrder(payload);
      if (response && response.success) {
        // Close cart modal first
        setCartOpen(false);
        // Clear cart
        setCartItems([]);
        // Optionally reload products to update stock
        await loadProducts();
        // Show success alert after modal is closed
        await Swal.fire({
          icon: 'success',
          title: 'Order Placed!',
          text: response.message || 'Order placed successfully.',
          confirmButtonColor: '#0ea5e9',
        });
      } else {
        throw new Error(response.error || 'Failed to place order.');
      }
    } catch (err) {
      // Close modal first even on error
      setCartOpen(false);
      const errorMessage = err.message || 'Failed to place order.';
      // Show error alert after modal is closed
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

  const handleRemoveFromCart = async (cartItem) => {
    if (!cartItem.cart_id) {
      // If no cart_id, it might be a local item - just remove from state
      setCartItems((prev) => prev.filter((item) => item !== cartItem));
      return;
    }

    // Show confirmation dialog first with high z-index to appear above modal
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Remove Product?',
      text: `Are you sure you want to remove "${cartItem.product_name || 'this product'}" from cart?`,
      showCancelButton: true,
      confirmButtonColor: '#d32f2f',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Remove',
      cancelButtonText: 'Cancel',
      zIndex: 15000, // Much higher than Material-UI modal (1300)
      allowOutsideClick: false,
      allowEscapeKey: true,
    });

    // If user cancelled, don't proceed
    if (!result.isConfirmed) {
      return;
    }

    setLoading(true);
    try {
      const response = await removeFromCart(cartItem.cart_id);
      if (response && response.success) {
        // Reload cart first
        await loadCart();
        // Show success alert after cart is reloaded
        await Swal.fire({
          icon: 'success',
          title: 'Removed',
          text: response.message || 'Product removed from cart successfully.',
          confirmButtonColor: '#0ea5e9',
        });
      } else {
        throw new Error(response.error || 'Failed to remove item from cart.');
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to remove item from cart.';
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

  const handleUpdateQuantity = async (cartItem, newQuantity) => {
    if (!cartItem.cart_id || newQuantity <= 0) return;

    setLoading(true);
    try {
      const payload = {
        cart_id: cartItem.cart_id,
        quantity: parseInt(newQuantity),
      };

      const response = await updateCartItem(payload);
      if (response && response.success) {
        // Reload cart to get updated data
        await loadCart();
      } else {
        throw new Error(response.error || 'Failed to update quantity.');
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to update quantity.';
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

  // Filter products based on search term
  const filteredProducts = products.filter((product) =>
    product.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {/* Header filter + cart icon */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, mr: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, color: '#e5e7eb', fontWeight: 600 }}
              >
                Select Customer
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                disabled={loadingCustomers}
                InputLabelProps={{ sx: { color: '#9ca3af' } }}
                SelectProps={{
                  sx: { color: '#e5e7eb' },
                  displayEmpty: true,
                  renderValue: (selected) => {
                    if (!selected) {
                      return <em style={{ color: '#9ca3af' }}>Select Customer</em>;
                    }
                    const customer = customers.find((c) => c.customer_id === parseInt(selected));
                    return customer ? customer.full_name : '';
                  },
                }}
                InputProps={{
                  sx: {
                    color: '#e5e7eb',
                    backgroundColor: '#0b1c2d',
                  },
                }}
              >
                <MenuItem value="" disabled>
                  <em>Select Customer</em>
                </MenuItem>
                {customers.map((customer) => (
                  <MenuItem key={customer.customer_id} value={customer.customer_id}>
                    {customer.full_name}
                  </MenuItem>
                ))}
                {customers.length === 0 && !loadingCustomers && (
                  <MenuItem value="" disabled>
                    No customers found
                  </MenuItem>
                )}
              </TextField>
            </Box>
            <IconButton
              onClick={handleOpenCart}
              sx={{
                backgroundColor: '#e5e7eb',
                borderRadius: 3,
                p: 1,
                position: 'relative',
                '&:hover': {
                  backgroundColor: '#ffffff',
                },
              }}
            >
              <Badge
                badgeContent={cartItems.length}
                color="error"
                overlap="circular"
              >
                <ShoppingCartIcon sx={{ color: '#1d4ed8' }} />
              </Badge>
            </IconButton>
          </Box>

          {/* Search Bar */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
            <TextField
              fullWidth
              placeholder="Search by Product Name"
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

          {/* Product table */}
          <TableContainer
            component={Paper}
            sx={{
              backgroundColor: '#0f1f33',
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.06)',
              maxHeight: '70vh',
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#9ca3af', backgroundColor: '#0f1f33', fontWeight: 600 }}>
                    Sr.No
                  </TableCell>
                  <TableCell sx={{ color: '#9ca3af', backgroundColor: '#0f1f33', fontWeight: 600 }}>
                    Product Name
                  </TableCell>
                  <TableCell sx={{ color: '#9ca3af', backgroundColor: '#0f1f33', fontWeight: 600 }}>
                    Available Stock
                  </TableCell>
                  <TableCell sx={{ color: '#9ca3af', backgroundColor: '#0f1f33', fontWeight: 600 }}>
                    MRP
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ color: '#9ca3af', backgroundColor: '#0f1f33', fontWeight: 600 }}
                  >
                    Add to Cart
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingProducts ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress size={24} />
                      <Typography variant="body2" sx={{ color: '#9ca3af', mt: 1 }}>
                        Loading products...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: '#9ca3af' }}>
                      {searchTerm ? `No products found matching "${searchTerm}"` : 'No products available'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product, index) => {
                    const availableStock = parseFloat(product.available_stock) || 0;
                    const unit = product.unit || 'unit';
                    const stockStatus = availableStock > 0 
                      ? `${availableStock.toFixed(2)} ${unit}` 
                      : 'Not Available';
                    return (
                      <TableRow key={product.product_id} hover>
                        <TableCell sx={{ color: '#e5e7eb' }}>{index + 1}</TableCell>
                        <TableCell sx={{ color: '#e5e7eb' }}>{product.product_name}</TableCell>
                        <TableCell
                          sx={{
                            color: availableStock > 0 ? '#22d3ee' : '#f97373',
                            fontWeight: 600,
                          }}
                        >
                          {stockStatus}
                        </TableCell>
                        <TableCell sx={{ color: '#e5e7eb' }}>₹{parseFloat(product.sale_price || 0).toFixed(2)}</TableCell>
                        <TableCell align="center">
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleAddToCart(product)}
                            disabled={!selectedCustomer || availableStock <= 0 || loading}
                            sx={{
                              textTransform: 'none',
                              borderRadius: 999,
                              px: 2,
                              backgroundColor: '#0ea5e9',
                              '&:hover': { backgroundColor: '#0284c7' },
                              '&:disabled': {
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                color: 'rgba(255,255,255,0.3)',
                              },
                            }}
                          >
                            + Add to cart
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add to Cart Modal */}
      <Dialog
        open={quantityModalOpen}
        onClose={handleCloseQuantityModal}
        maxWidth="sm"
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
            color: '#e5e7eb', 
            fontWeight: 600, 
            pb: 2,
            fontSize: '1.25rem',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6" fontWeight={700} sx={{ color: '#e5e7eb' }}>
            Add Product to Cart
          </Typography>
          <IconButton
            onClick={handleCloseQuantityModal}
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
            px: 3,
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {quantityError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setQuantityError('')}>
              {quantityError}
            </Alert>
          )}
          {selectedProduct && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2.5,
              }}
            >
              {/* Product Name */}
              <Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#9ca3af', 
                    mb: 1,
                    mt: 2,
                    fontSize: '0.875rem',
                    fontWeight: 400,
                  }}
                >
                  Product Name
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: '#e5e7eb',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  {selectedProduct.product_name || selectedProduct.productName || 'N/A'}
                </Typography>
              </Box>

              {/* Available Stock - Read-only */}
              <Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#9ca3af', 
                    mb: 1,
                    fontSize: '0.875rem',
                    fontWeight: 400,
                  }}
                >
                  Available Stock
                </Typography>
                <TextField
                  value={
                    loadingAvailableStock 
                      ? 'Loading...' 
                      : availableStock 
                        ? `${availableStock.available.toFixed(2)} ${availableStock.unit || selectedProduct.unit || 'unit'}` 
                        : 'N/A'
                  }
                  disabled
                  fullWidth
                  size="small"
                  InputProps={{
                    sx: {
                      color: '#ffffff',
                      backgroundColor: '#0f2339',
                      cursor: 'not-allowed',
                      '& .MuiOutlinedInput-input.Mui-disabled': {
                        WebkitTextFillColor: '#ffffff',
                        color: '#ffffff',
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(148, 163, 184, 0.3)',
                      },
                    },
                  }}
                />
              </Box>

              {/* Batch Dropdown */}
              <Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#e5e7eb', 
                    mb: 1,
                    fontSize: '0.875rem',
                    fontWeight: 400,
                  }}
                >
                  Batch <span style={{ color: '#ef4444' }}>*</span>
                </Typography>
                <TextField
                  select
                  fullWidth
                  name="batch"
                  value={selectedBatchId}
                  onChange={handleBatchChange}
                  size="small"
                  required
                  disabled={loadingBatches || !selectedProduct}
                  SelectProps={{
                    sx: { color: '#e5e7eb' },
                    displayEmpty: true,
                    renderValue: (selected) => {
                      if (!selected) {
                        return <em style={{ color: '#9ca3af' }}>Select Batch</em>;
                      }
                      return selected;
                    },
                    MenuProps: {
                      PaperProps: {
                        sx: {
                          backgroundColor: '#1e293b',
                          color: '#e5e7eb',
                        },
                      },
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#0f2339',
                      color: '#e5e7eb',
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
                >
                  <MenuItem value="">
                    <em>Select Batch</em>
                  </MenuItem>
                  {loadingBatches ? (
                    <MenuItem value="" disabled>
                      Loading batches...
                    </MenuItem>
                  ) :                     productBatches.length > 0 ? (
                    productBatches.map((batch) => {
                      const availableQty = parseFloat(batch.available_quantity) || 0;
                      const expiryInfo = batch.expiry_date 
                        ? ` | Exp: ${new Date(batch.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : '';
                      return (
                        <MenuItem key={batch.batch_id || batch.batch_name} value={batch.batch_name}>
                          {batch.batch_name} (Available: {availableQty.toFixed(2)}{expiryInfo})
                        </MenuItem>
                      );
                    })
                  ) : (
                    <MenuItem value="" disabled>
                      No batches with available stock
                    </MenuItem>
                  )}
                </TextField>
              </Box>

              {/* Quantity Field */}
              <Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#e5e7eb', 
                    mb: 1,
                    fontSize: '0.875rem',
                    fontWeight: 400,
                  }}
                >
                  Quantity <span style={{ color: '#ef4444' }}>*</span>
                </Typography>
                <TextField
                  fullWidth
                  name="quantity"
                  type="number"
                  value={quantity}
                  onChange={handleQuantityChange}
                  size="small"
                  required
                  error={!!quantityError}
                  disabled={!selectedBatchId || loading || batchAvailableQuantity === null}
                  inputProps={{
                    min: 0.01,
                    max: batchAvailableQuantity !== null ? batchAvailableQuantity : undefined,
                    step: 0.01,
                  }}
                  InputProps={{
                    sx: {
                      color: '#ffffff',
                      backgroundColor: '#0f2339',
                      borderRadius: 1,
                      '& .MuiOutlinedInput-input': {
                        color: '#ffffff',
                      },
                      '& .MuiOutlinedInput-input.Mui-disabled': {
                        WebkitTextFillColor: '#ffffff',
                        color: '#ffffff',
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: quantityError ? '#ef4444' : 'rgba(148, 163, 184, 0.3)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: quantityError ? '#ef4444' : 'rgba(148, 163, 184, 0.5)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: quantityError ? '#ef4444' : '#0ea5e9',
                      },
                    },
                  }}
                  helperText={
                    quantityError ||
                    (batchAvailableQuantity !== null
                      ? `Maximum: ${batchAvailableQuantity.toFixed(2)} ${selectedProduct.unit || 'unit'}`
                      : selectedBatchId
                        ? 'Select a batch to see available quantity'
                        : 'Please select a batch first')
                  }
                  FormHelperTextProps={{
                    sx: {
                      color: quantityError ? '#ef4444' : '#9ca3af',
                      fontSize: '0.75rem',
                    },
                  }}
                />
                {batchAvailableQuantity !== null && (
                  <Typography variant="caption" sx={{ color: '#9ca3af', mt: 0.5, display: 'block' }}>
                    Batch available quantity: {batchAvailableQuantity.toFixed(2)} {selectedProduct.unit || 'unit'}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
          <Button
            onClick={handleCloseQuantityModal}
            sx={{ 
              textTransform: 'none', 
              color: '#9ca3af',
              '&:hover': {
                color: '#e5e7eb',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmAddToCart}
            disabled={
              !quantity || 
              quantity <= 0 || 
              loading || 
              !selectedProduct || 
              !selectedBatchId ||
              (batchAvailableQuantity !== null && quantity > batchAvailableQuantity) ||
              loadingBatches
            }
            sx={{
              textTransform: 'none',
              backgroundColor: '#0ea5e9',
              '&:hover': { backgroundColor: '#0284c7' },
              '&:disabled': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            {loading ? 'Adding...' : 'Add to Cart'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cart Modal */}
      <Dialog
        open={cartOpen}
        onClose={handleCloseCart}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#0f1f33',
            color: '#e5e7eb',
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.08)',
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          Cart Items
        </DialogTitle>
        <DialogContent dividers>
          {loadingCart ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ color: '#9ca3af', ml: 2 }}>
                Loading cart...
              </Typography>
            </Box>
          ) : cartItems.length === 0 ? (
            <Typography sx={{ color: '#9ca3af', py: 2, textAlign: 'center' }}>
              No products in cart.
            </Typography>
          ) : (
            <TableContainer
              component={Paper}
              sx={{
                backgroundColor: '#0b1624',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.08)',
                maxHeight: '60vh',
                overflowX: 'auto',
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: '#9ca3af', backgroundColor: '#0b1624', fontWeight: 600 }}>
                      Sr. No.
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af', backgroundColor: '#0b1624', fontWeight: 600 }}>
                      Product Name
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af', backgroundColor: '#0b1624', fontWeight: 600 }}>
                      Batch
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af', backgroundColor: '#0b1624', fontWeight: 600 }}>
                      Quantity
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af', backgroundColor: '#0b1624', fontWeight: 600 }}>
                      Price
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af', backgroundColor: '#0b1624', fontWeight: 600 }}>
                      MRP
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af', backgroundColor: '#0b1624', fontWeight: 600 }}>
                      GST
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af', backgroundColor: '#0b1624', fontWeight: 600 }}>
                      Total
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ color: '#9ca3af', backgroundColor: '#0b1624', fontWeight: 600 }}
                    >
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cartItems.map((item, index) => {
                    // Extract batch name from batch_info or batch object
                    const batchName = item.batch_info?.batch_name || item.batch_name || item.batch?.batch_name || 'N/A';
                    
                    // Get price: prefer batch selling_price, fallback to product sale_price
                    const price = parseFloat(
                      item.batch_info?.selling_price || 
                      item.selling_price || 
                      item.sale_price || 
                      0
                    );
                    
                    // Get MRP: prefer batch mrp, fallback to product mrp
                    const mrp = parseFloat(
                      item.batch_info?.mrp || 
                      item.mrp || 
                      0
                    );
                    
                    // Get GST from product
                    const gst = parseFloat(item.gst || 0);
                    
                    // Calculate quantity
                    const quantity = parseFloat(item.quantity || 1);
                    
                    // Calculate total: Price * Quantity * (1 + GST/100)
                    const total = price * quantity * (1 + gst / 100);
                    
                    return (
                      <TableRow key={item.cart_id || index}>
                        <TableCell sx={{ color: '#e5e7eb' }}>{index + 1}</TableCell>
                        <TableCell sx={{ color: '#e5e7eb' }}>
                          {item.product_name || item.productName}
                        </TableCell>
                        <TableCell sx={{ color: '#e5e7eb' }}>
                          {batchName}
                        </TableCell>
                        <TableCell sx={{ color: '#e5e7eb' }}>
                          <TextField
                            type="number"
                            value={item.quantity || 1}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 1;
                              handleUpdateQuantity(item, newQty);
                            }}
                            size="small"
                            inputProps={{ min: 1, max: item.available_stock || 999 }}
                            sx={{
                              width: 80,
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: '#0b1c2d',
                                color: '#e5e7eb',
                              },
                              '& .MuiInputBase-input': {
                                py: 0.5,
                                textAlign: 'center',
                              },
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: '#e5e7eb' }}>₹{price.toFixed(2)}</TableCell>
                        <TableCell sx={{ color: '#e5e7eb' }}>₹{mrp.toFixed(2)}</TableCell>
                        <TableCell sx={{ color: '#e5e7eb' }}>{gst.toFixed(2)}%</TableCell>
                        <TableCell sx={{ color: '#e5e7eb' }}>₹{total.toFixed(2)}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveFromCart(item)}
                            disabled={loading}
                            sx={{
                              color: '#f97373',
                              '&:hover': {
                                backgroundColor: 'rgba(248,113,113,0.15)',
                                color: '#ef4444',
                              },
                              '&:disabled': {
                                color: 'rgba(255,255,255,0.3)',
                              },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Grand Total Row */}
                  {cartItems.length > 0 && (() => {
                    // Calculate grand total by summing all item totals
                    const grandTotal = cartItems.reduce((sum, item) => {
                      const price = parseFloat(
                        item.batch_info?.selling_price || 
                        item.selling_price || 
                        item.sale_price || 
                        0
                      );
                      const gst = parseFloat(item.gst || 0);
                      const quantity = parseFloat(item.quantity || 1);
                      const total = price * quantity * (1 + gst / 100);
                      return sum + total;
                    }, 0);
                    
                    return (
                      <TableRow
                        sx={{
                          backgroundColor: 'rgba(14, 165, 233, 0.1)',
                          borderTop: '2px solid rgba(14, 165, 233, 0.3)',
                          '& .MuiTableCell-root': {
                            borderBottom: 'none',
                          },
                        }}
                      >
                        <TableCell colSpan={7} align="right" sx={{ color: '#e5e7eb', fontWeight: 700, fontSize: '1rem' }}>
                          Grand Total:
                        </TableCell>
                        <TableCell sx={{ color: '#22d3ee', fontWeight: 700, fontSize: '1rem' }}>
                          ₹{grandTotal.toFixed(2)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    );
                  })()}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Button
            onClick={handleCloseCart}
            sx={{ textTransform: 'none', color: '#e5e7eb' }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handlePlaceOrder}
            disabled={cartItems.length === 0 || loading || !selectedCustomer}
            sx={{
              textTransform: 'none',
              backgroundColor: '#0ea5e9',
              '&:hover': { backgroundColor: '#0284c7' },
            }}
          >
            {loading ? 'Placing Order...' : 'Place Order'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Billing;


