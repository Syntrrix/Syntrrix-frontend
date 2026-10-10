import { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShareIcon from '@mui/icons-material/Share';
import DownloadIcon from '@mui/icons-material/Download';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '../../../context/AuthContext';

function Invoice() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const invoice = location.state?.invoice;
  const invoiceRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [whatsappError, setWhatsappError] = useState('');

  // Logged-in seller details (for dynamic invoice header)
  const sellerName = user?.company_name || user?.full_name || 'Seller';
  const sellerFullName = (user?.full_name || '').trim();
  const sellerAddress = (user?.address || '').trim();
  const sellerPhone = (user?.phone || '').trim();
  const sellerEmail = (user?.email || '').trim();
  const sellerContactLine = [sellerPhone ? `Mobile: ${sellerPhone}` : null, sellerEmail ? `Email: ${sellerEmail}` : null]
    .filter(Boolean)
    .join(' | ');

  // If no invoice data, redirect back
  if (!invoice) {
    navigate('/seller/customers/purchase');
    return null;
  }

  const handleBack = () => {
    navigate('/seller/customers/purchase');
  };

  const handleOpenShareModal = () => {
    setShareModalOpen(true);
  };

  const handleCloseShareModal = () => {
    setShareModalOpen(false);
  };

  const handleOpenWhatsappModal = () => {
    handleCloseShareModal();
    
    // Get customer WhatsApp/mobile number from invoice data
    // Priority: WhatsApp number > Mobile number
    // Check multiple possible paths for WhatsApp number first
    let customerNumber = 
      invoice.customerWhatsapp || 
      invoice.whatsapp_number || 
      invoice.customer?.whatsapp_number ||
      invoice.customer?.whatsappNumber ||
      '';
    
    // If WhatsApp number not available, use mobile number
    if (!customerNumber) {
      customerNumber = 
        invoice.customerMobile ||
        invoice.mobile_number ||
        invoice.customer?.mobile_number ||
        invoice.customer?.mobileNumber ||
        '';
    }
    
    // Format and set the number
    if (customerNumber) {
      // Convert to string and remove all non-digit characters first
      let cleanedNumber = String(customerNumber).replace(/\D/g, '');
      
      // Remove country code if present (91 or +91 at the start)
      if (cleanedNumber.startsWith('91') && cleanedNumber.length > 10) {
        cleanedNumber = cleanedNumber.substring(2);
      }
      
      // Ensure it's 10 digits (take last 10 if longer, keep as is if shorter)
      if (cleanedNumber.length >= 10) {
        cleanedNumber = cleanedNumber.slice(-10);
      }
      
      // Set the number if we have at least some digits
      if (cleanedNumber.length > 0) {
        setWhatsappNumber(cleanedNumber);
      } else {
        setWhatsappNumber('');
      }
    } else {
      // No number found, clear the field
      setWhatsappNumber('');
    }
    
    // Generate default message
    const invoiceDate = new Date(invoice.date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    
    const defaultMessage = `Hello 👋
Your Invoice is Ready

Invoice No: ${invoice.invoice}
Customer: ${invoice.customer}
Total Amount: ₹${grandTotal.toFixed(2)}

Download Invoice:
${window.location.origin}/seller/customers/invoice?invoice=${invoice.invoice}

Thank you for your business!`;
    
    setWhatsappMessage(defaultMessage);
    setWhatsappError('');
    setWhatsappModalOpen(true);
  };

  const handleCloseWhatsappModal = () => {
    setWhatsappModalOpen(false);
    setWhatsappError('');
  };

  const handleSendWhatsapp = () => {
    const number = whatsappNumber.trim();
    const message = whatsappMessage.trim();

    // Validate number
    if (number.length !== 10 || isNaN(number)) {
      setWhatsappError('Please enter valid 10 digit WhatsApp number');
      return;
    }

    // Validate message
    if (message === '') {
      setWhatsappError('Message cannot be empty');
      return;
    }

    // Format number with country code
    const whatsappNumberFormatted = '91' + number;
    const url = `https://wa.me/${whatsappNumberFormatted}?text=${encodeURIComponent(message)}`;

    // Open WhatsApp in new tab
    window.open(url, '_blank');
    
    // Close modal after opening WhatsApp
    handleCloseWhatsappModal();
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;

    setDownloading(true);
    try {
      // Get the invoice element
      const element = invoiceRef.current;
      
      // Create canvas from the element
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // Calculate PDF dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      // Add image to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename
      const fileName = `Invoice_${invoice.invoice}_${new Date().toISOString().split('T')[0]}.pdf`;

      // Save PDF
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Calculate totals
  const subtotal = invoice.items.reduce((sum, item) => sum + item.line, 0);
  const totalGst = invoice.items.reduce((sum, item) => {
    const gstAmount = item.line - (item.line / (1 + item.gst / 100));
    return sum + gstAmount;
  }, 0);
  const grandTotal = subtotal;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        p: { xs: 2, md: 4 },
        '@media print': {
          backgroundColor: 'white',
          p: 2,
        },
      }}
    >
      {/* Action Buttons - Hidden on Print */}
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          gap: 2,
          '@media print': {
            display: 'none',
          },
        }}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ textTransform: 'none' }}
        >
          Back
        </Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownloadPDF}
          disabled={downloading}
          sx={{
            textTransform: 'none',
            backgroundColor: '#0d6efd',
            '&:hover': { backgroundColor: '#0b5ed7' },
            '&:disabled': {
              backgroundColor: '#6c757d',
            },
          }}
        >
          {downloading ? 'Generating PDF...' : 'Download PDF'}
        </Button>
        <Button
          variant="contained"
          startIcon={<ShareIcon />}
          onClick={handleOpenShareModal}
          sx={{
            textTransform: 'none',
            backgroundColor: '#25D366',
            '&:hover': { backgroundColor: '#20ba5a' },
          }}
        >
          Share
        </Button>
      </Box>

      <Paper
        ref={invoiceRef}
        elevation={3}
        sx={{
          maxWidth: 800,
          mx: 'auto',
          p: { xs: 2, md: 4 },
          backgroundColor: 'white',
          '@media print': {
            boxShadow: 'none',
            maxWidth: '100%',
          },
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography variant="h4" fontWeight={700} sx={{ color: '#1e293b', mb: 1 }}>
            {sellerName}
          </Typography>
          {sellerAddress && (
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              {sellerAddress}
            </Typography>
          )}
          {sellerContactLine && (
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              {sellerContactLine}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Invoice Title */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography variant="h5" fontWeight={600} sx={{ color: '#1e293b' }}>
            TAX INVOICE
          </Typography>
        </Box>

        {/* Invoice Details */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
              <strong>Invoice No:</strong> {invoice.invoice}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
              <strong>Date:</strong> {new Date(invoice.date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
              <strong>Customer:</strong> {invoice.customer}
            </Typography>
            {invoice.whatsapp_number && (
              <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                <strong>WhatsApp:</strong> {invoice.whatsapp_number}
              </Typography>
            )}
            {(invoice.mobile_number || invoice.customerMobile || invoice.customer?.mobile_number) && (
              <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                <strong>Mobile:</strong> {invoice.mobile_number || invoice.customerMobile || invoice.customer?.mobile_number}
              </Typography>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Items Table */}
        <TableContainer>
          <Table sx={{ border: '1px solid #e2e8f0' }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f1f5f9' }}>
                <TableCell
                  sx={{
                    border: '1px solid #e2e8f0',
                    fontWeight: 600,
                    color: '#1e293b',
                    textAlign: 'center',
                    py: 1.5,
                  }}
                >
                  Sr
                </TableCell>
                <TableCell
                  sx={{
                    border: '1px solid #e2e8f0',
                    fontWeight: 600,
                    color: '#1e293b',
                    py: 1.5,
                  }}
                >
                  Item
                </TableCell>
                <TableCell
                  sx={{
                    border: '1px solid #e2e8f0',
                    fontWeight: 600,
                    color: '#1e293b',
                    py: 1.5,
                  }}
                >
                  Batch
                </TableCell>
                <TableCell
                  sx={{
                    border: '1px solid #e2e8f0',
                    fontWeight: 600,
                    color: '#1e293b',
                    textAlign: 'center',
                    py: 1.5,
                  }}
                >
                  Qty
                </TableCell>
                <TableCell
                  sx={{
                    border: '1px solid #e2e8f0',
                    fontWeight: 600,
                    color: '#1e293b',
                    textAlign: 'right',
                    py: 1.5,
                  }}
                >
                  Rate
                </TableCell>
                <TableCell
                  sx={{
                    border: '1px solid #e2e8f0',
                    fontWeight: 600,
                    color: '#1e293b',
                    textAlign: 'right',
                    py: 1.5,
                  }}
                >
                  GST
                </TableCell>
                <TableCell
                  sx={{
                    border: '1px solid #e2e8f0',
                    fontWeight: 600,
                    color: '#1e293b',
                    textAlign: 'right',
                    py: 1.5,
                  }}
                >
                  Amount
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoice.items.map((item, index) => {
                const rate = parseFloat(item.price) || 0;
                const qty = parseFloat(item.qty) || 0;
                const gst = parseFloat(item.gst) || 0;
                const amount = rate * qty;
                return (
                  <TableRow key={index}>
                    <TableCell
                      sx={{
                        border: '1px solid #e2e8f0',
                        textAlign: 'center',
                        py: 1.5,
                      }}
                    >
                      {index + 1}
                    </TableCell>
                    <TableCell
                      sx={{
                        border: '1px solid #e2e8f0',
                        py: 1.5,
                      }}
                    >
                      {item.item}
                    </TableCell>
                    <TableCell
                      sx={{
                        border: '1px solid #e2e8f0',
                        py: 1.5,
                      }}
                    >
                      {item.batch || 'N/A'}
                    </TableCell>
                    <TableCell
                      sx={{
                        border: '1px solid #e2e8f0',
                        textAlign: 'center',
                        py: 1.5,
                      }}
                    >
                      {qty}
                    </TableCell>
                    <TableCell
                      sx={{
                        border: '1px solid #e2e8f0',
                        textAlign: 'right',
                        py: 1.5,
                      }}
                    >
                      ₹{rate.toFixed(2)}
                    </TableCell>
                    <TableCell
                      sx={{
                        border: '1px solid #e2e8f0',
                        textAlign: 'right',
                        py: 1.5,
                      }}
                    >
                      {gst.toFixed(2)}%
                    </TableCell>
                    <TableCell
                      sx={{
                        border: '1px solid #e2e8f0',
                        textAlign: 'right',
                        py: 1.5,
                        fontWeight: 500,
                      }}
                    >
                      ₹{amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Total Section */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Box sx={{ minWidth: 250 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                Total:
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                ₹{grandTotal.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* Signature Section */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
              Customer Signature
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            {sellerFullName && (
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                {sellerFullName}
              </Typography>
            )}
            <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
              Authorized Signature
            </Typography>
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
            Thank you for your business!
          </Typography>
        </Box>
      </Paper>

      {/* Share Modal */}
      <Dialog
        open={shareModalOpen}
        onClose={handleCloseShareModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            Share Invoice
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleOpenWhatsappModal}
              sx={{
                textTransform: 'none',
                backgroundColor: '#25D366',
                '&:hover': { backgroundColor: '#20ba5a' },
                py: 1.5,
              }}
            >
              WhatsApp
            </Button>
            <Button
              variant="contained"
              fullWidth
              disabled
              sx={{
                textTransform: 'none',
                backgroundColor: '#ddd',
                color: '#666',
                cursor: 'not-allowed',
                py: 1.5,
                '&:disabled': {
                  backgroundColor: '#ddd',
                  color: '#666',
                },
              }}
            >
              SMS (Coming Soon)
            </Button>
            <Button
              variant="contained"
              fullWidth
              disabled
              sx={{
                textTransform: 'none',
                backgroundColor: '#ddd',
                color: '#666',
                cursor: 'not-allowed',
                py: 1.5,
                '&:disabled': {
                  backgroundColor: '#ddd',
                  color: '#666',
                },
              }}
            >
              Email (Coming Soon)
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={handleCloseShareModal}
            sx={{
              textTransform: 'none',
              backgroundColor: '#6c757d',
              color: '#fff',
              '&:hover': { backgroundColor: '#5a6268' },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* WhatsApp Modal */}
      <Dialog
        open={whatsappModalOpen}
        onClose={handleCloseWhatsappModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            Send via WhatsApp
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                Send To (WhatsApp Number)
              </Typography>
              <TextField
                fullWidth
                placeholder="Enter 10 digit mobile number"
                value={whatsappNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setWhatsappNumber(value);
                  setWhatsappError('');
                }}
                error={!!whatsappError && whatsappNumber.length > 0}
                helperText={whatsappError && whatsappNumber.length > 0 ? whatsappError : ''}
                inputProps={{
                  maxLength: 10,
                }}
              />
            </Box>
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                Message
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={6}
                value={whatsappMessage}
                onChange={(e) => {
                  setWhatsappMessage(e.target.value);
                  setWhatsappError('');
                }}
                error={!!whatsappError && whatsappMessage.length === 0}
                helperText={whatsappError && whatsappMessage.length === 0 ? whatsappError : ''}
                sx={{
                  '& .MuiInputBase-root': {
                    resize: 'vertical',
                  },
                }}
              />
            </Box>
            {whatsappError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {whatsappError}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={handleCloseWhatsappModal}
            sx={{
              textTransform: 'none',
              backgroundColor: '#6c757d',
              color: '#fff',
              '&:hover': { backgroundColor: '#5a6268' },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSendWhatsapp}
            sx={{
              textTransform: 'none',
              backgroundColor: '#25D366',
              '&:hover': { backgroundColor: '#20ba5a' },
            }}
          >
            Send WhatsApp
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Invoice;

