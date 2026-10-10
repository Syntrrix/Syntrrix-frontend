import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  Alert,
  Divider,
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
  InputAdornment,
  Pagination,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import {
  createSupplier,
  fetchSuppliers,
  fetchSupplierById,
  updateSupplier,
} from '../../../api/suppliers';
import Swal from 'sweetalert2';

function Suppliers() {
  // State for suppliers list
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  // State for modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // Form validation errors state
  const [validationErrors, setValidationErrors] = useState({
    supplier_name: '',
    email_id: '',
    business_name: '',
    address: '',
    mobile_number: '',
    whatsapp_number: '',
    gst_number: '',
  });

  // Form data state
  const [formData, setFormData] = useState({
    supplier_name: '',
    email_id: '',
    mobile_number: '',
    whatsapp_number: '',
    business_name: '',
    address: '',
    gst_number: '',
  });

  // Load suppliers on component mount
  useEffect(() => {
    loadSuppliers();
  }, []);

  // Reset page to 1 when search term changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const loadSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const response = await fetchSuppliers();
      if (response && response.success && Array.isArray(response.data)) {
        setSuppliers(response.data);
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

    // Validate Supplier Name - required
    if (!formData.supplier_name || formData.supplier_name.trim() === '') {
      errors.supplier_name = 'Supplier Name is required';
      isValid = false;
    }

    // Validate Email - required and valid format
    if (!formData.email_id || formData.email_id.trim() === '') {
      errors.email_id = 'Email is required';
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email_id)) {
        errors.email_id = 'Please enter a valid email address';
        isValid = false;
      }
    }

    // Validate Company Name (Business Name) - required
    if (!formData.business_name || formData.business_name.trim() === '') {
      errors.business_name = 'Company Name is required';
      isValid = false;
    }

    // Validate Address - required
    if (!formData.address || formData.address.trim() === '') {
      errors.address = 'Address is required';
      isValid = false;
    }

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

    // Validate GST Number - required
    if (!formData.gst_number || formData.gst_number.trim() === '') {
      errors.gst_number = 'GST Number is required';
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const resetForm = () => {
    setFormData({
      supplier_name: '',
      email_id: '',
      mobile_number: '',
      whatsapp_number: '',
      business_name: '',
      address: '',
      gst_number: '',
    });
    setError('');
    setValidationErrors({
      supplier_name: '',
      email_id: '',
      business_name: '',
      address: '',
      mobile_number: '',
      whatsapp_number: '',
      gst_number: '',
    });
    setSelectedSupplier(null);
  };

  const handleAddSupplier = () => {
    resetForm();
    setAddModalOpen(true);
  };

  const handleViewSupplier = async (supplierId) => {
    try {
      const response = await fetchSupplierById(supplierId);
      if (response && response.success) {
        setSelectedSupplier(response.data);
        setViewModalOpen(true);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to fetch supplier details.',
          confirmButtonColor: '#d32f2f',
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Failed to fetch supplier details.',
        confirmButtonColor: '#d32f2f',
      });
    }
  };

  const handleEditSupplier = async (supplierId) => {
    try {
      const response = await fetchSupplierById(supplierId);
      if (response && response.success) {
        const supplier = response.data;
        setFormData({
          supplier_name: supplier.supplier_name || '',
          email_id: supplier.email_id || '',
          mobile_number: supplier.mobile_number || '',
          whatsapp_number: supplier.whatsapp_number || '',
          business_name: supplier.business_name || '',
          address: supplier.address || '',
          gst_number: supplier.gst_number || '',
        });
        setValidationErrors({
          supplier_name: '',
          email_id: '',
          business_name: '',
          address: '',
          mobile_number: '',
          whatsapp_number: '',
          gst_number: '',
        });
        setSelectedSupplier(supplier);
        setEditModalOpen(true);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to fetch supplier details.',
          confirmButtonColor: '#d32f2f',
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Failed to fetch supplier details.',
        confirmButtonColor: '#d32f2f',
      });
    }
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
      if (selectedSupplier) {
        // Update existing supplier
        const response = await updateSupplier(selectedSupplier.supplier_id, formData);
        await Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: response.message || 'Supplier updated successfully.',
          confirmButtonColor: '#0ea5e9',
        });
        setEditModalOpen(false);
      } else {
        // Create new supplier
      const response = await createSupplier(formData);
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: response.message || 'Supplier added successfully.',
        confirmButtonColor: '#0ea5e9',
      });
        setAddModalOpen(false);
      }
      resetForm();
      loadSuppliers(); // Refresh the list
    } catch (err) {
      const errorMessage = err.message || 'Failed to save supplier.';
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

  // Filter suppliers based on search term
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      if (!searchTerm.trim()) {
        return true;
      }
      const searchLower = searchTerm.toLowerCase().trim();
      const supplierName = (supplier.supplier_name || '').toLowerCase();
      const phoneNumber = (supplier.mobile_number || '').toString();
      
      return (
        supplierName.includes(searchLower) ||
        phoneNumber.includes(searchTerm.trim())
      );
    });
  }, [suppliers, searchTerm]);

  // Calculate paginated data
  const paginatedSuppliers = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredSuppliers.slice(startIndex, endIndex);
  }, [filteredSuppliers, page, rowsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredSuppliers.length / rowsPerPage);

  // Render form fields - matching Seller Registration form exactly
  const renderFormFields = () => (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <TextField 
          label="Supplier Name" 
          name="supplier_name" 
          value={formData.supplier_name} 
          onChange={handleChange} 
          required 
          fullWidth
          error={!!validationErrors.supplier_name}
          helperText={validationErrors.supplier_name}
          InputLabelProps={{
            sx: { color: '#9ca3af', mt: 2},
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
          FormHelperTextProps={{
            sx: { color: '#ef4444' },
          }}
        />
        <TextField 
          label="Email" 
          name="email_id" 
          type="email" 
          value={formData.email_id} 
          onChange={handleChange} 
          required 
          fullWidth
          error={!!validationErrors.email_id}
          helperText={validationErrors.email_id}
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
          label="Company Name" 
          name="business_name" 
          value={formData.business_name} 
          onChange={handleChange} 
          required
          fullWidth
          error={!!validationErrors.business_name}
          helperText={validationErrors.business_name}
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
          label="GST Number" 
          name="gst_number" 
          value={formData.gst_number} 
          onChange={handleChange} 
          required
          fullWidth
          error={!!validationErrors.gst_number}
          helperText={validationErrors.gst_number}
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
          required
          fullWidth
          error={!!validationErrors.address}
          helperText={validationErrors.address}
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
      </Stack>
    </form>
  );

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 3 },
        backgroundColor: '#020617',
        height: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#e5e7eb',
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
          flex: 1,
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
            Suppliers
          </Typography>
                  <Button
                    variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddSupplier}
            sx={{
              textTransform: 'none',
              px: 3,
              backgroundColor: '#0ea5e9',
              '&:hover': { backgroundColor: '#0284c7' },
            }}
          >
            Add Supplier
          </Button>
        </Box>

        {/* Search Bar */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexShrink: 0 }}>
          <TextField
            fullWidth
            placeholder="Search by Supplier Name or Phone Number..."
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

        {/* Suppliers Table */}
        <TableContainer
          component={Paper}
          sx={{
            backgroundColor: '#0f172a',
            borderRadius: 2,
            border: '1px solid rgba(148, 163, 184, 0.25)',
            flex: 1,
            overflow: 'auto',
            minHeight: 0,
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
                  Supplier Name
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
                  Business Name
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
              {loadingSuppliers ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={40} sx={{ color: '#0ea5e9' }} />
                  </TableCell>
                </TableRow>
              ) : suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#9ca3af' }}>
                    No suppliers found. Click "Add Supplier" to create one.
                  </TableCell>
                </TableRow>
              ) : filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#9ca3af' }}>
                    No suppliers match your search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSuppliers.map((supplier) => (
                  <TableRow
                    key={supplier.supplier_id}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(148, 163, 184, 0.05)',
                      },
                      borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                    }}
                  >
                    <TableCell sx={{ color: '#e5e7eb' }}>
                      {formatDate(supplier.created_at)}
                    </TableCell>
                    <TableCell sx={{ color: '#e5e7eb' }}>
                      {supplier.supplier_name || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ color: '#e5e7eb', maxWidth: 200 }}>
                      {supplier.address || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ color: '#e5e7eb' }}>
                      {supplier.mobile_number || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ color: '#e5e7eb' }}>
                      {supplier.business_name || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ color: '#e5e7eb', textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <IconButton
                          size="small"
                          onClick={() => handleViewSupplier(supplier.supplier_id)}
                          sx={{
                            color: '#0ea5e9',
                            '&:hover': { backgroundColor: 'rgba(14, 165, 233, 0.1)' },
                          }}
                          title="View"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleEditSupplier(supplier.supplier_id)}
                          sx={{
                            color: '#10b981',
                            '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
                          }}
                          title="Edit"
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

        {/* Pagination */}
        {!loadingSuppliers && filteredSuppliers.length > 0 && (
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

        {/* Add Supplier Modal */}
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
            Add Supplier
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
              {loading ? 'Creating Supplier...' : 'Create Supplier'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Supplier Modal */}
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
            Edit Supplier
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
              {loading ? 'Updating Supplier...' : 'Update Supplier'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Supplier Modal */}
        <Dialog
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
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
            Supplier Details
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
            {selectedSupplier && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Row 1: Supplier Name (left) | Email (right) */}
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
                      Supplier Name
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: '#e5e7eb',
                        fontSize: '0.9375rem',
                        fontWeight: 500,
                      }}
                    >
                      {selectedSupplier.supplier_name || 'N/A'}
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
                      {selectedSupplier.email_id || 'N/A'}
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
                      {selectedSupplier.mobile_number || 'N/A'}
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
                      {selectedSupplier.whatsapp_number || 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>

                {/* Row 3: Business Name (full width) */}
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
                    Business Name
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: '#e5e7eb',
                      fontSize: '0.9375rem',
                      fontWeight: 500,
                    }}
                  >
                    {selectedSupplier.business_name || 'N/A'}
                  </Typography>
                </Box>

                {/* Row 4: Address (full width) */}
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
                    {selectedSupplier.address || 'N/A'}
                  </Typography>
                </Box>

                {/* Row 5: GST Number (full width) */}
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
                    {selectedSupplier.gst_number || 'N/A'}
                  </Typography>
                </Box>

                {/* Row 6: Created Date (left) | Updated Date (right) */}
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
                      {formatDate(selectedSupplier.created_at)}
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
                      Updated Date
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: '#e5e7eb',
                        fontSize: '0.9375rem',
                        fontWeight: 500,
                      }}
                    >
                      {formatDate(selectedSupplier.updated_at)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1 }}>
            <Button
              onClick={() => setViewModalOpen(false)}
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

export default Suppliers;
