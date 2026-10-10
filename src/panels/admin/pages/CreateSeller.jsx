import { useState } from 'react';
import { Stack, Typography, Box, Alert } from '@mui/material';
import Swal from 'sweetalert2';
import SellerRegistrationForm from './SellerRegistrationForm';
import { createSeller } from '../../../api/sellers';

function CreateSeller() {
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values) => {
    setStatus({ type: '', message: '' });
    setIsSubmitting(true);
    try {
      const response = await createSeller(values);
      const message = response.message || 'Seller registered successfully.';
      
      setStatus({
        type: 'success',
        message,
      });

      // Show success SweetAlert
      await Swal.fire({
        icon: 'success',
        title: 'Seller Created!',
        text: message,
        confirmButtonColor: '#2f855a',
        timer: 3000,
        timerProgressBar: true,
      });
    } catch (error) {
      const errorMessage = error.message || 'Failed to register seller.';
      setStatus({
        type: 'error',
        message: errorMessage,
      });

      // Show error SweetAlert
      await Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        text: errorMessage,
        confirmButtonColor: '#d32f2f',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        p: 3,
        backgroundColor: '#f5f5f5',
      }}
    >
      <Stack spacing={2} sx={{ width: '100%', maxWidth: 720 }}>
        <Typography variant="h4" fontWeight={600} textAlign="center">
          Create Seller
        </Typography>

     

        {status.message && (
          <Alert severity={status.type} onClose={() => setStatus({ type: '', message: '' })}>
            {status.message}
          </Alert>
        )}

        <SellerRegistrationForm
          title="Seller Details"
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </Stack>
    </Box>
  );
}

export default CreateSeller;
