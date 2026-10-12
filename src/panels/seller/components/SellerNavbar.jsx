import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  alpha,
  Divider,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '../../../context/SidebarContext';
import { useAuth } from '../../../context/AuthContext';
import { useThemeContext } from '../../../context/ThemeContext';
import ThemeToggle from '../../../components/ThemeToggle';

function SellerNavbar({ drawerWidth }) {
  const { toggleSidebar, isCollapsed } = useSidebar();
  const { user, logout } = useAuth();
  const { isDark } = useThemeContext();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const open = Boolean(anchorEl);
  const notificationOpen = Boolean(notificationAnchor);
  const actualWidth = isCollapsed ? 64 : drawerWidth;

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationMenuOpen = (event) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchor(null);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
    navigate('/login', { replace: true });
  };

  const userName = user?.full_name || 'Seller User';
  const userEmail = user?.email || 'seller@agrobridge.com';
  const initials = useMemo(() => {
    if (!userName) return 'SE';
    const parts = userName.split(' ').filter(Boolean);
    const [first = 'S', second = 'E'] = parts;
    return `${first[0] || 'S'}${(parts.length > 1 ? parts[parts.length - 1][0] : second[0]) || 'E'}`.toUpperCase();
  }, [userName]);

  const notifications = [
    { id: 1, title: 'New order received', time: '15 mins ago', read: false },
    { id: 2, title: 'Low stock alert', time: '1 hour ago', read: false },
    { id: 3, title: 'Payment received', time: '3 hours ago', read: true },
    { id: 4, title: 'Product review', time: '1 day ago', read: true },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { md: `calc(100% - ${actualWidth}px)` },
        ml: { md: `${actualWidth}px` },
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        color: isDark ? '#e5e7eb' : '#0f172a',
        boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
        borderBottom: isDark ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid rgba(226, 232, 240, 0.8)',
        transition: 'width 0.3s ease, margin-left 0.3s ease, background-color 0.3s ease, color 0.3s ease',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={toggleSidebar}
            sx={{ mr: 2, display: { md: 'none' }, color: isDark ? '#e5e7eb' : '#0f172a' }}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ThemeToggle size="small" />
          <IconButton
            onClick={handleNotificationMenuOpen}
            sx={{
              color: isDark ? '#e5e7eb' : '#0f172a',
              '&:hover': {
                backgroundColor: alpha('#22d3ee', 0.15),
              },
            }}
          >
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Menu
            anchorEl={notificationAnchor}
            open={notificationOpen}
            onClose={handleNotificationMenuClose}
            PaperProps={{
              sx: {
                width: 360,
                maxHeight: 400,
                mt: 1.5,
                borderRadius: 2,
                backgroundColor: '#0f172a',
                border: '1px solid rgba(148, 163, 184, 0.25)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                color: '#e5e7eb',
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ p: 2, pb: 1 }}>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#e5e7eb' }}>
                Notifications
              </Typography>
              <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                {unreadCount} unread
              </Typography>
            </Box>
            <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.1)' }} />
            <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
              {notifications.map((notification) => (
                <MenuItem
                  key={notification.id}
                  onClick={handleNotificationMenuClose}
                  sx={{
                    py: 1.5,
                    px: 2,
                    backgroundColor: notification.read ? 'transparent' : alpha('#22d3ee', 0.1),
                    '&:hover': {
                      backgroundColor: alpha('#22d3ee', 0.15),
                    },
                  }}
                >
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight={notification.read ? 400 : 600} sx={{ color: '#e5e7eb' }}>
                      {notification.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                      {notification.time}
                    </Typography>
                  </Box>
                  {!notification.read && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: '#22d3ee',
                        ml: 1,
                      }}
                    />
                  )}
                </MenuItem>
              ))}
            </Box>
            <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.1)' }} />
            <MenuItem onClick={handleNotificationMenuClose} sx={{ justifyContent: 'center', py: 1.5 }}>
              <Typography variant="body2" sx={{ color: '#22d3ee' }} fontWeight={600}>
                View All Notifications
              </Typography>
            </MenuItem>
          </Menu>

          <IconButton
            onClick={handleProfileMenuOpen}
            sx={{
              p: 0.5,
              '&:hover': {
                backgroundColor: alpha('#22d3ee', 0.15),
              },
            }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: '#22d3ee',
                color: '#0f172a',
                fontWeight: 700,
              }}
            >
              {initials}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleProfileMenuClose}
            PaperProps={{
              sx: {
                width: 240,
                mt: 1.5,
                borderRadius: 2,
                backgroundColor: '#0f172a',
                border: '1px solid rgba(148, 163, 184, 0.25)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                color: '#e5e7eb',
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ p: 2, pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: '#22d3ee',
                    color: '#0f172a',
                    fontWeight: 700,
                  }}
                >
                  {initials}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#e5e7eb' }}>
                    {userName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                    {userEmail}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.1)' }} />
            <MenuItem
              onClick={() => {
                handleProfileMenuClose();
                navigate('/seller/profile');
              }}
              sx={{
                '&:hover': {
                  backgroundColor: alpha('#22d3ee', 0.15),
                },
              }}
            >
              <ListItemIcon sx={{ color: '#9ca3af' }}>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontSize: '0.9rem', color: '#e5e7eb' }}>My Profile</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleProfileMenuClose();
                navigate('/seller/settings');
              }}
              sx={{
                '&:hover': {
                  backgroundColor: alpha('#22d3ee', 0.15),
                },
              }}
            >
              <ListItemIcon sx={{ color: '#9ca3af' }}>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontSize: '0.9rem', color: '#e5e7eb' }}>Settings</ListItemText>
            </MenuItem>
            <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.1)' }} />
            <MenuItem
              onClick={handleLogout}
              sx={{
                color: '#f87171',
                '&:hover': {
                  backgroundColor: alpha('#ef4444', 0.15),
                },
              }}
            >
              <ListItemIcon>
                <LogoutIcon fontSize="small" sx={{ color: '#f87171' }} />
              </ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontSize: '0.9rem', color: '#f87171', fontWeight: 600 }}>Logout</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

SellerNavbar.propTypes = {
  drawerWidth: PropTypes.number.isRequired,
};

export default SellerNavbar;
