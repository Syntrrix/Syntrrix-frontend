import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Checkbox,
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
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate, Navigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { ROLE_IDS } from '../constants/roles';
import { createSeller } from '../api/sellers';

const LANDING_PATH = {
  [ROLE_IDS.ADMIN]: '/admin/dashboard',
  [ROLE_IDS.BUYER]: '/buyer/dashboard',
  [ROLE_IDS.SELLER]: '/seller/dashboard',
  [ROLE_IDS.TEAM_MANAGER]: '/team-manager/dashboard',
  [ROLE_IDS.AGENT]: '/agent/dashboard',
};

const resolveLandingPath = (roleId) => LANDING_PATH[roleId] || '/login';

const ROLE_TITLES = {
  [ROLE_IDS.ADMIN]: 'Login',
  [ROLE_IDS.BUYER]: 'Buyer Login',
  [ROLE_IDS.SELLER]: 'Seller Login',
  [ROLE_IDS.TEAM_MANAGER]: 'Team Manager Login',
  [ROLE_IDS.AGENT]: 'Agent Login',
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
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationForm, setRegistrationForm] = useState({
    full_name: '',
    email: '',
    phone: '',
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
    
    // For phone number, only allow digits and limit to 10 digits
    if (name === 'phone') {
      const numericValue = value.replace(/\D/g, ''); // Remove non-digits
      if (numericValue.length <= 10) {
        setRegistrationForm((prev) => ({ ...prev, [name]: numericValue }));
      }
    } else {
      setRegistrationForm((prev) => ({ ...prev, [name]: value }));
    }
    setRegistrationError('');
  };

  const handleOpenRegistration = () => {
    setShowRegistration(true);
    setRegistrationForm({
      full_name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    });
    setRegistrationError('');
  };

  const handleCloseRegistration = () => {
    setShowRegistration(false);
    setRegistrationForm({
      full_name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    });
    setRegistrationError('');
  };

  const handleRegistrationSubmit = async (event) => {
    event.preventDefault();
    setRegistrationError('');

    // Validation
    if (!registrationForm.full_name || !registrationForm.email || !registrationForm.phone || !registrationForm.password || !registrationForm.confirmPassword) {
      setRegistrationError('All fields are required');
      return;
    }

    // Phone number validation - must be exactly 10 digits
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(registrationForm.phone)) {
      setRegistrationError('Phone number must be exactly 10 digits');
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
        phone: registrationForm.phone,
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
        sx={{
          width: '100%',
          maxWidth: 480,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Login/Registration Form Card */}
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
          {!showRegistration ? (
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={3}>
            {/* Logo */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                mb: 0,
                pt: 0,
                width: '100%',
              }}
            >
              {!logoError ? (
                <Box
                  component="img"
                  src="/biznex-logo.png"
                  alt="Biznex Logo"
                  sx={{
                    maxWidth: '350px',
                    width: 'auto',
                    height: 'auto',
                    maxHeight: '150px',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                  onError={() => setLogoError(true)}
                />
              ) : (
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

            {/* Title */}
            <Typography
              variant="h5"
              sx={{
                color: 'white',
                fontWeight: 600,
                textAlign: 'center',
                mt: 0,
                mb: 0,
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
              {isSubmitting ? 'Signing in...' : 'Login'}
            </Button>

            {/* reCAPTCHA Text */}
            <Box
              sx={{
                textAlign: 'center',
                fontSize: '0.75rem',
                mt: 1,
                color: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              <Typography
                component="span"
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.75rem',
                }}
              >
                This site is protected by reCAPTCHA and the Google{' '}
              </Typography>
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/login');
                }}
                sx={{
                  color: '#0ea5e9',
                  textDecoration: 'none',
                  fontSize: '0.75rem',
                  '&:hover': {
                    textDecoration: 'underline',
                    color: '#0284c7',
                  },
                }}
              >
                Privacy Policy
              </Link>
              <Typography
                component="span"
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.75rem',
                }}
              >
                {' '}and{' '}
              </Typography>
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/login');
                }}
                sx={{
                  color: '#0ea5e9',
                  textDecoration: 'none',
                  fontSize: '0.75rem',
                  '&:hover': {
                    textDecoration: 'underline',
                    color: '#0284c7',
                  },
                }}
              >
                Terms of Service
              </Link>
              <Typography
                component="span"
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.75rem',
                }}
              >
                {' '}apply.
              </Typography>
            </Box>

            {/* Don't have an account? Create New */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 0.5,
                mt: 1,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.875rem',
                }}
              >
                Don't have an account?
              </Typography>
              <Link
                component="button"
                type="button"
                onClick={handleOpenRegistration}
                sx={{
                  color: '#4caf50',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  cursor: 'pointer',
                  '&:hover': {
                    textDecoration: 'underline',
                    color: '#45a049',
                  },
                }}
              >
                Create New
                <ArrowForwardIcon sx={{ fontSize: '1rem' }} />
              </Link>
            </Box>

              </Stack>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleRegistrationSubmit}>
              <Stack spacing={3}>
                {/* Logo */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    mb: 0,
                    pt: 0,
                    width: '100%',
                  }}
                >
                  {!logoError ? (
                    <Box
                      component="img"
                      src="/biznex-logo.png"
                      alt="Biznex Logo"
                      sx={{
                        maxWidth: '350px',
                        width: 'auto',
                        height: 'auto',
                        maxHeight: '150px',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                      onError={() => setLogoError(true)}
                    />
                  ) : (
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

                {/* Title with Back Button */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    variant="h5"
                    sx={{
                      color: 'white',
                      fontWeight: 600,
                      textAlign: 'center',
                      flex: 1,
                    }}
                  >
                    Sign Up
                  </Typography>
                </Box>
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

              {/* Phone Number Field */}
              <Box>
                <Typography
                  variant="body2"
                  sx={{ color: 'white', mb: 1, fontWeight: 500 }}
                >
                  Phone Number
                </Typography>
                <TextField
                  name="phone"
                  type="tel"
                  value={registrationForm.phone}
                  onChange={handleRegistrationChange}
                  required
                  fullWidth
                  placeholder="Enter 10-digit phone number"
                  inputProps={{
                    maxLength: 10,
                    pattern: '[0-9]{10}',
                  }}
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

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={isRegistering}
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
                  {isRegistering ? 'Creating...' : 'Submit'}
                </Button>

                {/* Back to Login Link */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    mt: 1,
                  }}
                >
                  <Link
                    component="button"
                    type="button"
                    onClick={handleCloseRegistration}
                    sx={{
                      color: '#0ea5e9',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      '&:hover': {
                        textDecoration: 'underline',
                        color: '#0284c7',
                      },
                    }}
                  >
                    Back to Login
                  </Link>
                </Box>
              </Stack>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default Login;
