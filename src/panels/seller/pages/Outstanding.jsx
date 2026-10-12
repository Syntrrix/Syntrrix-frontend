import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Card,
  Typography,
  CircularProgress,
  MenuItem,
  TextField,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
  Pagination,
  Autocomplete,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import { fetchSupplierOutstanding } from '../../../api/outstanding';
import { fetchSuppliers } from '../../../api/suppliers';
import { createPayment, fetchSupplierPayments, fetchSupplierPaymentHistory } from '../../../api/payments';
import Swal from 'sweetalert2';
import { useThemeContext } from '../../../context/ThemeContext';

function Outstanding() {
  const { isDark } = useThemeContext();
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [outstandingData, setOutstandingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  
  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    supplier_id: '',
    invoice_number: '',
    product_purchase: '',
    amount: '',
    payment_mode: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    payment_proof: null, // Changed from payment_proof_file to payment_proof to match API
    note: '',
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentInvoices, setPaymentInvoices] = useState([]);
  const [loadingPaymentInvoices, setLoadingPaymentInvoices] = useState(false);
  const [selectedInvoiceAmount, setSelectedInvoiceAmount] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [amountError, setAmountError] = useState('');
  const [proofError, setProofError] = useState('');
  const [noteError, setNoteError] = useState('');
  const [proofFileName, setProofFileName] = useState('');
  const paymentDateRef = useRef(null);
  
  // Payment History modal state
  const [paymentHistoryModalOpen, setPaymentHistoryModalOpen] = useState(false);
  const [selectedSupplierForHistory, setSelectedSupplierForHistory] = useState(null);
  const [paymentHistoryData, setPaymentHistoryData] = useState([]);
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false);
  const [paymentHistoryError, setPaymentHistoryError] = useState('');
  
  const totalOutstanding = outstandingData.reduce(
    (sum, row) => sum + (row.outstanding || 0),
    0,
  );

  useEffect(() => {
    loadSuppliers();
    // Load all outstanding data initially
    loadOutstanding(null);
  }, []);

  useEffect(() => {
    // When supplier selection changes, reload data
    // Convert empty string to null to fetch all suppliers
    const supplierId = selectedSupplier && selectedSupplier !== '' ? selectedSupplier : null;
    loadOutstanding(supplierId);
    // Reset to page 1 when supplier filter changes
    setPage(1);
  }, [selectedSupplier]);

  // Calculate paginated data
  const paginatedOutstandingData = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return outstandingData.slice(startIndex, endIndex);
  }, [outstandingData, page, rowsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(outstandingData.length / rowsPerPage);

  useEffect(() => {
    if (paymentFormData.supplier_id && paymentModalOpen) {
      loadPaymentInvoices();
    } else {
      setPaymentInvoices([]);
    }
  }, [paymentFormData.supplier_id, paymentModalOpen]);

  const loadSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const response = await fetchSuppliers();
      if (response && response.success && Array.isArray(response.data)) {
        const supplierList = response.data.map((s) => ({
          id: s.supplier_id,
          name: s.supplier_name,
        }));
        setSuppliers(supplierList);
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

  const loadOutstanding = async (supplierId = null) => {
    setLoading(true);
    setError('');

    try {
      // Handle empty string, null, or undefined - all should fetch all suppliers
      let numericSupplierId = null;
      if (supplierId && supplierId !== '' && supplierId !== 'null' && supplierId !== 'undefined') {
        numericSupplierId = parseInt(supplierId, 10);
        if (Number.isNaN(numericSupplierId)) {
          numericSupplierId = null;
        }
      }
      
      const response = await fetchSupplierOutstanding(numericSupplierId);
      
      if (response && response.success && Array.isArray(response.data)) {
        const tableData = response.data.map((item) => ({
          supplier_id: item.supplier_id,
          supplier: item.supplier_name || `Supplier ${item.supplier_id}`,
          total: parseFloat(item.total_amount || 0),
          paid: parseFloat(item.paid_amount || 0),
          outstanding: parseFloat(item.outstanding || 0),
        }));
        setOutstandingData(tableData);
      } else {
        setOutstandingData([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch outstanding data.');
      setOutstandingData([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentInvoices = async () => {
    if (!paymentFormData.supplier_id) {
      setPaymentInvoices([]);
      setSelectedInvoiceAmount(0);
      return;
    }

    setLoadingPaymentInvoices(true);
    try {
      const response = await fetchSupplierPayments(parseInt(paymentFormData.supplier_id));
      if (response && response.success && Array.isArray(response.data)) {
        const pendingInvoices = response.data.filter(
          (inv) => Number(inv.outstanding_amount || 0) > 0
        );
        setPaymentInvoices(pendingInvoices);
      } else {
        setPaymentInvoices([]);
      }
    } catch (err) {
      console.error('Error loading invoices:', err);
      setPaymentError(err.message || 'Failed to load invoices.');
      setPaymentInvoices([]);
    } finally {
      setLoadingPaymentInvoices(false);
    }
  };

  const handlePaymentChange = (e) => {
    const fieldName = e.target.name;
    const fieldValue = e.target.value;
    
    setPaymentFormData({ ...paymentFormData, [fieldName]: fieldValue });
    setPaymentError('');
    setAmountError('');
    
    // Clear field-specific errors
    if (fieldName === 'note') {
      setNoteError('');
    }

    if (fieldName === 'invoice_number') {
      const selectedInv = paymentInvoices.find(
        (inv) => inv.invoice_number === fieldValue
      );
      if (selectedInv) {
        const remaining = Number(selectedInv.outstanding_amount || selectedInv.total_amount || 0);
        setPaymentFormData((prev) => ({
          ...prev,
          product_purchase: selectedInv.product_purchase_id.toString(),
          amount: remaining.toFixed(2),
        }));
        setSelectedInvoiceAmount(remaining);
        setSelectedInvoice(selectedInv);
      } else {
        setSelectedInvoiceAmount(0);
        setSelectedInvoice(null);
      }
    } else if (fieldName === 'amount') {
      const amountValue = parseFloat(fieldValue);
      if (isNaN(amountValue) || amountValue <= 0) {
        setAmountError('Amount must be greater than 0');
      } else if (selectedInvoice) {
        const outstandingAmount = Number(selectedInvoice.outstanding_amount || selectedInvoice.total_amount || 0);
        if (amountValue > outstandingAmount) {
          setAmountError(
            `Payment amount cannot exceed outstanding amount (₹${outstandingAmount.toFixed(2)})`
          );
        } else {
          setAmountError('');
        }
      }
    } else if (fieldName === 'supplier_id') {
      setPaymentFormData((prev) => ({
        ...prev,
        invoice_number: '',
        product_purchase: '',
        amount: '',
      }));
      setSelectedInvoiceAmount(0);
      setSelectedInvoice(null);
      setAmountError('');
    }
  };

  const handleProofFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const fileExtension = file.name.split('.').pop().toLowerCase();
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
      
      if (!allowedExtensions.includes(fileExtension)) {
        setProofError('Please upload a valid file (JPG, JPEG, PNG, or PDF)');
        e.target.value = ''; // Clear the input
        setPaymentFormData((prev) => ({
          ...prev,
          payment_proof: null, // Changed from payment_proof_file to payment_proof
        }));
        setProofFileName('');
        return;
      }
      
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setProofError('File size must be less than 10MB');
        e.target.value = ''; // Clear the input
        setPaymentFormData((prev) => ({
          ...prev,
          payment_proof: null, // Changed from payment_proof_file to payment_proof
        }));
        setProofFileName('');
        return;
      }
      
      setPaymentFormData((prev) => ({
        ...prev,
        payment_proof: file, // Changed from payment_proof_file to payment_proof
      }));
      setProofFileName(file.name);
      setProofError('');
    } else {
      setPaymentFormData((prev) => ({
        ...prev,
        payment_proof: null, // Changed from payment_proof_file to payment_proof
      }));
      setProofFileName('');
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setPaymentLoading(true);
    setPaymentError('');
    setAmountError('');
    setProofError('');
    setNoteError('');

    const amountValue = parseFloat(paymentFormData.amount);
    
    if (!paymentFormData.supplier_id) {
      setPaymentError('Please select a supplier');
      setPaymentLoading(false);
      return;
    }
    
    if (!paymentFormData.invoice_number || !paymentFormData.product_purchase) {
      setPaymentError('Please select an invoice');
      setPaymentLoading(false);
      return;
    }
    
    if (!paymentFormData.amount || isNaN(amountValue) || amountValue <= 0) {
      setAmountError('Please enter a valid amount greater than 0');
      setPaymentLoading(false);
      return;
    }
    
    // Validate payment proof file (required)
    if (!paymentFormData.payment_proof) {
      setProofError('Please upload payment proof file');
      setPaymentLoading(false);
      return;
    }
    
    // Validate note (required)
    if (!paymentFormData.note || paymentFormData.note.trim() === '') {
      setNoteError('Please enter a remark');
      setPaymentLoading(false);
      return;
    }
    
    if (selectedInvoice) {
      const outstandingAmount = Number(selectedInvoice.outstanding_amount || selectedInvoice.total_amount || 0);
      if (amountValue > outstandingAmount) {
        setAmountError(
          `Payment amount cannot exceed outstanding amount (₹${outstandingAmount.toFixed(2)})`
        );
        setPaymentLoading(false);
        await Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: `Payment amount cannot exceed the outstanding invoice amount (₹${outstandingAmount.toFixed(2)})`,
          confirmButtonColor: '#d32f2f',
        });
        return;
      }
    }

    try {
      // Follow the exact same pattern as New Purchase modal
      // Create a regular JavaScript object (NOT FormData) and let createPayment handle FormData creation
      
      // Ensure invoice_number is a string (can be alphanumeric like "INV-001" or "A123")
      const invoiceNumber = String(paymentFormData.invoice_number || '').trim();
      if (!invoiceNumber) {
        setPaymentError('Invoice number is required');
        setPaymentLoading(false);
        return;
      }
      
      // Validate payment_proof file
      if (!paymentFormData.payment_proof) {
        console.error('No payment_proof found in paymentFormData');
        setPaymentError('Payment proof file is required');
        setPaymentLoading(false);
        return;
      }
      
      // Ensure it's a File object
      if (!(paymentFormData.payment_proof instanceof File)) {
        console.error('payment_proof is not a File object:', paymentFormData.payment_proof);
        setPaymentError('Invalid file object. Please select a file again.');
        setPaymentLoading(false);
        return;
      }
      
      // DIFFERENT APPROACH: Create FormData directly in component (more reliable)
      // This ensures the File object is preserved and sent correctly
      const formData = new FormData();
      formData.append('invoice_number', invoiceNumber);
      formData.append('product_purchase', parseInt(paymentFormData.product_purchase));
      formData.append('amount', parseFloat(paymentFormData.amount));
      formData.append('payment_mode', paymentFormData.payment_mode);
      formData.append('payment_date', paymentFormData.payment_date);
      
      // Add payment proof file (REQUIRED)
      if (!paymentFormData.payment_proof || !(paymentFormData.payment_proof instanceof File)) {
        setProofError('Please upload a valid payment proof file');
        setPaymentLoading(false);
        return;
      }
      formData.append('payment_proof', paymentFormData.payment_proof);
      
      // Add note if provided
      if (paymentFormData.note && paymentFormData.note.trim()) {
        formData.append('note', paymentFormData.note.trim());
      }

      // Verify FormData contains the file
      console.log('FormData created with file:', paymentFormData.payment_proof.name, paymentFormData.payment_proof.size, 'bytes');
      
      // Send FormData directly to API
      const response = await createPayment(formData);
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: response.message || 'Payment recorded successfully.',
        confirmButtonColor: '#0ea5e9',
      });
      
      // Reset form and close modal
      setPaymentFormData({
        supplier_id: '',
        invoice_number: '',
        product_purchase: '',
        amount: '',
        payment_mode: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        payment_proof: null, // Changed from payment_proof_file to payment_proof
        note: '',
      });
      setPaymentInvoices([]);
      setSelectedInvoiceAmount(0);
      setSelectedInvoice(null);
      setAmountError('');
      setProofError('');
      setNoteError('');
      setProofFileName('');
      setPaymentModalOpen(false);
      
      // Reload outstanding data
      const supplierId = selectedSupplier && selectedSupplier !== '' ? selectedSupplier : null;
      loadOutstanding(supplierId);
    } catch (err) {
      const errorMessage = err.message || 'Failed to record payment.';
      setPaymentError(errorMessage);
      if (errorMessage.includes('cannot exceed') || errorMessage.includes('outstanding')) {
        setAmountError(errorMessage);
      }
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#d32f2f',
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleOpenPaymentModal = () => {
    setPaymentModalOpen(true);
    setPaymentFormData({
      supplier_id: '',
      invoice_number: '',
      product_purchase: '',
      amount: '',
      payment_mode: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      payment_proof: null, // Changed from payment_proof_file to payment_proof
      note: '',
    });
    setPaymentError('');
    setAmountError('');
    setProofError('');
    setNoteError('');
    setProofFileName('');
    setSelectedInvoice(null);
    setSelectedInvoiceAmount(0);
  };

  const handleViewPaymentHistory = async (supplierId, supplierName) => {
    setSelectedSupplierForHistory({ id: supplierId, name: supplierName });
    setPaymentHistoryModalOpen(true);
    setLoadingPaymentHistory(true);
    setPaymentHistoryError('');
    setPaymentHistoryData([]);

    try {
      const response = await fetchSupplierPaymentHistory(supplierId);
      if (response && response.success && Array.isArray(response.data)) {
        setPaymentHistoryData(response.data);
      } else {
        setPaymentHistoryData([]);
        setPaymentHistoryError('No payment history found.');
      }
    } catch (err) {
      setPaymentHistoryError(err.message || 'Failed to fetch payment history.');
      setPaymentHistoryData([]);
    } finally {
      setLoadingPaymentHistory(false);
    }
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
        {/* Header with Supplier Payment Button */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            flexShrink: 0,
          }}
        >
          <Typography variant="h5" fontWeight={700} sx={{ color: isDark ? '#e5e7eb' : '#0f172a' }}>
            Outstanding
          </Typography>
          <Button
            variant="contained"
            onClick={handleOpenPaymentModal}
            sx={{
              textTransform: 'none',
              px: 3,
              borderRadius: '24px',
              backgroundColor: '#0ea5e9',
              '&:hover': { backgroundColor: '#0284c7' },
            }}
          >
            Supplier Payment
          </Button>
        </Box>

        {/* Filter Section */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexShrink: 0 }}>
          <Autocomplete
            options={suppliers}
            getOptionLabel={(option) => option?.name || ''}
            value={
              selectedSupplier
                ? suppliers.find((s) => String(s.id) === String(selectedSupplier)) || null
                : null
            }
            onChange={(_, newValue) => {
              setSelectedSupplier(newValue ? newValue.id : '');
            }}
            loading={loadingSuppliers}
            size="small"
            sx={{ width: 300 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Filter by Supplier"
                placeholder="Search supplier by name"
                disabled={loadingSuppliers}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: isDark ? '#0f2339' : '#f8fafc',
                    color: isDark ? '#e5e7eb' : '#0f172a',
                    borderRadius: 2,
                  },
                  '& .MuiInputLabel-root': {
                    color: isDark ? '#9ca3af' : '#475569',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(148, 163, 184, 0.3)' : '#cbd5e1',
                  },
                }}
              />
            )}
            noOptionsText={loadingSuppliers ? 'Loading suppliers...' : 'No suppliers found'}
            PaperComponent={({ children, ...other }) => (
              <Paper {...other} sx={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#e5e7eb' : '#0f172a' }}>
                {children}
              </Paper>
            )}
          />
          {loadingSuppliers && (
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
              Loading suppliers...
            </Typography>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Outstanding Table */}
        <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <TableContainer
            component={Paper}
            sx={{
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderRadius: 2,
              border: isDark ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid #e2e8f0',
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
                    backgroundColor: isDark ? '#1e293b' : '#0ea5e9',
                    color: '#ffffff',
                    fontWeight: 700,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  Supplier
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: isDark ? '#1e293b' : '#0ea5e9',
                    color: '#ffffff',
                    fontWeight: 700,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  Total
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: isDark ? '#1e293b' : '#0ea5e9',
                    color: '#ffffff',
                    fontWeight: 700,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  Paid
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: isDark ? '#1e293b' : '#0ea5e9',
                    color: '#ffffff',
                    fontWeight: 700,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  Outstanding
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: isDark ? '#1e293b' : '#0ea5e9',
                    color: '#ffffff',
                    fontWeight: 700,
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
              ) : outstandingData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#9ca3af' }}>
                    {selectedSupplier 
                      ? 'No outstanding dues found for this supplier'
                      : 'No outstanding dues found'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOutstandingData.map((row, index) => (
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
                      {row.supplier}
                    </TableCell>
                    <TableCell sx={{ color: '#e5e7eb' }}>
                      ₹{row.total.toFixed(2)}
                    </TableCell>
                    <TableCell sx={{ color: '#e5e7eb' }}>
                      ₹{row.paid.toFixed(2)}
                    </TableCell>
                    <TableCell sx={{ color: '#22d3ee', fontWeight: 600 }}>
                      ₹{row.outstanding.toFixed(2)}
                    </TableCell>
                    <TableCell sx={{ color: '#e5e7eb', textAlign: 'center' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleViewPaymentHistory(row.supplier_id, row.supplier)}
                        sx={{
                          color: '#0ea5e9',
                          borderColor: '#0ea5e9',
                          textTransform: 'none',
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
        {!loading && outstandingData.length > 0 && (
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

        {/* Bottom-right total outstanding */}
        {outstandingData.length > 0 && (
          <Box
            sx={{
              mt: 3,
              display: 'flex',
              justifyContent: 'flex-end',
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 1.5,
                borderRadius: 1.5,
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                border: '1px solid rgba(14, 165, 233, 0.3)',
              }}
            >
              <Typography
                variant="body2"
                sx={{ color: '#9ca3af', mb: 0.5, textAlign: 'right' }}
              >
                {selectedSupplier ? 'Supplier Outstanding' : 'Total Outstanding (All Suppliers)'}
              </Typography>
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ color: '#22d3ee', textAlign: 'right' }}
              >
                ₹{totalOutstanding.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        )}
      </Card>

      {/* Supplier Payment Modal */}
      <Dialog
        open={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setPaymentFormData({
            supplier_id: '',
            invoice_number: '',
            product_purchase: '',
            amount: '',
            payment_mode: 'cash',
            payment_date: new Date().toISOString().split('T')[0],
          });
          setPaymentError('');
          setAmountError('');
          setSelectedInvoice(null);
          setSelectedInvoiceAmount(0);
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
          Supplier Payment
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
          {paymentError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPaymentError('')}>
              {paymentError}
            </Alert>
          )}

          {selectedInvoice && (
            <Box
              sx={{
                p: 2,
                mb: 2,
                mt:2,
                borderRadius: 1,
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                border: '1px solid rgba(14, 165, 233, 0.3)',
              }}
            >
              <Typography variant="body2" sx={{ color: '#9ca3af', mb: 0.5 }}>
                Outstanding Amount
              </Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#0ea5e9' }}>
                ₹{selectedInvoiceAmount.toFixed(2)}
              </Typography>
              {selectedInvoice.total_amount && (
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 0.5 }}>
                  Total: ₹{Number(selectedInvoice.total_amount).toFixed(2)} | 
                  Paid: ₹{Number(selectedInvoice.paid_amount || 0).toFixed(2)}
                </Typography>
              )}
            </Box>
          )}

          <form onSubmit={handlePaymentSubmit}>
            <Stack spacing={2}>
              {/* Supplier Selection */}
              <Autocomplete
                options={suppliers}
                getOptionLabel={(option) => option?.name || ''}
                value={
                  paymentFormData.supplier_id
                    ? suppliers.find((s) => String(s.id) === String(paymentFormData.supplier_id)) || null
                    : null
                }
                onChange={(_, newValue) => {
                  handlePaymentChange({
                    target: {
                      name: 'supplier_id',
                      value: newValue ? newValue.id : '',
                    },
                  });
                }}
                loading={loadingSuppliers}
                fullWidth
                slotProps={{
                  paper: {
                    sx: {
                      backgroundColor: '#1e293b',
                      color: '#e5e7eb',
                    },
                  },
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Supplier"
                    placeholder="Search supplier by name"
                    required
                    disabled={loadingSuppliers}
                    InputLabelProps={{
                      sx: { color: '#9ca3af' },
                    }}
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
                noOptionsText={loadingSuppliers ? 'Loading suppliers...' : 'No suppliers found'}
              />

              {/* Invoice Selection */}
              {loadingPaymentInvoices && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                    Loading invoices...
                  </Typography>
                </Box>
              )}

              {paymentInvoices.length > 0 && (
                <TextField
                  select
                  label="Invoice Number"
                  name="invoice_number"
                  value={paymentFormData.invoice_number}
                  onChange={handlePaymentChange}
                  required
                  fullWidth
                  disabled={loadingPaymentInvoices}
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
                  SelectProps={{
                    sx: { color: '#e5e7eb' },
                    MenuProps: {
                      PaperProps: {
                        sx: {
                          backgroundColor: '#1e293b',
                          color: '#e5e7eb',
                        },
                      },
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>Select Invoice</em>
                  </MenuItem>
                  {paymentInvoices.map((invoice) => (
                    <MenuItem key={invoice.product_purchase_id} value={invoice.invoice_number}>
                      {invoice.invoice_number} ({invoice.invoice_date}) - ₹
                      {Number(invoice.outstanding_amount ?? invoice.total_amount ?? 0).toFixed(2)} (Remaining)
                    </MenuItem>
                  ))}
                </TextField>
              )}

              {paymentInvoices.length === 0 && paymentFormData.supplier_id && !loadingPaymentInvoices && (
                <TextField
                  label="Invoice Number"
                  name="invoice_number"
                  placeholder="No pending invoices found"
                  value={paymentFormData.invoice_number}
                  onChange={handlePaymentChange}
                  fullWidth
                  disabled
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
                  helperText="No pending invoices found for this supplier"
                  FormHelperTextProps={{
                    sx: { color: '#9ca3af' },
                  }}
                />
              )}

              {/* Payment Date */}
              <TextField
                label="Payment Date"
                name="payment_date"
                type="date"
                value={paymentFormData.payment_date}
                onChange={handlePaymentChange}
                required
                fullWidth
                InputLabelProps={{
                  sx: { color: '#9ca3af' },
                }}
                InputProps={{
                  inputRef: paymentDateRef,
                  sx: {
                    color: '#e5e7eb',
                    backgroundColor: '#0f2339',
                    pr: 0,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(148, 163, 184, 0.3)',
                    },
                    '& input[type="date"]::-webkit-calendar-picker-indicator': {
                      display: 'none',
                    },
                  },
                  endAdornment: (
                    <IconButton
                      size="small"
                      sx={{ color: '#9ca3af' }}
                      onClick={() => {
                        if (paymentDateRef.current) {
                          if (typeof paymentDateRef.current.showPicker === 'function') {
                            paymentDateRef.current.showPicker();
                          } else {
                            paymentDateRef.current.focus();
                          }
                        }
                      }}
                    >
                      <CalendarTodayIcon fontSize="small" />
                    </IconButton>
                  ),
                }}
              />

              {/* Amount */}
              <TextField
                label="Amount (₹)"
                name="amount"
                placeholder="Enter payment amount"
                type="number"
                value={paymentFormData.amount}
                onChange={handlePaymentChange}
                required
                fullWidth
                error={!!amountError}
                InputLabelProps={{
                  sx: { color: '#9ca3af' },
                }}
                InputProps={{
                  sx: {
                    color: '#e5e7eb',
                    backgroundColor: '#0f2339',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: amountError ? '#ef4444' : 'rgba(148, 163, 184, 0.3)',
                    },
                  },
                }}
                inputProps={{
                  min: 0,
                  step: 1,
                }}
                helperText={amountError || (selectedInvoice ? `Max: ₹${selectedInvoiceAmount.toFixed(2)}` : '')}
                FormHelperTextProps={{
                  sx: { color: amountError ? '#ef4444' : '#9ca3af' },
                }}
              />

              {/* Payment Mode */}
              <TextField
                select
                label="Payment Mode"
                name="payment_mode"
                value={paymentFormData.payment_mode}
                onChange={handlePaymentChange}
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
                SelectProps={{
                  sx: { color: '#e5e7eb' },
                  MenuProps: {
                    PaperProps: {
                      sx: {
                        backgroundColor: '#1e293b',
                        color: '#e5e7eb',
                      },
                    },
                  },
                }}
              >
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="online">Online</MenuItem>
                <MenuItem value="cheque">Cheque</MenuItem>
                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
              </TextField>

              {/* Upload Proof */}
              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#9ca3af',
                    mb: 1,
                    fontWeight: 500,
                  }}
                >
                  Upload Proof <span style={{ color: '#ef4444' }}>*</span>
                </Typography>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  onChange={handleProofFileChange}
                  style={{ display: 'none' }}
                  id="payment-proof-upload"
                  required
                />
                <label htmlFor="payment-proof-upload">
                  <Button
                    component="span"
                    variant="outlined"
                    fullWidth
                    sx={{
                      color: proofError ? '#ef4444' : '#0ea5e9',
                      borderColor: proofError ? '#ef4444' : 'rgba(148, 163, 184, 0.3)',
                      backgroundColor: '#0f2339',
                      textTransform: 'none',
                      py: 1.5,
                      '&:hover': {
                        borderColor: proofError ? '#ef4444' : '#0ea5e9',
                        backgroundColor: 'rgba(14, 165, 233, 0.1)',
                      },
                    }}
                  >
                    {proofFileName ? proofFileName : 'Choose File (JPG, JPEG, PNG, PDF)'}
                  </Button>
                </label>
                {proofError && (
                  <Typography variant="caption" sx={{ color: '#ef4444', mt: 0.5, display: 'block' }}>
                    {proofError}
                  </Typography>
                )}
                {proofFileName && !proofError && (
                  <Typography variant="caption" sx={{ color: '#9ca3af', mt: 0.5, display: 'block' }}>
                    Selected: {proofFileName}
                  </Typography>
                )}
              </Box>

              {/* Remark */}
              <TextField
                label="Remark"
                name="note"
                placeholder="Enter payment remarks"
                value={paymentFormData.note}
                onChange={handlePaymentChange}
                required
                fullWidth
                multiline
                rows={3}
                error={!!noteError}
                InputLabelProps={{
                  sx: { color: '#9ca3af' },
                }}
                InputProps={{
                  sx: {
                    color: '#e5e7eb',
                    backgroundColor: '#0f2339',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: noteError ? '#ef4444' : 'rgba(148, 163, 184, 0.3)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: noteError ? '#ef4444' : 'rgba(148, 163, 184, 0.5)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: noteError ? '#ef4444' : '#0ea5e9',
                    },
                  },
                }}
                helperText={noteError || 'Enter any additional notes about this payment'}
                FormHelperTextProps={{
                  sx: { color: noteError ? '#ef4444' : '#9ca3af' },
                }}
              />
            </Stack>
          </form>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button
            onClick={() => {
              setPaymentModalOpen(false);
              setPaymentFormData({
                supplier_id: '',
                invoice_number: '',
                product_purchase: '',
                amount: '',
                payment_mode: 'cash',
                payment_date: new Date().toISOString().split('T')[0],
                payment_proof: null,
                note: '',
              });
              setPaymentError('');
              setAmountError('');
              setProofError('');
              setNoteError('');
              setProofFileName('');
              setSelectedInvoice(null);
              setSelectedInvoiceAmount(0);
            }}
            sx={{ color: '#9ca3af', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handlePaymentSubmit}
            disabled={paymentLoading}
            variant="contained"
            size="large"
            sx={{
              textTransform: 'none',
              backgroundColor: '#0ea5e9',
              '&:hover': { backgroundColor: '#0284c7' },
            }}
          >
            {paymentLoading ? 'Submitting Payment...' : 'Submit Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment History Modal */}
      <Dialog
        open={paymentHistoryModalOpen}
        onClose={() => {
          setPaymentHistoryModalOpen(false);
          setSelectedSupplierForHistory(null);
          setPaymentHistoryData([]);
          setPaymentHistoryError('');
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#0f172a',
            color: '#e5e7eb',
            borderRadius: 2,
            border: '1px solid rgba(148, 163, 184, 0.25)',
            maxHeight: '90vh',
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
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Payment History
            </Typography>
            {selectedSupplierForHistory && (
              <Typography variant="body2" sx={{ color: '#9ca3af', mt: 0.5 }}>
                {selectedSupplierForHistory.name}
              </Typography>
            )}
          </Box>
          <IconButton
            onClick={() => {
              setPaymentHistoryModalOpen(false);
              setSelectedSupplierForHistory(null);
              setPaymentHistoryData([]);
              setPaymentHistoryError('');
            }}
            sx={{ color: '#9ca3af' }}
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
          {paymentHistoryError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPaymentHistoryError('')}>
              {paymentHistoryError}
            </Alert>
          )}

          {loadingPaymentHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={40} sx={{ color: '#0ea5e9' }} />
            </Box>
          ) : paymentHistoryData.length === 0 && !paymentHistoryError ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" sx={{ color: '#9ca3af' }}>
                No payment history found for this supplier.
              </Typography>
            </Box>
          ) : (
            <TableContainer
              component={Paper}
              sx={{
                backgroundColor: '#0f172a',
                borderRadius: 2,
                border: '1px solid rgba(148, 163, 184, 0.25)',
                maxHeight: '60vh',
                overflow: 'auto',
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
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
                      Invoice No
                    </TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: '#1e293b',
                        color: '#e5e7eb',
                        fontWeight: 600,
                        borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                      }}
                    >
                      Total Amount
                    </TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: '#1e293b',
                        color: '#e5e7eb',
                        fontWeight: 600,
                        borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                      }}
                    >
                      Paid Amount
                    </TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: '#1e293b',
                        color: '#e5e7eb',
                        fontWeight: 600,
                        borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                      }}
                    >
                      Payment Mode
                    </TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: '#1e293b',
                        color: '#e5e7eb',
                        fontWeight: 600,
                        borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                      }}
                    >
                      Outstanding
                    </TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: '#1e293b',
                        color: '#e5e7eb',
                        fontWeight: 600,
                        borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                      }}
                    >
                      Proof
                    </TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: '#1e293b',
                        color: '#e5e7eb',
                        fontWeight: 600,
                        borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                      }}
                    >
                      Note
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paymentHistoryData.map((payment, index) => (
                    <TableRow
                      key={payment.supplier_payment_id || index}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'rgba(148, 163, 184, 0.05)',
                        },
                        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                      }}
                    >
                      <TableCell sx={{ color: '#e5e7eb' }}>
                        {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell sx={{ color: '#e5e7eb' }}>
                        {payment.invoice_number || '-'}
                      </TableCell>
                      <TableCell sx={{ color: '#e5e7eb', fontWeight: 500 }}>
                        ₹{Number(payment.total_amount || payment.invoice_total || 0).toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ color: '#e5e7eb' }}>
                        ₹{Number(payment.amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ color: '#e5e7eb', textTransform: 'capitalize' }}>
                        {payment.payment_mode ? payment.payment_mode.replace('_', ' ') : '-'}
                      </TableCell>
                      <TableCell sx={{ color: '#22d3ee', fontWeight: 600 }}>
                        ₹{Number(payment.outstanding_amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ color: '#e5e7eb' }}>
                        {payment.payment_proof_url ? (
                          <Button
                            variant="outlined"
                            size="small"
                            href={payment.payment_proof_url}
                            target="_blank"
                            sx={{
                              color: '#0ea5e9',
                              borderColor: '#0ea5e9',
                              textTransform: 'none',
                              '&:hover': {
                                borderColor: '#0284c7',
                                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                              },
                            }}
                          >
                            View
                          </Button>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell sx={{ color: '#e5e7eb', maxWidth: 200 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={payment.note || ''}
                        >
                          {payment.note || '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button
            onClick={() => {
              setPaymentHistoryModalOpen(false);
              setSelectedSupplierForHistory(null);
              setPaymentHistoryData([]);
              setPaymentHistoryError('');
            }}
            sx={{ color: '#9ca3af', textTransform: 'none' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Outstanding;

