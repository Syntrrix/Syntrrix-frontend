import { useState, useEffect, useRef } from 'react';
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
  Alert,
  CircularProgress,
  Divider,
  Autocomplete,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useAuth } from '../../../context/AuthContext';
import { useThemeContext } from '../../../context/ThemeContext';
import { createPurchase } from '../../../api/purchases';
import { fetchProducts } from '../../../api/products';
import { fetchSuppliers } from '../../../api/suppliers';  
import Swal from 'sweetalert2';

function NewPurchase() {
  const { user } = useAuth();
  const { isDark } = useThemeContext();
  const invoiceDateRef = useRef(null);
  // Form state
  const [formData, setFormData] = useState({
    supplier: '',
    invoiceNumber: '',
    invoiceDate: '',
    invoiceFile: null,
  });

  // Dynamic rows state
  const [rows, setRows] = useState([
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

  // Dropdown data
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');
  const [netTotal, setNetTotal] = useState(0);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Recalculate total when rows change
  useEffect(() => {
    calculateTotal();
  }, [rows]);

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      // Get seller_user_id from authenticated user
      const sellerUserId = user?.id || null;
      
      if (!sellerUserId) {
        setError('Seller user ID not found. Please login again.');
        setLoadingData(false);
        return;
      }

      // Load products and suppliers from API
      // Pass seller_user_id to fetch only products belonging to this seller
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

      // Set products - API returns { success: true, count: number, data: [...] }
      // Only products belonging to the current seller will be shown
      if (productsRes && productsRes.success && Array.isArray(productsRes.data)) {
        setProducts(productsRes.data);
      } else {
        console.warn('Products not loaded correctly:', productsRes);
        setProducts([]);
        // Show info message (not error) since backend can create products
        if (productsRes && !productsRes.success) {
          console.info('Products API returned error, but you can still enter product names - backend will create them if needed.');
        }
      }

      // Set suppliers - API returns { success: true, count: number, data: [...] }
      if (suppliersRes && suppliersRes.success && Array.isArray(suppliersRes.data)) {
        const supplierList = suppliersRes.data.map((supplier) => ({
          id: supplier.supplier_id,
          name: supplier.supplier_name,
        }));
        setSuppliers(supplierList);
      } else {
        console.warn('Suppliers not loaded correctly:', suppliersRes);
        setSuppliers([]);
        // Show error if suppliers fail to load (they're required for purchase)
        if (suppliersRes && !suppliersRes.success) {
          setError('Error: Suppliers could not be loaded. Please refresh the page.');
        }
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      setProducts([]);
      setSuppliers([]);
    } finally {
      setLoadingData(false);
    }
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleRowChange = (rowId, field, value) => {
    setRows((prevRows) =>
      prevRows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
  };

  const addRow = () => {
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
    setRows((prevRows) => [...prevRows, newRow]);
  };

  const removeRow = (rowId) => {
    if (rows.length > 1) {
      setRows((prevRows) => prevRows.filter((row) => row.id !== rowId));
    }
  };

  const calculateTotal = () => {
    let total = 0;
    rows.forEach((row) => {
      const purchasePrice = parseFloat(row.purchasePrice) || 0;
      const sellingPrice = parseFloat(row.sellingPrice) || 0;
      const quantity = parseFloat(row.quantity) || 0;
      const gst = parseFloat(row.gst) || 0; // GST is optional, default to 0
      const lineTotal = sellingPrice * quantity * (1 + gst / 100);
      total += lineTotal;
    });
    setNetTotal(total);
  };

  const handleRecalculate = () => {
    calculateTotal();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, invoiceFile: file }));
    }
  };

  const handleClear = () => {
    setFormData({
      supplier: '',
      invoiceNumber: '',
      invoiceDate: '',
      invoiceFile: null,
    });
    setRows([
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
    setError('');
    setNetTotal(0);
  };

  // Format invoice date as YYYY-MM-DD for API
  const formatInvoiceDate = (value) => {
    if (!value) return value;

    // If already in YYYY-MM-DD format, return as is
    if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return value;
    }

    // If in dd/mm/yyyy format, convert to YYYY-MM-DD
    if (value.includes('/')) {
      const [day, month, year] = value.split('/');
      if (year && month && day) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    // Expecting browser date input format: yyyy-mm-dd
    const [year, month, day] = value.split('-');
    if (year && month && day) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return value;
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.supplier) {
      setError('Please select a supplier');
      return;
    }
    if (!formData.invoiceNumber) {
      setError('Please enter invoice number');
      return;
    }
    if (!formData.invoiceDate) {
      setError('Please enter invoice date');
      return;
    }

    // Validate rows (GST is optional)
    const invalidRows = rows.filter(
      (row) =>
        !row.product ||
        !row.batch ||
        !row.purchasePrice ||
        !row.sellingPrice ||
        !row.quantity
    );

    if (invalidRows.length > 0) {
      setError('Please fill all required fields in all rows (Product, Batch, Purchase Price, Selling Price, Quantity)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Note: Products don't need to be loaded - backend can auto-create them
      // Batches can be entered manually as text (batch name or ID) - backend accepts them as strings
      // So we'll allow submission even if products aren't loaded
      
      // Only warn if products aren't loaded (for better UX, but not blocking)
      if (!products || products.length === 0) {
        console.warn('Products not loaded from API. Backend will handle product creation if needed.');
      }

      // Prepare items array for the API
      // Match API_PURCHASE_PAYLOAD: each item must have numeric product and batch IDs
      const items = rows.map((row, index) => {
        // Resolve product: allow entering either product ID (number) or product name (text)
        const productValue = String(row.product || '').trim();
        if (!productValue) {
          throw new Error(`Product is required for row ${index + 1}`);
        }

        let productId = null;
        let productNameForCreate = null;
        const productIdNum = parseInt(productValue);
        
        if (!isNaN(productIdNum) && productIdNum > 0) {
          // User entered a numeric value. Try to map to known products; if not present, treat as new product name.
          if (products && products.length > 0) {
            const existingById = products.find((p) => Number(p.product_id) === productIdNum);
            if (existingById) {
              productId = existingById.product_id;
            } else {
              // Numeric input but not found locally -> allow backend to create using this as product_name
              productNameForCreate = productValue;
            }
          } else {
            // Products not loaded -> allow backend to create using this as product_name
            productNameForCreate = productValue;
          }
        } else {
          // User entered a product name - try to find a matching product and use its ID; if not found, allow creation
          if (products && products.length > 0) {
            const existingProduct = products.find(
              (p) =>
                p.product_name &&
                p.product_name.trim().toLowerCase() === productValue.toLowerCase(),
            );
            if (existingProduct) {
              productId = existingProduct.product_id;
            } else {
              // Not in master list: allow backend to auto-create using product_name
              productNameForCreate = productValue;
            }
          } else {
            // Products not loaded: still allow backend to auto-create with product_name
            productNameForCreate = productValue;
          }
        }

        // Resolve batch: accept manual entry (batch name or ID as string)
        // Backend accepts batch as string and converts it to batch_name internally
        const batchValue = String(row.batch || '').trim();
        if (!batchValue) {
          throw new Error(`Batch is required for row ${index + 1}`);
        }

        // Send batch as-is (string) - backend will handle it as batch_name
        // No need to validate against loaded batches - user can enter any batch identifier manually

        // Validate and parse numeric values
        const purchasePrice = parseFloat(String(row.purchasePrice || '').trim());
        const sellingPrice = parseFloat(String(row.sellingPrice || '').trim());
        const mrpValue = String(row.mrp || '').trim();
        const mrp = mrpValue !== '' ? parseFloat(mrpValue) : null;
        const quantity = parseInt(String(row.quantity || '').trim());
        const gstValue = String(row.gst || '').trim();
        const gst = gstValue !== '' ? parseFloat(gstValue) : 0;

        // Validate numeric values
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

        // Build item object according to API documentation
        // API expects batch_name, purchase_price, selling_price, mrp (optional), quantity, and gst
        const item = {
          batch_name: batchValue, // Batch name as per API documentation (POST /purchases/)
          purchase_price: Number(purchasePrice),
          selling_price: Number(sellingPrice),
          quantity: Number(quantity),
          gst: Number(gst) || 0, // Ensure GST is a number, default to 0
        };

        // Add MRP only if provided (it's optional according to API documentation)
        if (mrp !== null && !isNaN(mrp) && mrp > 0) {
          item.mrp = Number(mrp);
        }

        // Attach product identifier: prefer ID; otherwise provide product_name so backend can create
        // When creating new product, include seller_user_id to ensure it's created for the current seller
        if (productId) {
          item.product = Number(productId);
        } else if (productNameForCreate) {
          item.product_name = productNameForCreate;
          // Include seller_user_id when creating new product to ensure it belongs to current seller
          if (user?.id) {
            item.seller_user_id = user.id;
          }
        }

        // Validate item has required product reference
        if (!item.product && !item.product_name) {
          throw new Error(`Product is required in row ${index + 1}. Please enter a product ID or name.`);
        }
        if (!item.batch_name || item.batch_name.trim() === '') {
          throw new Error(`Batch is required in row ${index + 1}.`);
        }

        return item;
      });

      // Validate supplier ID
      const supplierId = parseInt(formData.supplier);
      if (isNaN(supplierId) || supplierId <= 0) {
        throw new Error('Invalid supplier selected. Please select a valid supplier.');
      }

      // Validate items array is not empty
      if (!items || items.length === 0) {
        throw new Error('No items to save. Please add at least one item.');
      }

      // Prepare the purchase payload with items array (single API call)
      const purchaseData = {
        supplier: supplierId,
        invoice_number: formData.invoiceNumber.trim(),
        invoice_date: formatInvoiceDate(formData.invoiceDate),
        items: items,
      };

      // Include invoice file (File object) if provided
      if (formData.invoiceFile) {
        purchaseData.invoice_file = formData.invoiceFile;
      }

      // Validate invoice date format
      if (!purchaseData.invoice_date || !purchaseData.invoice_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error('Invalid invoice date format. Please enter a valid date.');
      }

      // Validate invoice number is not empty
      if (!purchaseData.invoice_number || purchaseData.invoice_number.trim() === '') {
        throw new Error('Invoice number is required.');
      }

      // Log the data being sent (for debugging)
      console.log('Sending purchase data:', JSON.stringify(purchaseData, null, 2));
      console.log('Purchase data items:', purchaseData.items.map((item, idx) => ({
        index: idx + 1,
        product: item.product || 'NOT SET',
        product_name: item.product_name || 'NOT SET',
        batch_name: item.batch_name || 'NOT SET',
        purchase_price: item.purchase_price,
        selling_price: item.selling_price,
        mrp: item.mrp || 'NOT SET',
        quantity: item.quantity,
        gst: item.gst,
      })));

      // Make single API call with items array
      const response = await createPurchase(purchaseData);

      // Log the response (for debugging)
      console.log('Purchase API response:', response);

      // Validate API response
      if (!response) {
        throw new Error('No response received from server. Please try again.');
      }

      if (response.success === false) {
        // Handle API error response - extract error message properly
        let errorMsg = 'Failed to save purchase entries.';
        
        if (response.message) {
          errorMsg = typeof response.message === 'string' ? response.message : JSON.stringify(response.message);
        } else if (response.errors) {
          // Extract error message from errors object
          if (typeof response.errors === 'string') {
            errorMsg = response.errors;
          } else if (Array.isArray(response.errors)) {
            errorMsg = response.errors.map(e => {
              if (typeof e === 'string') return e;
              if (typeof e === 'object') return JSON.stringify(e);
              return String(e);
            }).join(', ');
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

      // Success - show success message
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: response.message || 'Purchase entries saved successfully.',
        confirmButtonColor: '#0ea5e9',
      });

      handleClear();
    } catch (err) {
      // Extract error message from various error types
      let errorMessage = 'Failed to save purchase entries.';
      
      // Helper function to extract error message from nested objects (handles DRF validation errors)
      const extractErrorMessage = (errorObj, depth = 0) => {
        // Prevent infinite recursion
        if (depth > 5) {
          return 'Validation error (too deeply nested)';
        }
        
        if (errorObj === null || errorObj === undefined) {
          return null;
        }
        
        if (typeof errorObj === 'string') {
          return errorObj;
        }
        
        if (typeof errorObj === 'number' || typeof errorObj === 'boolean') {
          return String(errorObj);
        }
        
        if (Array.isArray(errorObj)) {
          if (errorObj.length === 0) return null;
          const messages = errorObj
            .map(e => extractErrorMessage(e, depth + 1))
            .filter(msg => msg && msg !== 'Unknown error' && msg !== null);
          return messages.length > 0 ? messages.join(', ') : null;
        }
        
        if (typeof errorObj === 'object') {
          // Handle DRF nested error structure: { "field": ["error1", "error2"] } or { "field": { "nested": ["error"] } }
          const keys = Object.keys(errorObj);
          if (keys.length === 0) return null;
          
          const messages = [];
          for (const key of keys) {
            const value = errorObj[key];
            const extracted = extractErrorMessage(value, depth + 1);
            if (extracted) {
              // Format: "field: error message" or just "error message" if key is numeric (array index)
              if (isNaN(parseInt(key))) {
                messages.push(`${key}: ${extracted}`);
              } else {
                messages.push(extracted);
              }
            }
          }
          
          return messages.length > 0 ? messages.join('; ') : null;
        }
        
        return String(errorObj);
      };
      
      // Log the full error for debugging
      console.error('Purchase submission error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      
      if (err.response && err.response.data) {
        // Axios error with response
        const apiError = err.response.data;
        const status = err.response.status;
        
        console.error('API Error Response:', JSON.stringify(apiError, null, 2));
        
        // Handle different error response structures
        if (apiError.errors) {
          // DRF validation errors: { "errors": { "field": ["error"], "items": [{ "field": ["error"] }] } }
          const extracted = extractErrorMessage(apiError.errors);
          if (extracted) {
            errorMessage = extracted;
          } else {
            errorMessage = 'Validation error occurred. Please check all fields.';
          }
        } else if (apiError.message) {
          errorMessage = extractErrorMessage(apiError.message) || apiError.message;
        } else if (apiError.error) {
          errorMessage = extractErrorMessage(apiError.error) || String(apiError.error);
        } else if (apiError.detail) {
          errorMessage = extractErrorMessage(apiError.detail) || String(apiError.detail);
        } else if (typeof apiError === 'string') {
          errorMessage = apiError;
        } else {
          // Try to extract from the entire error object
          const extracted = extractErrorMessage(apiError);
          if (extracted) {
            errorMessage = extracted;
          } else {
            errorMessage = `Server error (Status: ${status}). Please check the console for details.`;
          }
        }
      } else if (err.message) {
        // Standard Error object
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else {
        // Last resort - try to extract from error object
        const extracted = extractErrorMessage(err);
        errorMessage = extracted || 'An unexpected error occurred. Please try again.';
      }
      
      // Ensure we have a valid error message
      if (!errorMessage || errorMessage.trim() === '') {
        errorMessage = 'An unexpected error occurred. Please try again.';
      }

      setError(errorMessage);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#d32f2f',
        width: '600px',
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
      }}
    >
      <Card
        sx={{
          backgroundColor: '#020617',
          borderRadius: 2,
          border: '1px solid rgba(148, 163, 184, 0.25)',
          boxShadow: '0 20px 45px rgba(15,23,42,0.85)',
          p: { xs: 2, md: 3 },
        }}
      >
        <Grid container spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Grid item>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#e5e7eb' }}>
              New Purchase Entry
            </Typography>
          </Grid>
          {/* <Grid item>
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
              Add supplier invoice details and line items
            </Typography>
          </Grid> */}
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
              {/* Invoice / Header section */}
              <Typography
                variant="subtitle2"
                sx={{ color: '#9ca3af', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                Invoice Details
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    fullWidth
                    value={formData.supplier}
                    onChange={(e) => handleFormChange('supplier', e.target.value)}
                    size="small"
                    required
                    placeholder="Add Supplier"
                    InputLabelProps={{ sx: { color: '#9ca3af' } }}
                    SelectProps={{
                      sx: { color: '#e5e7eb' },
                      displayEmpty: true,
                      renderValue: (selected) => {
                        if (!selected) {
                          return <em style={{ color: '#9ca3af' }}>Add Supplier</em>;
                        }
                        const supplier = suppliers.find((s) => s.id === parseInt(selected));
                        return supplier ? supplier.name : '';
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#0f2339',
                        borderRadius: 1,
                      },
                    }}
                  >
                    <MenuItem value="" disabled>
                      <em>Add Supplier</em>
                    </MenuItem>
                    {suppliers.map((supplier) => (
                      <MenuItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    // label="Invoice No"
                    placeholder="Invoice No"
                    value={formData.invoiceNumber}
                    onChange={(e) => handleFormChange('invoiceNumber', e.target.value)}
                    size="small"
                    required
                    InputLabelProps={{ sx: { color: '#9ca3af' } }}
                    InputProps={{
                      sx: {
                        color: '#e5e7eb',
                        backgroundColor: '#0f2339',
                        borderRadius: 1,
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Invoice Date"
                    type="date"
                    value={formData.invoiceDate}
                    onChange={(e) => handleFormChange('invoiceDate', e.target.value)}
                    size="small"
                    required
                    InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                    InputProps={{
                      inputRef: invoiceDateRef,
                      sx: {
                        color: '#e5e7eb',
                        backgroundColor: '#0f2339',
                        borderRadius: 1,
                        pr: 0,
                        // Hide the native calendar icon so only our custom icon is visible
                        '& input[type="date"]::-webkit-calendar-picker-indicator': {
                          display: 'none',
                        },
                      },
                      endAdornment: (
                        <IconButton
                          size="small"
                          sx={{ color: '#9ca3af' }}
                          onClick={() => {
                            if (invoiceDateRef.current) {
                              // Prefer modern showPicker when available
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

              <Divider sx={{ my: 2, borderColor: 'rgba(148, 163, 184, 0.4)' }} />

              {/* Items, File Upload & Summary Section */}
              <Grid container spacing={2}>
                {/* Line Items */}
                <Grid item xs={12}>
                  {/* <Typography
                    variant="subtitle2"
                    sx={{ color: '#9ca3af', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    Line Items
                  </Typography> */}

                  {/* Column headers for better readability on desktop */}
                  <Box
                    sx={{
                      display: { xs: 'none', md: 'block' },
                      mb: 1,
                      px: 1,
                    }}
                  >
                    <Grid container spacing={1} sx={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                      <Grid item md={4.5}>
                        Product
                      </Grid>
                      <Grid item md={1.5}>
                        Batch
                      </Grid>
                      <Grid item md={1.3}>
                        P. Price
                      </Grid>
                      <Grid item md={1.3}>
                        S. Price
                      </Grid>
                      <Grid item md={1.3}>
                        MRP
                      </Grid>
                      <Grid item md={0.8}>
                        Qty
                      </Grid>
                      <Grid item md={0.8}>
                        GST %
                      </Grid>
                      <Grid item md={0.5} sx={{ textAlign: 'center' }}>
                        Action
                      </Grid>
                    </Grid>
                  </Box>

                  {rows.map((row) => (
                    <Box
                      key={row.id}
                      sx={{
                        mb: 1.5,
                        p: 1,
                        borderRadius: 1.5,
                        background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.6))',
                        border: '1px solid rgba(148,163,184,0.25)',
                      }}
                    >
                      <Grid container spacing={1} alignItems="center">
                        <Grid item xs={12} md={4.5}>
                          <Autocomplete
                            freeSolo
                            options={products.map((product) => ({
                              id: product.product_id,
                              label: `${product.product_name} (ID: ${product.product_id})`,
                              name: product.product_name,
                            }))}
                            value={(() => {
                              // Find matching product if row.product matches an existing product
                              if (row.product && products.length > 0) {
                                const productIdNum = parseInt(row.product);
                                const foundProduct = products.find((p) => {
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
                              // Return string value for free text entry
                              return row.product || '';
                            })()}
                            onChange={(event, newValue) => {
                              if (typeof newValue === 'string') {
                                // User typed a new product name
                                handleRowChange(row.id, 'product', newValue);
                              } else if (newValue && typeof newValue === 'object' && newValue.name) {
                                // User selected from dropdown
                                handleRowChange(row.id, 'product', newValue.name);
                              } else {
                                // User cleared the field
                                handleRowChange(row.id, 'product', '');
                              }
                            }}
                            onInputChange={(event, newInputValue, reason) => {
                              // Only update on direct input, not on selection
                              if (reason === 'input') {
                                handleRowChange(row.id, 'product', newInputValue || '');
                              } else if (reason === 'clear') {
                                handleRowChange(row.id, 'product', '');
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
                                placeholder={products.length > 0 ? 'Select or enter product name' : 'Enter product name'}
                                size="small"
                                
                                required
                                fullWidth
                                InputProps={{
                                  ...params.InputProps,
                                  sx: { color: '#e5e7eb', backgroundColor: '#020617', borderRadius: 1 },
                                }}
                                InputLabelProps={{ sx: { color: '#9ca3af' } }}
                              />
                            )}
                            sx={{
                              width:'200px',
                              height:'50px',
                              '& .MuiAutocomplete-inputRoot': {
                                color: '#e5e7eb',
                                backgroundColor: '#020617',
                                padding: '20px',
              
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
                              '& .MuiAutocomplete-popupIndicator': {
                                color: '#9ca3af',
                              },
                              '& .MuiAutocomplete-clearIndicator': {
                                color: '#9ca3af',
                              },
                              '& .MuiAutocomplete-option': {
                                color: '#e5e7eb',
                                backgroundColor: '#020617',
                                '&:hover': {
                                  backgroundColor: '#0f2339',
                                },
                                '&[aria-selected="true"]': {
                                  backgroundColor: '#0f2339',
                                },
                              },
                              '& .MuiAutocomplete-listbox': {
                                backgroundColor: '#020617',
                                border: '1px solid rgba(148, 163, 184, 0.3)',
                              },
                            }}
                          />
                        </Grid>
                        <Grid item xs={6} md={1.5}>
                          <TextField
                            fullWidth
                            placeholder="Batch"
                            value={row.batch}
                            onChange={(e) => handleRowChange(row.id, 'batch', e.target.value)}
                            size="small"
                            required
                            InputProps={{
                              sx: {
                                color: '#e5e7eb',
                                backgroundColor: '#020617',
                                borderRadius: 1,
                              },
                            }}
                          />
                        </Grid>
                        <Grid item xs={6} md={1.3}>
                          <TextField
                            fullWidth
                            placeholder="P.Price"
                            type="number"
                            value={row.purchasePrice}
                            onChange={(e) => handleRowChange(row.id, 'purchasePrice', e.target.value)}
                            size="small"
                            required
                            InputProps={{
                              sx: { color: '#e5e7eb', backgroundColor: '#020617', borderRadius: 1 },
                            }}
                          />
                        </Grid>
                        <Grid item xs={6} md={1.3}>
                          <TextField
                            fullWidth
                            placeholder="S.Price"
                            type="number"
                            value={row.sellingPrice}
                            onChange={(e) => handleRowChange(row.id, 'sellingPrice', e.target.value)}
                            size="small"
                            required
                            InputProps={{
                              sx: { color: '#e5e7eb', backgroundColor: '#020617', borderRadius: 1 },
                            }}
                          />
                        </Grid>
                        <Grid item xs={6} md={1.3}>
                          <TextField
                            fullWidth
                            placeholder="MRP"
                            type="number"
                            value={row.mrp}
                            onChange={(e) => handleRowChange(row.id, 'mrp', e.target.value)}
                            size="small"
                            InputProps={{
                              sx: { color: '#e5e7eb', backgroundColor: '#020617', borderRadius: 1 },
                            }}
                            helperText="Optional"
                            FormHelperTextProps={{
                              sx: { color: '#9ca3af', fontSize: '0.7rem', mt: 0.5 },
                            }}
                          />
                        </Grid>
                        <Grid item xs={6} md={0.8}>
                          <TextField
                            fullWidth
                            placeholder="Qty"
                            type="number"
                            value={row.quantity}
                            onChange={(e) => handleRowChange(row.id, 'quantity', e.target.value)}
                            size="small"
                            required
                            InputProps={{
                              sx: { color: '#e5e7eb', backgroundColor: '#020617', borderRadius: 1 },
                            }}
                          />
                        </Grid>
                        <Grid item xs={6} md={0.8}>
                          <TextField
                            fullWidth
                            placeholder="GST %"
                            type="number"
                            value={row.gst}
                            onChange={(e) => handleRowChange(row.id, 'gst', e.target.value)}
                            size="small"
                            InputProps={{
                              sx: { color: '#e5e7eb', backgroundColor: '#020617', borderRadius: 1 },
                            }}
                            helperText="Optional"
                            FormHelperTextProps={{
                              sx: { color: '#9ca3af', fontSize: '0.7rem', mt: 0.5 },
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={0.5} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <IconButton
                            size="small"
                            onClick={() => removeRow(row.id)}
                            disabled={rows.length === 1}
                            sx={{
                              color: rows.length === 1 ? '#4b5563' : '#9ca3af',
                              '&:hover': {
                                backgroundColor:
                                  rows.length === 1 ? 'transparent' : 'rgba(239, 68, 68, 0.15)',
                                color: rows.length === 1 ? '#4b5563' : '#ef4444',
                              },
                            }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </Box>
                  ))}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={addRow}
                      sx={{
                        textTransform: 'none',
                        color: '#e5e7eb',
                        borderColor: 'rgba(148,163,184,0.6)',
                        '&:hover': { borderColor: '#0ea5e9', color: '#0ea5e9' },
                      }}
                    >
                      + Add Row
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleRecalculate}
                      sx={{
                        textTransform: 'none',
                        backgroundColor: '#0ea5e9',
                        '&:hover': { backgroundColor: '#0284c7' },
                      }}
                    >
                      Recalculate
                    </Button>
                  </Box>
                </Grid>

                {/* File Upload */}
                <Grid item xs={12} md={6} sx={{ mt: 3 }}>
                  <Typography variant="body2" sx={{ color: '#cbd5e1', mb: 0.5 }}>
                    Attach Invoice (images/pdf)
                  </Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    sx={{ color: '#e5e7eb', borderColor: 'rgba(255,255,255,0.2)' }}
                  >
                    Browse...
                    <input type="file" hidden accept="image/*,.pdf" onChange={handleFileChange} />
                  </Button>
                  <Typography variant="body2" sx={{ color: '#cbd5e1', ml: 1, display: 'inline-block' }}>
                    {formData.invoiceFile ? formData.invoiceFile.name : 'No files selected.'}
                  </Typography>
                </Grid>

                {/* Total and Actions */}
                <Grid item xs={12} md={6} sx={{ textAlign: { xs: 'left', md: 'right' }, mt: 3 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: '#cbd5e1', mb: 1, fontSize: '1.1rem', fontWeight: 600 }}
                  >
                    Net: ₹{netTotal.toFixed(2)}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1 }}>
                    <Button
                      variant="contained"
                      onClick={handleSubmit}
                      disabled={loading}
                      sx={{
                        textTransform: 'none',
                        backgroundColor: '#0ea5e9',
                        '&:hover': { backgroundColor: '#0284c7' },
                      }}
                    >
                      {loading ? 'Saving...' : 'Save Purchase'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleClear}
                      disabled={loading}
                      sx={{
                        textTransform: 'none',
                        borderRadius: '24px',
                        color: isDark ? '#e5e7eb' : '#0f172a',
                        borderColor: isDark ? 'rgba(148,163,184,0.6)' : '#cbd5e1',
                        '&:hover': { borderColor: '#ef4444', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.08)' },
                      }}
                    >
                      Clear
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

export default NewPurchase;
