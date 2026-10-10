import { useState } from 'react';
import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';

function RegistrationForm({ title, onSubmit }) {
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.(formValues);
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      elevation={3}
      sx={{
        p: { xs: 2, md: 4 },
        maxWidth: 480,
        width: '100%',
      }}
    >
      <Stack spacing={3}>
        <Typography variant="h5" fontWeight={600}>
          {title}
        </Typography>
        <TextField
          label="Name"
          name="name"
          value={formValues.name}
          onChange={handleChange}
          required
          fullWidth
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          value={formValues.email}
          onChange={handleChange}
          required
          fullWidth
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          value={formValues.password}
          onChange={handleChange}
          required
          fullWidth
        />
        <Box>
          <Button type="submit" variant="contained" size="large" fullWidth>
            Save
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}

export default RegistrationForm;

