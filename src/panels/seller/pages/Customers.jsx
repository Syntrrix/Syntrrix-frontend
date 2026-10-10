import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  Grid,
  MenuItem,
  TextField,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Stack,
  Pagination,
  InputAdornment,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import {
  createCustomer,
  fetchCustomers,
  updateCustomer,
} from '../../../api/customers';
import Swal from 'sweetalert2';

function Customers() {
  // State for customers list
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  // State for modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Form validation errors state
  const [validationErrors, setValidationErrors] = useState({
    mobile_number: '',
    whatsapp_number: '',
  });

  // Form data state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    mobile_number: '',
    whatsapp_number: '',
    address: '',
  });

  // Load customers on component mount
  useEffect(() => {
    loadCustomers();
  }, []);

  // Reset page to 1 when search term changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  // Filter customers based on search term
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      if (!searchTerm.trim()) {
        return true;
      }
      const searchLower = searchTerm.toLowerCase().trim();
      const customerName = (customer.full_name || '').toLowerCase();
      const mobileNumber = (customer.mobile_number || '').toString();
      
      return (
        customerName.includes(searchLower) ||
        mobileNumber.includes(searchTerm.trim())
      );
    });
  }, [customers, searchTerm]);

  // Calculate paginated data
  const paginatedCustomers = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredCustomers.slice(startIndex, endIndex);
  }, [filteredCustomers, page, rowsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredCustomers.length / rowsPerPage);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    // For phone number and WhatsApp number, only allow digits and limit to 10
    if (name === 'mobile_number' || name === 'whatsapp_number') {
      // Remove all non-digit characters
      processedValue = value.replace(/\D/g, '');
      // Limit to 10 digits
      processedValue = processedValue.slice(0, 10);
    }
    
    setFormData({ ...formData, [name]: processedValue });
    setError('');
    
    // Clear validation error for the field being edited
    if (validationErrors[name]) {
      setValidationErrors({ ...validationErrors, [name]: '' });
    }
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    // Validate phone number - must be 10 digits
    const phoneDigits = formData.mobile_number ? formData.mobile_number.replace(/\D/g, '') : '';
    if (phoneDigits.length !== 10) {
      errors.mobile_number = 'Phone number must be exactly 10 digits';
      isValid = false;
    }

    // Validate WhatsApp number - must be 10 digits (required)
    const whatsappDigits = formData.whatsapp_number ? formData.whatsapp_number.replace(/\D/g, '') : '';
    if (whatsappDigits.length !== 10) {
      errors.whatsapp_number = 'WhatsApp number must be exactly 10 digits';
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      mobile_number: '',
      whatsapp_number: '',
      address: '',
    });
    setError('');
    setValidationErrors({
      mobile_number: '',
      whatsapp_number: '',
    });
    setSelectedCustomer(null);
  };

  const handleAddCustomer = () => {
    resetForm();
    setAddModalOpen(true);
  };

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer);
    setViewModalOpen(true);
  };

  const handleEditCustomer = (customer) => {
    setFormData({
      full_name: customer.full_name || '',
      email: customer.email || '',
      mobile_number: customer.mobile_number || '',
      whatsapp_number: customer.whatsapp_number || '',
      address: customer.address || '',
    });
    setValidationErrors({
      mobile_number: '',
      whatsapp_number: '',
    });
    setSelectedCustomer(customer);
    setEditModalOpen(true);
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    // Validate form before submitting
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Prepare payload
      const payload = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        mobile_number: formData.mobile_number.trim(),
        address: formData.address.trim() || '',
      };

      // Add whatsapp_number if provided
      if (formData.whatsapp_number && formData.whatsapp_number.trim()) {
        payload.whatsapp_number = formData.whatsapp_number.trim();
      }

      if (selectedCustomer) {
        // Update existing customer
        const response = await updateCustomer(selectedCustomer.customer_id, payload);
        await Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: response.message || 'Customer updated successfully.',
          confirmButtonColor: '#0ea5e9',
        });
        setEditModalOpen(false);
      } else {
        // Create new customer
        const response = await createCustomer(payload);
        await Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: response.message || 'Customer added successfully.',
          confirmButtonColor: '#0ea5e9',
        });
        setAddModalOpen(false);
      }
      resetForm();
      loadCustomers(); // Refresh the list
    } catch (err) {
      const errorMessage = err.message || 'Failed to save customer.';
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  // Render form fields
  const renderFormFields = () => (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <TextField 
          label="Full Name" 
          name="full_name" 
          value={formData.full_name} 
          onChange={handleChange} 
          required 
          fullWidth
          InputLabelProps={{
            sx: { color: '#9ca3af', mt: 2 },
          }}
          InputProps={{
            sx: {
              color: '#e5e7eb',
              mt: 2,
              backgroundColor: '#0f2339',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(148, 163, 184, 0.3)',
              },
            },
          }}
        />
        <TextField 
          label="Email" 
          name="email" 
          type="email" 
          value={formData.email} 
          onChange={handleChange} 
          required 
          fullWidth
          InputLabelProps={{
            sx: { color: '#9ca3af' },
          }}
          InputProps={{
            sx: {
              color: '#e5e7eb',
              backgroundColor: '#0f2339',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(148, 163, 184, 0.3)',
              },
            },
          }}
        />
        <TextField 
          label="Phone Number" 
          name="mobile_number" 
          value={formData.mobile_number} 
          onChange={handleChange} 
          required 
          fullWidth
          inputMode="numeric"
          error={!!validationErrors.mobile_number}
          helperText={validationErrors.mobile_number}
          InputLabelProps={{
            sx: { color: '#9ca3af' },
          }}
          InputProps={{
            sx: {
              color: '#e5e7eb',
              backgroundColor: '#0f2339',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(148, 163, 184, 0.3)',
              },
            },
          }}
          FormHelperTextProps={{
            sx: { color: '#ef4444' },
          }}
        />
        <TextField 
          label="WhatsApp Number" 
          name="whatsapp_number" 
          value={formData.whatsapp_number} 
          onChange={handleChange} 
          required
          fullWidth
          inputMode="numeric"
          error={!!validationErrors.whatsapp_number}
          helperText={validationErrors.whatsapp_number}
          InputLabelProps={{
            sx: { color: '#9ca3af' },
          }}
          InputProps={{
            sx: {
              color: '#e5e7eb',
              backgroundColor: '#0f2339',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(148, 163, 184, 0.3)',
              },
            },
          }}
          FormHelperTextProps={{
            sx: { color: '#ef4444' },
          }}
        />
        <TextField 
          label="Address" 
          name="address" 
          multiline 
          rows={3} 
          value={formData.address} 
          onChange={handleChange} 
          fullWidth
          InputLabelProps={{
            sx: { color: '#9ca3af' },
          }}
          InputProps={{
            sx: {
              color: '#e5e7eb',
              backgroundColor: '#0f2339',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(148, 163, 184, 0.3)',
              },
            },
          }}
        />
      </Stack>
    </form>
  );

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
        {/* Header with Add Button */}
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
            Customers
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddCustomer}
            sx={{
              textTransform: 'none',
              px: 3,
              backgroundColor: '#0ea5e9',
              '&:hover': { backgroundColor: '#0284c7' },
            }}
          >
            Add Customer
          </Button>
        </Box>

        {/* Search Bar */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexShrink: 0 }}>
          <TextField
            fullWidth
            placeholder="Search by Customer Name or Phone Number..."
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

        {/* Customers Table */}
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
          <Table stickyHeader>
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
                  Created Date
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: '#1e293b',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  Customer Name
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: '#1e293b',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  Address
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: '#1e293b',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  Mobile Number
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: '#1e293b',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  Email
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
              {loadingCustomers ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={40} sx={{ color: '#0ea5e9' }} />
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: '#9ca3af' }}>
                    No customers found
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#9ca3af' }}>
                    No customers match your search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((customer) => (
                  <TableRow
                    key={customer.customer_id}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(148, 163, 184, 0.05)',
                      },
                      borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                    }}
                  >
                    <TableCell sx={{ color: '#e5e7eb' }}>
                      {formatDate(customer.created_at)}
                    </TableCell>
                    <TableCell sx={{ color: '#e5e7eb' }}>
                      {customer.full_name || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ color: '#e5e7eb' }}>
                      {customer.address || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ color: '#e5e7eb' }}>
                      {customer.mobile_number || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ color: '#e5e7eb' }}>
                      {customer.email || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleViewCustomer(customer)}
                          sx={{
                            color: '#0ea5e9',
                            '&:hover': {
                              backgroundColor: 'rgba(14, 165, 233, 0.1)',
                            },
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleEditCustomer(customer)}
                          sx={{
                            color: '#10b981',
                            '&:hover': {
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            },
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        </Box>

        {/* Pagination */}
        {!loadingCustomers && filteredCustomers.length > 0 && (
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

        {/* Add Customer Modal */}
        <Dialog
          open={addModalOpen}
          onClose={() => {
            setAddModalOpen(false);
            resetForm();
          }}
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
            }}
          >
            Add Customer
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
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}
            {renderFormFields()}
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1 }}>
            <Button
              onClick={() => {
                setAddModalOpen(false);
                resetForm();
              }}
              sx={{ color: '#9ca3af', textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              variant="contained"
              size="large"
              sx={{
                textTransform: 'none',
                backgroundColor: '#0ea5e9',
                '&:hover': { backgroundColor: '#0284c7' },
              }}
            >
              {loading ? 'Creating Customer...' : 'Create Customer'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Customer Modal */}
        <Dialog
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            resetForm();
          }}
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
            }}
          >
            Edit Customer
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
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}
            {renderFormFields()}
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1 }}>
            <Button
              onClick={() => {
                setEditModalOpen(false);
                resetForm();
              }}
              sx={{ color: '#9ca3af', textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              variant="contained"
              size="large"
              sx={{
                textTransform: 'none',
                backgroundColor: '#0ea5e9',
                '&:hover': { backgroundColor: '#0284c7' },
              }}
            >
              {loading ? 'Updating Customer...' : 'Update Customer'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Customer Modal */}
        <Dialog
          open={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedCustomer(null);
          }}
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
            Customer Details
            <IconButton
              onClick={() => {
                setViewModalOpen(false);
                setSelectedCustomer(null);
              }}
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
              overflowY: 'auto',
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {selectedCustomer && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Row 1: Full Name (left) | Email (right) */}
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#9ca3af', 
                        mb: 0.75,
                        mt: 2,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Full Name
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: '#e5e7eb',
                        fontSize: '0.9375rem',
                        fontWeight: 500,
                      }}
                    >
                      {selectedCustomer.full_name || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#9ca3af', 
                        mb: 0.75,
                        mt: 2,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Email
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: '#e5e7eb',
                        fontSize: '0.9375rem',
                        fontWeight: 500,
                      }}
                    >
                      {selectedCustomer.email || 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>

                {/* Row 2: Mobile Number (left) | WhatsApp Number (right) */}
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#9ca3af', 
                        mb: 0.75,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Mobile Number
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: '#e5e7eb',
                        fontSize: '0.9375rem',
                        fontWeight: 500,
                      }}
                    >
                      {selectedCustomer.mobile_number || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#9ca3af', 
                        mb: 0.75,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      WhatsApp Number
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: '#e5e7eb',
                        fontSize: '0.9375rem',
                        fontWeight: 500,
                      }}
                    >
                      {selectedCustomer.whatsapp_number || 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>

                {/* Row 3: Address (full width) */}
                <Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#9ca3af', 
                      mb: 0.75,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Address
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: '#e5e7eb',
                      fontSize: '0.9375rem',
                      fontWeight: 500,
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedCustomer.address || 'N/A'}
                  </Typography>
                </Box>

                {/* Row 4: GST Number (full width) */}
                <Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#9ca3af', 
                      mb: 0.75,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    GST Number
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: '#e5e7eb',
                      fontSize: '0.9375rem',
                      fontWeight: 500,
                    }}
                  >
                    {selectedCustomer.gst_number || 'N/A'}
                  </Typography>
                </Box>

                {/* Row 5: Created Date (full width) */}
                <Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#9ca3af', 
                      mb: 0.75,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Created Date
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: '#e5e7eb',
                      fontSize: '0.9375rem',
                      fontWeight: 500,
                    }}
                  >
                    {formatDate(selectedCustomer.created_at)}
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1 }}>
            <Button
              onClick={() => {
                setViewModalOpen(false);
                setSelectedCustomer(null);
              }}
              variant="contained"
              sx={{
                textTransform: 'none',
                backgroundColor: '#0ea5e9',
                '&:hover': { backgroundColor: '#0284c7' },
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Card>
    </Box>
  );
}

export default Customers;
