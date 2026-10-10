import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useNavigate, Navigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { ROLE_IDS } from '../constants/roles';
import { createSeller } from '../api/sellers';

const LANDING_PATH = {
  [ROLE_IDS.ADMIN]: '/admin/dashboard',
  [ROLE_IDS.BUYER]: '/buyer/dashboard',
  [ROLE_IDS.SELLER]: '/seller/dashboard',
};

const resolveLandingPath = (roleId) => LANDING_PATH[roleId] || '/login';

const ROLE_TITLES = {
  [ROLE_IDS.ADMIN]: 'Admin Login',
  [ROLE_IDS.BUYER]: 'Buyer Login',
  [ROLE_IDS.SELLER]: 'Seller Login',
};

function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState(ROLE_IDS.ADMIN);
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [registrationForm, setRegistrationForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showRegistrationPassword, setShowRegistrationPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Check if logo image exists
  useEffect(() => {
    const img = new Image();
    img.onerror = () => setLogoError(true);
    img.onload = () => setLogoError(false);
    img.src = '/biznex-logo.png';
  }, []);

  if (isAuthenticated) {
    return <Navigate to={resolveLandingPath(user?.role?.id)} replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleRoleSwitch = (roleId) => {
    setSelectedRole(roleId);
    setError('');
    setForm({ email: '', password: '' });
  };

  const handleRegistrationChange = (event) => {
    const { name, value } = event.target;
    setRegistrationForm((prev) => ({ ...prev, [name]: value }));
    setRegistrationError('');
  };

  const handleOpenRegistration = () => {
    setRegistrationModalOpen(true);
    setRegistrationForm({
      full_name: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
    setRegistrationError('');
  };

  const handleCloseRegistration = () => {
    setRegistrationModalOpen(false);
    setRegistrationForm({
      full_name: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
    setRegistrationError('');
  };

  const handleRegistrationSubmit = async (event) => {
    event.preventDefault();
    setRegistrationError('');

    // Validation
    if (!registrationForm.full_name || !registrationForm.email || !registrationForm.password || !registrationForm.confirmPassword) {
      setRegistrationError('All fields are required');
      return;
    }

    if (registrationForm.password !== registrationForm.confirmPassword) {
      setRegistrationError('Passwords do not match');
      return;
    }

    if (registrationForm.password.length < 6) {
      setRegistrationError('Password must be at least 6 characters long');
      return;
    }

    setIsRegistering(true);
    try {
      // Prepare payload - provide placeholder values for required backend fields
      // Note: Backend requires phone and bank details, but user only wants basic fields
      const payload = {
        full_name: registrationForm.full_name,
        email: registrationForm.email,
        password: registrationForm.password,
        phone: '0000000000', // Required by backend - placeholder value (10 digits)
        status: 'inactive', // Set status to inactive as requested
        pan_number: '0000000000', // Required by backend - placeholder value (max 10 chars)
        account_holder_name: registrationForm.full_name, // Use full name as placeholder
        account_number: '000000000000', // Required by backend - placeholder value (max 30 chars)
        ifsc_code: '00000000000', // Required by backend - placeholder value (max 11 chars)
        bank_name: 'PLACEHOLDER', // Required by backend - placeholder value (max 120 chars)
      };

      const response = await createSeller(payload);

      if (response && response.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Registration Successful!',
          text: 'Seller account created successfully. Your account is currently inactive.',
          confirmButtonColor: '#0ea5e9',
        });
        handleCloseRegistration();
      } else {
        throw new Error(response?.message || 'Failed to create seller account');
      }
    } catch (err) {
      let errorMessage = 'Failed to create seller account.';
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        if (errorData.errors) {
          const errorFields = Object.keys(errorData.errors);
          errorMessage = errorFields.map(field => 
            `${field}: ${Array.isArray(errorData.errors[field]) ? errorData.errors[field].join(', ') : errorData.errors[field]}`
          ).join('\n');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setRegistrationError(errorMessage);
      await Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        text: errorMessage,
        confirmButtonColor: '#d32f2f',
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await login(form);
      const roleId = response?.user?.role?.id;
      const roleName = response?.user?.role?.name || 'User';

      // Show success alert
      await Swal.fire({
        icon: 'success',
        title: 'Login Successful!',
        text: `Welcome back, ${response.user.full_name}!`,
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,
      });

      navigate(resolveLandingPath(roleId), { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
      await Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: err.message || 'Invalid credentials. Please try again.',
        confirmButtonColor: '#2f855a',
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
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        position: 'relative',
        overflow: 'hidden',
        p: 2,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: '50%',
          height: '100%',
          background: 'linear-gradient(135deg, rgba(255,152,0,0.1) 0%, rgba(255,152,0,0.05) 100%)',
          borderRadius: '50% 0 0 50%',
          filter: 'blur(100px)',
        },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: '100%',
          maxWidth: 480,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo Box */}
        <Box
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 2,
            p: 3,
            mb: 3,
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            boxSizing: 'border-box',
            height: '140px',
            width: '480px', // Fixed height for the container
            overflow: 'hidden', // Prevent image from overflowing
          }}
        >
          {/* Biznex Logo Image */}
          <Box
            component="img"
            src="/biznex-logo.png"
            alt="Biznex Logo"
            sx={{
              width: '480px',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
            onError={() => setLogoError(true)}
          />
          {/* Fallback: Show text only if image fails to load */}
          {logoError && (
            <>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #00bcd4 0%, #4caf50 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  mb: 1,
                }}
              >
                Biznex
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, color: '#666' }}>
                Agricultural Marketplace Platform
              </Typography>
            </>
          )}
        </Box>

        {/* Login Form Card */}
        <Box
          sx={{
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderRadius: 2,
            p: 4,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(148, 163, 184, 0.1)',
          }}
        >
          <Stack spacing={3}>
            {/* Title */}
            <Typography
              variant="h5"
              sx={{
                color: 'white',
                fontWeight: 600,
                textAlign: 'center',
                mb: 1,
              }}
            >
              {ROLE_TITLES[selectedRole]}
            </Typography>

            {/* Error Message */}
            {error && (
              <Box
                sx={{
                  backgroundColor: 'rgba(244, 67, 54, 0.2)',
                  color: '#ffcdd2',
                  p: 1.5,
                  borderRadius: 1,
                  fontSize: '0.875rem',
                }}
              >
                {error}
              </Box>
            )}

            {/* Email Field */}
            <Box>
              <Typography
                variant="body2"
                sx={{ color: 'white', mb: 1, fontWeight: 500 }}
              >
                Email
              </Typography>
              <TextField
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                fullWidth
                placeholder="Enter your email"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                    borderRadius: 2,
                    '& fieldset': {
                      border: 'none',
                    },
                  },
                }}
              />
            </Box>

            {/* Password Field */}
            <Box>
              <Typography
                variant="body2"
                sx={{ color: 'white', mb: 1, fontWeight: 500 }}
              >
                Password
              </Typography>
              <TextField
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                required
                fullWidth
                placeholder="Enter your password"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                    borderRadius: 2,
                    '& fieldset': {
                      border: 'none',
                    },
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleTogglePassword}
                        edge="end"
                        sx={{ color: '#64748b' }}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Remember Me & Forgot Password */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    sx={{
                    color: '#0ea5e9',
                    '&.Mui-checked': {
                      color: '#0ea5e9',
                    },
                    }}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    Remember me
                  </Typography>
                }
              />
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  // TODO: Implement forgot password
                }}
                sx={{
                  color: '#0ea5e9',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  '&:hover': {
                    textDecoration: 'underline',
                    color: '#0284c7',
                  },
                }}
              >
                Forgot Password?
              </Link>
            </Box>

            {/* Sign In Button */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isSubmitting}
              sx={{
                backgroundColor: '#0ea5e9',
                color: 'white',
                fontWeight: 600,
                py: 1.5,
                borderRadius: 2,
                fontSize: '1rem',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#0284c7',
                },
                '&:disabled': {
                  backgroundColor: 'rgba(14, 165, 233, 0.5)',
                  color: 'rgba(255, 255, 255, 0.7)',
                },
              }}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>

            {/* Role Switch Links */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                mt: 2,
              }}
            >
              {/* Left side link */}
              {selectedRole === ROLE_IDS.ADMIN && (
                <Link
                  component="button"
                  type="button"
                  onClick={() => handleRoleSwitch(ROLE_IDS.BUYER)}
                  sx={{
                    color: '#0ea5e9',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    fontWeight: 500,
                    '&:hover': {
                      textDecoration: 'underline',
                      color: '#0284c7',
                    },
                  }}
                >
                  Switch to Buyer Login
                </Link>
              )}
              {selectedRole === ROLE_IDS.BUYER && (
                <Link
                  component="button"
                  type="button"
                  onClick={() => handleRoleSwitch(ROLE_IDS.ADMIN)}
                  sx={{
                    color: '#0ea5e9',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    fontWeight: 500,
                    '&:hover': {
                      textDecoration: 'underline',
                      color: '#0284c7',
                    },
                  }}
                >
                  Switch to Admin Login
                </Link>
              )}
              {selectedRole === ROLE_IDS.SELLER && (
                <Link
                  component="button"
                  type="button"
                  onClick={() => handleRoleSwitch(ROLE_IDS.ADMIN)}
                  sx={{
                    color: '#0ea5e9',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    fontWeight: 500,
                    '&:hover': {
                      textDecoration: 'underline',
                      color: '#0284c7',
                    },
                  }}
                >
                  Switch to Admin Login
                </Link>
              )}

              {/* Right side link */}
              {selectedRole === ROLE_IDS.ADMIN && (
                <Link
                  component="button"
                  type="button"
                  onClick={() => handleRoleSwitch(ROLE_IDS.SELLER)}
                  sx={{
                    color: '#0ea5e9',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    fontWeight: 500,
                    '&:hover': {
                      textDecoration: 'underline',
                      color: '#0284c7',
                    },
                  }}
                >
                  Switch to Seller Login
                </Link>
              )}
              {selectedRole === ROLE_IDS.BUYER && (
                <Link
                  component="button"
                  type="button"
                  onClick={() => handleRoleSwitch(ROLE_IDS.SELLER)}
                  sx={{
                    color: '#0ea5e9',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    fontWeight: 500,
                    '&:hover': {
                      textDecoration: 'underline',
                      color: '#0284c7',
                    },
                  }}
                >
                  Switch to Seller Login
                </Link>
              )}
              {selectedRole === ROLE_IDS.SELLER && (
                <Link
                  component="button"
                  type="button"
                  onClick={() => handleRoleSwitch(ROLE_IDS.BUYER)}
                  sx={{
                    color: '#0ea5e9',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    fontWeight: 500,
                    '&:hover': {
                      textDecoration: 'underline',
                      color: '#0284c7',
                    },
                  }}
                >
                  Switch to Buyer Login
                </Link>
              )}
            </Box>

            {/* Create Seller Link - Only show for Seller login */}
            {selectedRole === ROLE_IDS.SELLER && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '100%',
                  mt: 2,
                }}
              >
                <Link
                  component="button"
                  type="button"
                  onClick={handleOpenRegistration}
                  sx={{
                    color: '#0ea5e9',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    fontWeight: 500,
                    '&:hover': {
                      textDecoration: 'underline',
                      color: '#0284c7',
                    },
                  }}
                >
                  Create Seller
                </Link>
              </Box>
            )}
          </Stack>
        </Box>
      </Box>

      {/* Seller Registration Dialog */}
      <Dialog
        open={registrationModalOpen}
        onClose={handleCloseRegistration}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderRadius: 2,
            border: '1px solid rgba(148, 163, 184, 0.1)',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: 'white',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            pb: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
            Create Seller Account
          </Typography>
          <IconButton
            onClick={handleCloseRegistration}
            sx={{
              color: '#9ca3af',
              '&:hover': {
                backgroundColor: 'rgba(148, 163, 184, 0.1)',
                color: 'white',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Box component="form" onSubmit={handleRegistrationSubmit}>
          <DialogContent sx={{ pt: 3 }}>
            <Stack spacing={3}>
              {/* Error Message */}
              {registrationError && (
                <Box
                  sx={{
                    backgroundColor: 'rgba(244, 67, 54, 0.2)',
                    color: '#ffcdd2',
                    p: 1.5,
                    borderRadius: 1,
                    fontSize: '0.875rem',
                  }}
                >
                  {registrationError}
                </Box>
              )}

              {/* Full Name Field */}
              <Box>
                <Typography
                  variant="body2"
                  sx={{ color: 'white', mb: 1, fontWeight: 500 }}
                >
                  Full Name
                </Typography>
                <TextField
                  name="full_name"
                  value={registrationForm.full_name}
                  onChange={handleRegistrationChange}
                  required
                  fullWidth
                  placeholder="Enter your full name"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white',
                      borderRadius: 2,
                      '& fieldset': {
                        border: 'none',
                      },
                    },
                  }}
                />
              </Box>

              {/* Email Field */}
              <Box>
                <Typography
                  variant="body2"
                  sx={{ color: 'white', mb: 1, fontWeight: 500 }}
                >
                  Email
                </Typography>
                <TextField
                  name="email"
                  type="email"
                  value={registrationForm.email}
                  onChange={handleRegistrationChange}
                  required
                  fullWidth
                  placeholder="Enter your email"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white',
                      borderRadius: 2,
                      '& fieldset': {
                        border: 'none',
                      },
                    },
                  }}
                />
              </Box>

              {/* Password Field */}
              <Box>
                <Typography
                  variant="body2"
                  sx={{ color: 'white', mb: 1, fontWeight: 500 }}
                >
                  Password
                </Typography>
                <TextField
                  name="password"
                  type={showRegistrationPassword ? 'text' : 'password'}
                  value={registrationForm.password}
                  onChange={handleRegistrationChange}
                  required
                  fullWidth
                  placeholder="Enter your password"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white',
                      borderRadius: 2,
                      '& fieldset': {
                        border: 'none',
                      },
                    },
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowRegistrationPassword(!showRegistrationPassword)}
                          edge="end"
                          sx={{ color: '#64748b' }}
                        >
                          {showRegistrationPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {/* Confirm Password Field */}
              <Box>
                <Typography
                  variant="body2"
                  sx={{ color: 'white', mb: 1, fontWeight: 500 }}
                >
                  Confirm Password
                </Typography>
                <TextField
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={registrationForm.confirmPassword}
                  onChange={handleRegistrationChange}
                  required
                  fullWidth
                  placeholder="Confirm your password"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white',
                      borderRadius: 2,
                      '& fieldset': {
                        border: 'none',
                      },
                    },
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                          sx={{ color: '#64748b' }}
                        >
                          {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button
              onClick={handleCloseRegistration}
              sx={{
                color: '#9ca3af',
                fontWeight: 500,
                '&:hover': {
                  backgroundColor: 'rgba(148, 163, 184, 0.1)',
                },
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isRegistering}
              sx={{
                backgroundColor: '#0ea5e9',
                color: 'white',
                fontWeight: 600,
                px: 3,
                borderRadius: 2,
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#0284c7',
                },
                '&:disabled': {
                  backgroundColor: 'rgba(14, 165, 233, 0.5)',
                  color: 'rgba(255, 255, 255, 0.7)',
                },
              }}
            >
              {isRegistering ? 'Creating...' : 'Submit'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}

export default Login;
