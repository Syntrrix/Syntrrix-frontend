import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Divider,
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
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate, Navigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { ROLE_IDS } from '../constants/roles';
import { createSeller } from '../api/sellers';
import { useThemeContext } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

const LANDING_PATH = {
  [ROLE_IDS.ADMIN]: '/admin/dashboard',
  [ROLE_IDS.BUYER]: '/buyer/dashboard',
  [ROLE_IDS.SELLER]: '/seller/dashboard',
  [ROLE_IDS.TEAM_MANAGER]: '/team-manager/dashboard',
  [ROLE_IDS.AGENT]: '/agent/dashboard',
};

const resolveLandingPath = (roleId) => LANDING_PATH[roleId] || '/login';

const ROLE_TITLES = {
  [ROLE_IDS.ADMIN]: 'Admin Login',
  [ROLE_IDS.BUYER]: 'Buyer Login',
  [ROLE_IDS.SELLER]: 'Seller Login',
  [ROLE_IDS.TEAM_MANAGER]: 'Team Manager Login',
  [ROLE_IDS.AGENT]: 'Agent Login',
};

// Exact Syntrrix Logo SVG Component (Matching Image 100%)
const SyntrrixLogo = ({ width = 175, height = 175 }) => (
  <svg width={width} height={height} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pinBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="45%" stopColor="#0099ff" />
        <stop offset="100%" stopColor="#0066fe" />
      </linearGradient>
    </defs>

    {/* Sparkle 1 Top Left */}
    <path d="M40 50 L43 36 L46 50 L60 53 L46 56 L43 70 L40 56 L26 53 Z" fill="#38bdf8" />
    {/* Sparkle 2 Mid Left */}
    <path d="M28 86 L30 76 L32 86 L42 88 L32 90 L30 100 L28 90 L18 88 Z" fill="#38bdf8" />

    {/* Location Pin Shape */}
    <path
      d="M100 20 C144 20 180 56 180 100 C180 135 155 165 120 178 L100 195 L80 178 C45 165 20 135 20 100 C20 56 56 20 100 20 Z"
      fill="url(#pinBodyGrad)"
    />

    {/* Dark Inner Cutout Ring */}
    <circle cx="100" cy="92" r="43" fill="#040b19" />

    {/* White Chat Bubble Body */}
    <path
      d="M100 56 C119 56 135 71 135 91 C135 106 125 118 111 123 L100 134 L96 124 C78 121 65 108 65 91 C65 71 81 56 100 56 Z"
      fill="#ffffff"
    />

    {/* Three Dots Inside Chat Bubble */}
    <circle cx="86" cy="91" r="5" fill="#0066fe" />
    <circle cx="100" cy="91" r="5" fill="#0066fe" />
    <circle cx="114" cy="91" r="5" fill="#0066fe" />

    {/* Base Oval Accent */}
    <ellipse cx="100" cy="188" rx="42" ry="6" fill="#00c6ff" opacity="0.9" />
  </svg>
);

// Google Sign-In Icon SVG Component
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

