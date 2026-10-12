import { Box, Card, CardContent, Grid, Typography, Avatar, Chip, Divider, TextField, Button, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../../../context/AuthContext';
import { useMemo, useState, useEffect } from 'react';
import { updateSellerProfile } from '../../../api/sellers';
import { useThemeContext } from '../../../context/ThemeContext';
import Swal from 'sweetalert2';

function SellerProfile() {
  const { isDark } = useThemeContext();
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    // User fields
    full_name: '',
    phone: '',
    company_name: '',
    gst_number: '',
    address: '',
    // UserMeta fields
    pan_number: '',
    account_holder_name: '',
    account_number: '',
    ifsc_code: '',
    bank_name: '',
  });

  // Initialize form data from user object
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        company_name: user.company_name || '',
        gst_number: user.gst_number || '',
        address: user.address || '',
        pan_number: user.meta?.pan_number || '',
        account_holder_name: user.meta?.account_holder_name || '',
        account_number: user.meta?.account_number || '',
        ifsc_code: user.meta?.ifsc_code || '',
        bank_name: user.meta?.bank_name || '',
      });
    }
  }, [user]);

  const initials = useMemo(() => {
    if (!formData.full_name) return 'SE';
    const parts = formData.full_name.split(' ').filter(Boolean);
    const [first = 'S', second = 'E'] = parts;
    return `${first[0] || 'S'}${(parts.length > 1 ? parts[parts.length - 1][0] : second[0]) || 'E'}`.toUpperCase();
  }, [formData.full_name]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await updateSellerProfile(formData);

      if (response && response.success) {
        // Update user in AuthContext
        const updatedUser = response.data;
        setUser(updatedUser);

        await Swal.fire({
          icon: 'success',
          title: 'Profile Updated',
          text: 'Your profile has been updated successfully.',
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        throw new Error(response?.message || 'Failed to update profile');
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile. Please try again.');
      await Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: err.message || 'Failed to update profile. Please try again.',
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
        minHeight: '100vh',
        color: isDark ? '#e5e7eb' : '#0f172a',
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
    >
      <Card
        sx={{
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          borderRadius: 2,
          border: isDark ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid #e2e8f0',
          boxShadow: isDark ? '0 20px 45px rgba(15,23,42,0.85)' : '0 10px 30px rgba(0,0,0,0.05)',
          p: { xs: 2, md: 3 },
        }}
      >
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#e5e7eb', mb: 2 }}>
            My Profile
          </Typography>
          <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.25)' }} />
        </Box>

        {error && (
          <Box sx={{ mb: 3 }}>
            <Alert severity="error" onClose={() => setError('')} sx={{ backgroundColor: '#1e293b', color: '#e5e7eb' }}>
              {error}
            </Alert>
          </Box>
        )}

        {/* Profile Header Card */}
        <Card
          sx={{
            backgroundColor: '#1e293b',
            borderRadius: 2,
            border: '1px solid rgba(148, 163, 184, 0.25)',
            p: 3,
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <Avatar
              sx={{
                width: 100,
                height: 100,
                bgcolor: '#22d3ee',
                fontSize: '2.5rem',
                fontWeight: 700,
              }}
            >
              {initials}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#e5e7eb', mb: 1 }}>
                {formData.full_name || 'N/A'}
              </Typography>
              <Typography variant="body1" sx={{ color: '#9ca3af', mb: 1 }}>
                {user?.email || 'N/A'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                <Chip
                  label={user?.status || 'N/A'}
                  color={getStatusColor(user?.status)}
                  sx={{
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                />
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                  {user?.role?.name || 'Seller'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Card>

        {/* Profile Details */}
        <Grid container spacing={3}>
          {/* Personal Information */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                backgroundColor: '#1e293b',
                borderRadius: 2,
                border: '1px solid rgba(148, 163, 184, 0.25)',
                p: 3,
                height: '100%',
                width: '350px',
              }}
            >
              <Typography variant="h6" fontWeight={600} sx={{ color: '#e5e7eb', mb: 2 }}>
                Personal Information
              </Typography>
              <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.25)', mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Full Name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#e5e7eb',
                      '& fieldset': {
                        borderColor: 'rgba(148, 163, 184, 0.25)',
                      },
                      '&:hover fieldset': {
                        borderColor: '#22d3ee',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#22d3ee',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#9ca3af',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#22d3ee',
                    },
                  }}
                />
                <TextField
                  label="Email"
                  value={user?.email || ''}
                  disabled
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#e5e7eb',
                      '& fieldset': {
                        borderColor: 'rgba(148, 163, 184, 0.25)',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#9ca3af',
                    },
                  }}
                />
                <TextField
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#e5e7eb',
                      '& fieldset': {
                        borderColor: 'rgba(148, 163, 184, 0.25)',
                      },
                      '&:hover fieldset': {
                        borderColor: '#22d3ee',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#22d3ee',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#9ca3af',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#22d3ee',
                    },
                  }}
                />
                <Box>
                  <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                    Status
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={user?.status || 'N/A'}
                      color={getStatusColor(user?.status)}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Card>
          </Grid>

          {/* Business Information */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                backgroundColor: '#1e293b',
                borderRadius: 2,
                border: '1px solid rgba(148, 163, 184, 0.25)',
                p: 3,
                height: '100%',
                width: '350px',
              }}
            >
              <Typography variant="h6" fontWeight={600} sx={{ color: '#e5e7eb', mb: 2 }}>
                Business Information
              </Typography>
              <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.25)', mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Company Name"
                  value={formData.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#e5e7eb',
                      '& fieldset': {
                        borderColor: 'rgba(148, 163, 184, 0.25)',
                      },
                      '&:hover fieldset': {
                        borderColor: '#22d3ee',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#22d3ee',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#9ca3af',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#22d3ee',
                    },
                  }}
                />
                <TextField
                  label="GST Number"
                  value={formData.gst_number}
                  onChange={(e) => handleInputChange('gst_number', e.target.value)}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#e5e7eb',
                      '& fieldset': {
                        borderColor: 'rgba(148, 163, 184, 0.25)',
                      },
                      '&:hover fieldset': {
                        borderColor: '#22d3ee',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#22d3ee',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#9ca3af',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#22d3ee',
                    },
                  }}
                />
                <TextField
                  label="Address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  fullWidth
                  multiline
                  rows={3}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#e5e7eb',
                      '& fieldset': {
                        borderColor: 'rgba(148, 163, 184, 0.25)',
                      },
                      '&:hover fieldset': {
                        borderColor: '#22d3ee',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#22d3ee',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#9ca3af',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#22d3ee',
                    },
                  }}
                />
              </Box>
            </Card>
          </Grid>

          {/* Banking Information */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                backgroundColor: '#1e293b',
                borderRadius: 2,
                border: '1px solid rgba(148, 163, 184, 0.25)',
                p: 3,
                height: '100%',
                width: '350px',
              }}
            >
              <Typography variant="h6" fontWeight={600} sx={{ color: '#e5e7eb', mb: 2 }}>
                Banking Information
              </Typography>
              <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.25)', mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Account Holder Name"
                  value={formData.account_holder_name}
                  onChange={(e) => handleInputChange('account_holder_name', e.target.value)}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#e5e7eb',
                      '& fieldset': {
                        borderColor: 'rgba(148, 163, 184, 0.25)',
                      },
                      '&:hover fieldset': {
                        borderColor: '#22d3ee',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#22d3ee',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#9ca3af',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#22d3ee',
                    },
                  }}
                />
                <TextField
                  label="Account Number"
                  value={formData.account_number}
                  onChange={(e) => handleInputChange('account_number', e.target.value)}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#e5e7eb',
                      '& fieldset': {
                        borderColor: 'rgba(148, 163, 184, 0.25)',
                      },
                      '&:hover fieldset': {
                        borderColor: '#22d3ee',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#22d3ee',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#9ca3af',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#22d3ee',
                    },
                  }}
                />
                <TextField
                  label="IFSC Code"
                  value={formData.ifsc_code}
                  onChange={(e) => handleInputChange('ifsc_code', e.target.value)}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#e5e7eb',
                      '& fieldset': {
                        borderColor: 'rgba(148, 163, 184, 0.25)',
                      },
                      '&:hover fieldset': {
                        borderColor: '#22d3ee',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#22d3ee',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#9ca3af',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#22d3ee',
                    },
                  }}
                />
                <TextField
                  label="Bank Name"
                  value={formData.bank_name}
                  onChange={(e) => handleInputChange('bank_name', e.target.value)}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#e5e7eb',
                      '& fieldset': {
                        borderColor: 'rgba(148, 163, 184, 0.25)',
                      },
                      '&:hover fieldset': {
                        borderColor: '#22d3ee',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#22d3ee',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#9ca3af',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#22d3ee',
                    },
                  }}
                />
                <TextField
                  label="PAN Number"
                  value={formData.pan_number}
                  onChange={(e) => handleInputChange('pan_number', e.target.value)}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#e5e7eb',
                      '& fieldset': {
                        borderColor: 'rgba(148, 163, 184, 0.25)',
                      },
                      '&:hover fieldset': {
                        borderColor: '#22d3ee',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#22d3ee',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#9ca3af',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#22d3ee',
                    },
                  }}
                />
              </Box>
            </Card>
          </Grid>

          {/* Account Information */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                backgroundColor: '#1e293b',
                borderRadius: 2,
                border: '1px solid rgba(148, 163, 184, 0.25)',
                p: 3,
                height: '100%',
                width: '350px',
              }}
            >
              <Typography variant="h6" fontWeight={600} sx={{ color: '#e5e7eb', mb: 2 }}>
                Account Information
              </Typography>
              <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.25)', mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                    User ID
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#e5e7eb', mt: 0.5 }}>
                    {user?.id || 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                    Role
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#e5e7eb', mt: 0.5 }}>
                    {user?.role?.name || 'Seller'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                    Account Created
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#e5e7eb', mt: 0.5 }}>
                    {formatDate(user?.created_at)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                    Last Updated
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#e5e7eb', mt: 0.5 }}>
                    {formatDate(user?.updated_at)}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading}
            sx={{
              backgroundColor: '#22d3ee',
              color: '#020617',
              fontWeight: 600,
              px: 4,
              py: 1.5,
              fontSize: '1rem',
              '&:hover': {
                backgroundColor: '#06b6d4',
              },
              '&:disabled': {
                backgroundColor: '#64748b',
                color: '#9ca3af',
              },
            }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1, color: '#020617' }} />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </Box>
      </Card>
    </Box>
  );
}

export default SellerProfile;
