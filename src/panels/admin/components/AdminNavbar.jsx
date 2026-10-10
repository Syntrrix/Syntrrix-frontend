import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
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
  useTheme,
  Divider,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import PropTypes from 'prop-types';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '../../../context/SidebarContext';
import { useAuth } from '../../../context/AuthContext';

function AdminNavbar({ drawerWidth }) {
  const { toggleSidebar, isCollapsed } = useSidebar();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
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

  const userName = user?.full_name || 'Admin User';
  const userEmail = user?.email || 'admin@agrobridge.com';
  const initials = useMemo(() => {
    if (!userName) {
      return 'AD';
    }
    const parts = userName.split(' ').filter(Boolean);
    const [first = 'A', second = 'D'] = parts;
    return `${first[0] || 'A'}${(parts.length > 1 ? parts[parts.length - 1][0] : second[0]) || 'D'}`.toUpperCase();
  }, [userName]);

  const notifications = [
    { id: 1, title: 'New order received', time: '5 mins ago', read: false },
    { id: 2, title: 'Payment processed', time: '1 hour ago', read: false },
    { id: 3, title: 'New seller registered', time: '2 hours ago', read: true },
    { id: 4, title: 'System update available', time: '1 day ago', read: true },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { md: `calc(100% - ${actualWidth}px)` },
        ml: { md: `${actualWidth}px` },
        backgroundColor: '#0f172a',
        color: '#e5e7eb',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
        transition: 'width 0.3s ease, margin-left 0.3s ease',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={toggleSidebar}
            sx={{ mr: 2, display: { md: 'none' }, color: '#e5e7eb' }}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={handleNotificationMenuOpen}
            sx={{
              color: '#e5e7eb',
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
                fontWeight: 600,
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
            <MenuItem onClick={handleProfileMenuClose} sx={{ color: '#e5e7eb', '&:hover': { backgroundColor: alpha('#22d3ee', 0.1) } }}>
              <ListItemIcon>
                <PersonIcon fontSize="small" sx={{ color: '#9ca3af' }} />
              </ListItemIcon>
              <ListItemText sx={{ color: '#e5e7eb' }}>My Profile</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleProfileMenuClose} sx={{ color: '#e5e7eb', '&:hover': { backgroundColor: alpha('#22d3ee', 0.1) } }}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" sx={{ color: '#9ca3af' }} />
              </ListItemIcon>
              <ListItemText sx={{ color: '#e5e7eb' }}>Settings</ListItemText>
            </MenuItem>
            <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.1)' }} />
            <MenuItem onClick={handleLogout} sx={{ color: '#f87171', '&:hover': { backgroundColor: alpha('#ef4444', 0.1) } }}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" sx={{ color: '#f87171' }} />
              </ListItemIcon>
              <ListItemText sx={{ color: '#f87171' }}>Logout</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

AdminNavbar.propTypes = {
  drawerWidth: PropTypes.number.isRequired,
};

export default AdminNavbar;