// State-of-the-Art Interactive Canvas Snowfall Effect Component (Active in Dark Theme, Reacts to Typing)
const Snowfall = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    let windVelocityX = 0;
    let windVelocityY = 0;

    const handleKeyDown = (e) => {
      const k = e && e.key ? e.key : '';
      const isChar = k.length === 1 || k === 'Backspace' || k === 'Delete' || k === 'Enter';
      if (isChar) {
        const dir = (Math.random() - 0.5) * 7.0;
        windVelocityX += dir;
        windVelocityY -= Math.random() * 1.5 + 0.5;
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const numFlakes = 130;
    const flakes = [];
    for (let i = 0; i < numFlakes; i++) {
      flakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 3.8 + 0.8,
        d: Math.random() * numFlakes,
        speed: Math.random() * 1.2 + 0.4,
        opacity: Math.random() * 0.75 + 0.25,
      });
    }

    let angle = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      angle += 0.012;

      windVelocityX *= 0.93;
      windVelocityY *= 0.93;

      for (let i = 0; i < numFlakes; i++) {
        const p = flakes[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2, false);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.85)';
        ctx.shadowBlur = p.r > 2.5 ? 9 : 4;
        ctx.fill();

        const flakeWindScale = p.r / 2.2;
        p.y += p.speed + windVelocityY * flakeWindScale;
        p.x += Math.sin(angle + p.d) * 0.8 + windVelocityX * flakeWindScale;

        if (p.y > height + 15) {
          flakes[i] = {
            x: Math.random() * width,
            y: -15,
            r: p.r,
            d: p.d,
            speed: p.speed,
            opacity: p.opacity,
          };
        } else if (p.y < -30) {
          p.y = height + 10;
        }

        if (p.x > width + 20) {
          flakes[i].x = -20;
        } else if (p.x < -20) {
          flakes[i].x = width + 20;
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const { isDark } = useThemeContext();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState(ROLE_IDS.ADMIN);
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  };

  const handleOpenRegistration = () => {
    setShowRegistration(true);
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

    if (!registrationForm.full_name || !registrationForm.email || !registrationForm.phone || !registrationForm.password || !registrationForm.confirmPassword) {
      setRegistrationError('All fields are required');
      return;
    }

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
      const payload = {
        full_name: registrationForm.full_name,
        email: registrationForm.email,
        password: registrationForm.password,
        phone: registrationForm.phone,
        status: 'inactive',
        pan_number: '0000000000',
        account_holder_name: registrationForm.full_name,
        account_number: '000000000000',
        ifsc_code: '00000000000',
        bank_name: 'PLACEHOLDER',
      };

      const response = await createSeller(payload);

      if (response && response.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Registration Successful!',
          text: 'Seller account created successfully.',
          confirmButtonColor: '#00a6ff',
        });
        handleCloseRegistration();
      } else {
        throw new Error(response?.message || 'Failed to create seller account');
      }
    } catch (err) {
      setRegistrationError(err.message || 'Failed to create seller account.');
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
      setError(err.message || 'Invalid credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#030816',
        backgroundImage: "url('/background_image.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        position: 'relative',
        overflow: 'hidden',
        p: { xs: 2, sm: 3, md: 4 },
        boxSizing: 'border-box',
        transition: 'background 0.4s ease',
      }}
    >

      <Box
        sx={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 1000,
        }}
      >
        <ThemeToggle size="medium" />
      </Box>

      <Box
        sx={{
          width: '100%',
          maxWidth: 1240,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          justifyContent: { xs: 'center', md: 'flex-end' },
          position: 'relative',
          zIndex: 1,
          my: 'auto',
          px: { xs: 2, md: 6 },
        }}
      >

        <Box
          sx={{
            width: { xs: '100%', sm: 460, md: 480 },
            borderRadius: '24px',
            bgcolor: isDark ? 'rgba(12, 19, 36, 0.75)' : 'rgba(255, 255, 255, 0.88)',
            border: isDark ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid rgba(226, 232, 240, 0.9)',
            boxShadow: isDark
              ? '0 25px 60px -12px rgba(0, 0, 0, 0.85), 0 0 40px rgba(0, 166, 255, 0.12)'
              : '0 20px 50px rgba(0, 0, 0, 0.08)',
            p: { xs: 3, sm: 4, md: 4.5 },
            boxSizing: 'border-box',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {!showRegistration ? (
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <Box textAlign="center">
                  <Typography variant="h5" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', fontSize: '1.45rem', mb: 0.6 }}>
                    Welcome Back 👋
                  </Typography>
                  <Typography variant="body2" sx={{ color: isDark ? '#8696a0' : '#64748b', fontSize: '0.86rem' }}>
                    Login to access your Syntrrix account
                  </Typography>
                </Box>

                {error && (
                  <Box
                    sx={{
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      p: 1.5,
                      borderRadius: '12px',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      textAlign: 'center',
                    }}
                  >
                    {error}
                  </Box>
                )}

                <Box>
                  <Typography variant="body2" sx={{ color: isDark ? '#cbd5e1' : '#334155', mb: 0.8, fontWeight: 700, fontSize: '0.84rem' }}>
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
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailOutlinedIcon sx={{ color: '#64748b', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      sx: {
                        bgcolor: isDark ? '#131c31' : '#f8fafc',
                        borderRadius: '12px',
                        color: isDark ? '#ffffff' : '#0f172a',
                        height: 48,
                        fontSize: '0.9rem',
                        border: isDark ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid #cbd5e1',
                        '& input': {
                          color: isDark ? '#ffffff' : '#0f172a',
                          '&::placeholder': { color: '#64748b', opacity: 1 },
                        },
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                        '&:hover': { border: '1px solid #00a6ff' },
                        '&.Mui-focused': { border: '1px solid #00a6ff', boxShadow: '0 0 10px rgba(0, 166, 255, 0.25)' },
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ color: isDark ? '#cbd5e1' : '#334155', mb: 0.8, fontWeight: 700, fontSize: '0.84rem' }}>
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
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon sx={{ color: '#64748b', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={handleTogglePassword} edge="end" sx={{ color: '#64748b' }}>
                            {showPassword ? <VisibilityOffIcon sx={{ fontSize: 20 }} /> : <VisibilityIcon sx={{ fontSize: 20 }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                      sx: {
                        bgcolor: isDark ? '#131c31' : '#f8fafc',
                        borderRadius: '12px',
                        color: isDark ? '#ffffff' : '#0f172a',
                        height: 48,
                        fontSize: '0.9rem',
                        border: isDark ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid #cbd5e1',
                        '& input': {
                          color: isDark ? '#ffffff' : '#0f172a',
                          '&::placeholder': { color: '#64748b', opacity: 1 },
                        },
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                        '&:hover': { border: '1px solid #00a6ff' },
                        '&.Mui-focused': { border: '1px solid #00a6ff', boxShadow: '0 0 10px rgba(0, 166, 255, 0.25)' },
                      },
                    }}
                  />
                </Box>

                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 0.2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        sx={{
                          color: '#00a6ff',
                          p: 0.5,
                          mr: 0.5,
                          '&.Mui-checked': { color: '#00a6ff' },
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ color: isDark ? '#cbd5e1' : '#475569', fontSize: '0.84rem', fontWeight: 500 }}>
                        Remember me
                      </Typography>
                    }
                  />
                  <Link
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      Swal.fire({
                        icon: 'info',
                        title: 'Password Reset',
                        text: 'Please contact your administrator to reset your account password.',
                        confirmButtonColor: '#00a6ff',
                      });
                    }}
                    sx={{
                      color: '#00a6ff',
                      textDecoration: 'none',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    Forgot Password?
                  </Link>
                </Stack>

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={isSubmitting}
                  sx={{
                    backgroundColor: '#00a6ff',
                    color: '#ffffff',
                    fontWeight: 700,
                    height: 48,
                    borderRadius: '12px',
                    fontSize: '0.98rem',
                    textTransform: 'none',
                    boxShadow: '0 4px 18px rgba(0, 166, 255, 0.45)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: '#0091ea',
                      boxShadow: '0 6px 22px rgba(0, 166, 255, 0.6)',
                    },
                    '&:disabled': {
                      backgroundColor: 'rgba(0, 166, 255, 0.5)',
                      color: 'rgba(255, 255, 255, 0.7)',
                    },
                  }}
                >
                  {isSubmitting ? 'Signing in...' : 'Login'}
                </Button>

                <Stack direction="row" alignItems="center" spacing={2} sx={{ my: 0.5 }}>
                  <Divider sx={{ flex: 1, borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : '#e2e8f0' }} />
                  <Typography variant="caption" sx={{ color: isDark ? '#64748b' : '#94a3b8', fontWeight: 600 }}>
                    or
                  </Typography>
                  <Divider sx={{ flex: 1, borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : '#e2e8f0' }} />
                </Stack>

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<GoogleIcon />}
                  onClick={() => {
                    Swal.fire({
                      icon: 'info',
                      title: 'Google Sign-In',
                      text: 'Google single sign-on is enabled for corporate workspace accounts.',
                      confirmButtonColor: '#00a6ff',
                    });
                  }}
                  sx={{
                    height: 48,
                    borderRadius: '12px',
                    borderColor: isDark ? 'rgba(148, 163, 184, 0.25)' : '#cbd5e1',
                    color: isDark ? '#ffffff' : '#0f172a',
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    backgroundColor: isDark ? '#131c31' : '#ffffff',
                    '&:hover': {
                      borderColor: isDark ? '#ffffff' : '#0f172a',
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f8fafc',
                    },
                  }}
                >
                  Login with Google
                </Button>

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 0.8,
                    pt: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.86rem' }}>
                    Don't have an account?
                  </Typography>
                  <Link
                    component="button"
                    type="button"
                    onClick={handleOpenRegistration}
                    sx={{
                      color: '#00a6ff',
                      textDecoration: 'none',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.4,
                      cursor: 'pointer',
                      '&:hover': {
                        textDecoration: 'underline',
                        color: '#38bdf8',
                      },
                    }}
                  >
                    Create New
                    <ArrowForwardIcon sx={{ fontSize: '0.95rem' }} />
                  </Link>
                </Box>
              </Stack>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleRegistrationSubmit}>
              <Stack spacing={2.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', fontSize: '1.35rem' }}>
                    Create Seller Account
                  </Typography>
                  <IconButton onClick={handleCloseRegistration} size="small" sx={{ color: '#94a3b8' }}>
                    <CloseIcon />
                  </IconButton>
                </Box>

                {registrationError && (
                  <Box
                    sx={{
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      p: 1.5,
                      borderRadius: '12px',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                    }}
                  >
                    {registrationError}
                  </Box>
                )}

                <Box>
                  <Typography variant="body2" sx={{ color: isDark ? '#cbd5e1' : '#334155', mb: 0.8, fontWeight: 700, fontSize: '0.84rem' }}>
                    Full Name *
                  </Typography>
                  <TextField
                    name="full_name"
                    value={registrationForm.full_name}
                    onChange={handleRegistrationChange}
                    required
                    fullWidth
                    placeholder="Enter your full name"
                    InputProps={{
                      sx: {
                        bgcolor: isDark ? '#131c31' : '#f8fafc',
                        borderRadius: '12px',
                        color: isDark ? '#ffffff' : '#0f172a',
                        height: 44,
                        fontSize: '0.88rem',
                        border: isDark ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid #cbd5e1',
                        '& input': { color: isDark ? '#ffffff' : '#0f172a' },
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ color: isDark ? '#cbd5e1' : '#334155', mb: 0.8, fontWeight: 700, fontSize: '0.84rem' }}>
                    Email Address *
                  </Typography>
                  <TextField
                    name="email"
                    type="email"
                    value={registrationForm.email}
                    onChange={handleRegistrationChange}
                    required
                    fullWidth
                    placeholder="Enter your email"
                    InputProps={{
                      sx: {
                        bgcolor: isDark ? '#131c31' : '#f8fafc',
                        borderRadius: '12px',
                        color: isDark ? '#ffffff' : '#0f172a',
                        height: 44,
                        fontSize: '0.88rem',
                        border: isDark ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid #cbd5e1',
                        '& input': { color: isDark ? '#ffffff' : '#0f172a' },
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ color: isDark ? '#cbd5e1' : '#334155', mb: 0.8, fontWeight: 700, fontSize: '0.84rem' }}>
                    Phone Number (10 Digits) *
                  </Typography>
                  <TextField
                    name="phone"
                    value={registrationForm.phone}
                    onChange={handleRegistrationChange}
                    required
                    fullWidth
                    placeholder="e.g. 9876543210"
                    InputProps={{
                      sx: {
                        bgcolor: isDark ? '#131c31' : '#f8fafc',
                        borderRadius: '12px',
                        color: isDark ? '#ffffff' : '#0f172a',
                        height: 44,
                        fontSize: '0.88rem',
                        border: isDark ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid #cbd5e1',
                        '& input': { color: isDark ? '#ffffff' : '#0f172a' },
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ color: isDark ? '#cbd5e1' : '#334155', mb: 0.8, fontWeight: 700, fontSize: '0.84rem' }}>
                    Password *
                  </Typography>
                  <TextField
                    name="password"
                    type={showRegistrationPassword ? 'text' : 'password'}
                    value={registrationForm.password}
                    onChange={handleRegistrationChange}
                    required
                    fullWidth
                    placeholder="Create a password"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowRegistrationPassword(!showRegistrationPassword)} edge="end" sx={{ color: '#64748b' }}>
                            {showRegistrationPassword ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                      sx: {
                        bgcolor: isDark ? '#131c31' : '#f8fafc',
                        borderRadius: '12px',
                        color: isDark ? '#ffffff' : '#0f172a',
                        height: 44,
                        fontSize: '0.88rem',
                        border: isDark ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid #cbd5e1',
                        '& input': { color: isDark ? '#ffffff' : '#0f172a' },
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ color: isDark ? '#cbd5e1' : '#334155', mb: 0.8, fontWeight: 700, fontSize: '0.84rem' }}>
                    Confirm Password *
                  </Typography>
                  <TextField
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={registrationForm.confirmPassword}
                    onChange={handleRegistrationChange}
                    required
                    fullWidth
                    placeholder="Confirm your password"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" sx={{ color: '#64748b' }}>
                            {showConfirmPassword ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                      sx: {
                        bgcolor: isDark ? '#131c31' : '#f8fafc',
                        borderRadius: '12px',
                        color: isDark ? '#ffffff' : '#0f172a',
                        height: 44,
                        fontSize: '0.88rem',
                        border: isDark ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid #cbd5e1',
                        '& input': { color: isDark ? '#ffffff' : '#0f172a' },
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                      },
                    }}
                  />
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={isRegistering}
                  sx={{
                    backgroundColor: '#00a6ff',
                    color: '#ffffff',
                    fontWeight: 700,
                    height: 46,
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    textTransform: 'none',
                    boxShadow: '0 4px 16px rgba(0, 166, 255, 0.4)',
                    '&:hover': { backgroundColor: '#0091ea' },
                  }}
                >
                  {isRegistering ? 'Creating Seller Account...' : 'Register Account'}
                </Button>

                <Box textAlign="center">
                  <Link
                    component="button"
                    type="button"
                    onClick={handleCloseRegistration}
                    sx={{ color: '#00a6ff', textDecoration: 'none', fontSize: '0.86rem', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
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
