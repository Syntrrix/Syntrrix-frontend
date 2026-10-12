import { useState, useEffect, useRef } from 'react';
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
  IconButton,
  Divider,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { createCustomerPayment, fetchCustomerPayments, fetchCustomers } from '../../../api/customers';
import { useThemeContext } from '../../../context/ThemeContext';
import Swal from 'sweetalert2';

function CustomerPayment() {
  const { isDark } = useThemeContext();
  const paymentDateRef = useRef(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    invoice_number: '',
    customer_purchase: '',
    amount: '',
    payment_mode: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [hasPendingInvoices, setHasPendingInvoices] = useState(true);
  const [selectedInvoiceAmount, setSelectedInvoiceAmount] = useState(0); // will hold remaining/outstanding amount
  const [selectedInvoice, setSelectedInvoice] = useState(null); // Store full invoice object
  const [amountError, setAmountError] = useState(''); // Validation error for amount field

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (formData.customer_id) {
      // Fetch customer invoices when customer is selected
      loadCustomerInvoices();
    } else {
      setInvoices([]);
      setHasPendingInvoices(true);
    }
  }, [formData.customer_id]);

  const loadCustomerInvoices = async () => {
    if (!formData.customer_id) {
      setInvoices([]);
      return;
    }

    setLoadingInvoices(true);
    try {
      // Use backend payments API which now returns invoices with total_amount, paid_amount, outstanding_amount & payment_status
      const response = await fetchCustomerPayments(parseInt(formData.customer_id));

      if (response && response.success && Array.isArray(response.data)) {
        // Filter only invoices that still have outstanding amount > 0
        const pendingInvoices = response.data.filter(
          (inv) => Number(inv.outstanding_amount || 0) > 0
        );
        setInvoices(pendingInvoices);
        setHasPendingInvoices(pendingInvoices.length > 0);
      } else {
        setInvoices([]);
        setHasPendingInvoices(false);
      }
    } catch (err) {
      console.error('Error loading customer invoices:', err);
      setError(err.message || 'Failed to load invoices.');
      setInvoices([]);
      setHasPendingInvoices(false);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const response = await fetchCustomers();
      if (response && response.success && Array.isArray(response.data)) {
        const customerList = response.data.map((c) => ({
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

  const handleChange = (e) => {
    const fieldName = e.target.name;
    const fieldValue = e.target.value;
    
    setFormData({ ...formData, [fieldName]: fieldValue });
    setError('');
    setAmountError(''); // Clear amount error when any field changes

    // When invoice_number is selected, auto-fill customer_purchase and set remaining amount
    if (fieldName === 'invoice_number') {
      const selectedInv = invoices.find(
        (inv) => inv.invoice_number === fieldValue
      );
      if (selectedInv) {
        const remaining = Number(selectedInv.outstanding_amount || selectedInv.total_amount || 0);
        setFormData((prev) => ({
          ...prev,
          customer_purchase: selectedInv.customer_purchase_id.toString(),
          amount: remaining.toFixed(2),
        }));
        setSelectedInvoiceAmount(remaining);
        setSelectedInvoice(selectedInv); // Store full invoice object
      } else {
        setSelectedInvoiceAmount(0);
        setSelectedInvoice(null);
      }
    } else if (fieldName === 'amount') {
      // Validate amount in real-time
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
    } else if (fieldName === 'customer_id') {
      // Reset invoice-related fields when customer changes
      setFormData((prev) => ({
        ...prev,
        invoice_number: '',
        customer_purchase: '',
        amount: '',
      }));
      setSelectedInvoiceAmount(0);
      setSelectedInvoice(null);
      setAmountError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAmountError('');

    // Frontend validation before submitting
    const amountValue = parseFloat(formData.amount);
    
    // Validate required fields
    if (!formData.customer_id) {
      setError('Please select a customer');
      setLoading(false);
      return;
    }
    
    if (!formData.invoice_number || !formData.customer_purchase) {
      setError('Please select an invoice');
      setLoading(false);
      return;
    }
    
    if (!formData.amount || isNaN(amountValue) || amountValue <= 0) {
      setAmountError('Please enter a valid amount greater than 0');
      setLoading(false);
      return;
    }
    
    // Validate amount doesn't exceed outstanding amount
    if (selectedInvoice) {
      const outstandingAmount = Number(selectedInvoice.outstanding_amount || selectedInvoice.total_amount || 0);
      if (amountValue > outstandingAmount) {
        setAmountError(
          `Payment amount (₹${amountValue.toFixed(2)}) cannot exceed outstanding invoice amount (₹${outstandingAmount.toFixed(2)}). ` +
          `Invoice total: ₹${Number(selectedInvoice.total_amount || 0).toFixed(2)}, ` +
          `Already paid: ₹${Number(selectedInvoice.paid_amount || 0).toFixed(2)}, ` +
          `Outstanding: ₹${outstandingAmount.toFixed(2)}`
        );
        setLoading(false);
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
      const payload = {
        invoice_number: formData.invoice_number,
        customer_purchase: parseInt(formData.customer_purchase),
        amount: parseFloat(formData.amount),
        payment_mode: formData.payment_mode,
        payment_date: formData.payment_date,
      };

      const response = await createCustomerPayment(payload);
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: response.message || 'Payment recorded successfully.',
        confirmButtonColor: '#0ea5e9',
      });
      // Reset form
      setFormData({
        customer_id: '',
        invoice_number: '',
        customer_purchase: '',
        amount: '',
        payment_mode: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
      });
      setInvoices([]);
      setSelectedInvoiceAmount(0);
      setSelectedInvoice(null);
      setAmountError('');
    } catch (err) {
      const errorMessage = err.message || 'Failed to record payment.';
      setError(errorMessage);
      
      // Check if error is about amount exceeding invoice amount
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
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 3 },
        backgroundColor: isDark ? '#020617' : '#f1f5f9',
        minHeight: '100%',
        color: isDark ? '#e5e7eb' : '#0f172a',
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
        }}
      >
        <Grid container spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Grid item>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#e5e7eb' }}>
              Customer Payment
            </Typography>
          </Grid>
          {selectedInvoice && (
            <Grid item>
              <Box
                sx={{
                  p: 1.5,
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
            </Grid>
          )}
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Card
          sx={{
            backgroundColor: '#020617',
            borderRadius: 2,
            border: '1px solid rgba(30,64,175,0.6)',
          }}
        >
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                {/* Customer Selection */}
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    name="customer_id"
                    label="Customer"
                    value={formData.customer_id}
                    onChange={handleChange}
                    size="small"
                    required
                    disabled={loadingCustomers}
                    InputLabelProps={{ sx: { color: '#9ca3af' } }}
                    SelectProps={{
                      sx: { color: '#e5e7eb' },
                      displayEmpty: true,
                      renderValue: (selected) => {
                        if (!selected) {
                          return <em style={{ color: '#9ca3af' }}>Select Customer</em>;
                        }
                        const customer = customers.find((c) => c.id === parseInt(selected));
                        return customer ? customer.name : '';
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#0f2339',
                        borderRadius: 1,
                      },
                      '& .MuiSelect-icon': {
                        color: '#9ca3af',
                      },
                    }}
                  >
                    <MenuItem value="" disabled>
                      <em>Select Customer</em>
                    </MenuItem>
                    {customers.map((customer) => (
                      <MenuItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </MenuItem>
                    ))}
                    {customers.length === 0 && !loadingCustomers && (
                      <MenuItem value="" disabled>
                        No customers found
                      </MenuItem>
                    )}
                  </TextField>
                </Grid>

                {loadingCustomers && (
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                      Loading customers...
                    </Typography>
                  </Grid>
                )}

                {loadingInvoices && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                        Loading invoices...
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {invoices.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      fullWidth
                      name="invoice_number"
                      // label="Invoice Number"
                      placeholder="Select Invoice"
                      value={formData.invoice_number}
                      onChange={handleChange}
                      size="small"
                      required
                      disabled={loadingInvoices}
                      InputLabelProps={{ sx: { color: '#9ca3af' } }}
                      SelectProps={{
                        sx: { color: '#e5e7eb' },
                        displayEmpty: true,
                        renderValue: (selected) => {
                          if (!selected) {
                            return <em style={{ color: '#9ca3af' }}>Select Invoice</em>;
                          }
                          const invoice = invoices.find((inv) => inv.invoice_number === selected);
                          return invoice ? `${invoice.invoice_number} (${invoice.invoice_date})` : selected;
                        },
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#0f2339',
                          borderRadius: 1,
                        },
                        '& .MuiSelect-icon': {
                          color: '#9ca3af',
                        },
                      }}
                    >
                      <MenuItem value="" disabled>
                        <em>Select Invoice</em>
                      </MenuItem>
                      {invoices.map((invoice) => (
                        <MenuItem key={invoice.customer_purchase_id} value={invoice.invoice_number}>
                          {invoice.invoice_number} ({invoice.invoice_date}) - ₹
                          {Number(
                            invoice.outstanding_amount ?? invoice.total_amount ?? 0
                          ).toFixed(2)}{' '}
                          (Remaining)
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                )}

                {invoices.length === 0 && formData.customer_id && !loadingInvoices && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      name="invoice_number"
                      // label="Invoice Number"
                      placeholder="Select Invoice"
                      value={formData.invoice_number}
                      onChange={handleChange}
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
                      helperText="No pending invoices found for this customer"
                      FormHelperTextProps={{
                        sx: { color: '#9ca3af', fontSize: '0.75rem' },
                      }}
                    />
                  </Grid>
                )}

                {/* Hidden field for customer_purchase (auto-filled when invoice is selected) */}
                <input type="hidden" name="customer_purchase" value={formData.customer_purchase} />

                <Grid item xs={12}>
                  <Divider sx={{ my: 1.5, borderColor: 'rgba(148,163,184,0.4)' }} />
                </Grid>

                {/* Payment Date */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="payment_date"
                    label="Payment Date"
                    type="date"
                    value={formData.payment_date}
                    onChange={handleChange}
                    size="small"
                    required
                    InputLabelProps={{ sx: { color: '#9ca3af' }, shrink: true }}
                    InputProps={{
                      inputRef: paymentDateRef,
                      sx: {
                        color: '#e5e7eb',
                        backgroundColor: '#0f2339',
                        borderRadius: 1,
                        pr: 0,
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
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="amount"
                    label="Amount (₹)"
                    placeholder="Enter payment amount"
                    type="number"
                    value={formData.amount}
                    onChange={handleChange}
                    size="small"
                    required
                    error={!!amountError}
                    helperText={amountError || (selectedInvoice ? `Max: ₹${selectedInvoiceAmount.toFixed(2)}` : '')}
                    InputLabelProps={{ sx: { color: '#9ca3af' } }}
                    InputProps={{
                      sx: {
                        color: '#e5e7eb',
                        backgroundColor: '#0f2339',
                        borderRadius: 1,
                      },
                    }}
                    FormHelperTextProps={{
                      sx: { 
                        color: amountError ? '#ef4444' : '#9ca3af',
                        fontSize: '0.75rem' 
                      },
                    }}
                    inputProps={{
                      min: 0,
                      step: 0.01,
                    }}
                  />
                </Grid>

                {/* Mode */}
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    name="payment_mode"
                    label="Mode"
                    value={formData.payment_mode}
                    onChange={handleChange}
                    size="small"
                    required
                    InputLabelProps={{ sx: { color: '#9ca3af' } }}
                    SelectProps={{ sx: { color: '#e5e7eb' } }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#0f2339',
                        borderRadius: 1,
                      },
                    }}
                  >
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="online">Online</MenuItem>
                    <MenuItem value="cheque">Cheque</MenuItem>
                    <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  </TextField>
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  sx={{
                    textTransform: 'none',
                    px: 3,
                    backgroundColor: '#0ea5e9',
                    '&:hover': { backgroundColor: '#0284c7' },
                  }}
                >
                  {loading ? 'Submitting...' : 'Submit Payment'}
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Card>
    </Box>
  );
}

export default CustomerPayment;

