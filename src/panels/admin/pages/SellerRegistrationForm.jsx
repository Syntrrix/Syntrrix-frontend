import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Stack,
  TextField,
  MenuItem,
  Button,
  Card,
  CardContent,
  Typography,
} from '@mui/material';

// Seller Registration Form Component

function SellerRegistrationForm({ title, onSubmit, isSubmitting }) {
  const [form, setForm] = useState({
    full_name: '',
    password: '',
    email: '',
    phone: '',
    company_name: '',
    gst_number: '',
    address: '',
    status: 'pending',
    pan_number: '',
    account_holder_name: '',
    account_number: '',
    ifsc_code: '',
    bank_name: '',
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" mb={2} fontWeight={600}>
          {title}
        </Typography>

        <form onSubmit={handleFormSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Full Name"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              required
            />

            <TextField
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />

            <TextField
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />

            <TextField
              label="Phone Number"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              required
            />

            <TextField
              label="Company Name"
              name="company_name"
              value={form.company_name}
              onChange={handleChange}
            />

            <TextField
              label="GST Number"
              name="gst_number"
              value={form.gst_number}
              onChange={handleChange}
            />

            <TextField
              label="Address"
              name="address"
              multiline
              rows={3}
              value={form.address}
              onChange={handleChange}
              required
            />

            <TextField
              label="PAN Number"
              name="pan_number"
              value={form.pan_number}
              onChange={handleChange}
              required
            />

            <TextField
              label="Account Holder Name"
              name="account_holder_name"
              value={form.account_holder_name}
              onChange={handleChange}
              required
            />

            <TextField
              label="Account Number"
              name="account_number"
              value={form.account_number}
              onChange={handleChange}
              required
            />

            <TextField
              label="IFSC Code"
              name="ifsc_code"
              value={form.ifsc_code}
              onChange={handleChange}
              required
            />

            <TextField
              label="Bank Name"
              name="bank_name"
              value={form.bank_name}
              onChange={handleChange}
              required
            />

            <TextField
              label="Status"
              name="status"
              select
              value={form.status}
              onChange={handleChange}
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isSubmitting}
              sx={{
                backgroundColor: '#2f855a',
                '&:hover': {
                  backgroundColor: '#276749',
                },
              }}
            >
              {isSubmitting ? 'Creating Seller...' : 'CREATE SELLER'}
            </Button>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}

SellerRegistrationForm.propTypes = {
  title: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
};

SellerRegistrationForm.defaultProps = {
  isSubmitting: false,
};

export default SellerRegistrationForm;



