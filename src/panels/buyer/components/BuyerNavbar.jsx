import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
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
  useTheme,
  Divider,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '../../../context/SidebarContext';
import { useAuth } from '../../../context/AuthContext';

function BuyerNavbar({ drawerWidth }) {
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

  const userName = user?.full_name || 'Buyer User';
  const userEmail = user?.email || 'buyer@agrobridge.com';
  const initials = useMemo(() => {
    if (!userName) return 'BU';
    const parts = userName.split(' ').filter(Boolean);
    const [first = 'B', second = 'U'] = parts;
    return `${first[0] || 'B'}${(parts.length > 1 ? parts[parts.length - 1][0] : second[0]) || 'U'}`.toUpperCase();
  }, [userName]);

  const notifications = [
    { id: 1, title: 'Order #12345 shipped', time: '10 mins ago', read: false },
    { id: 2, title: 'New vendor available', time: '2 hours ago', read: false },
    { id: 3, title: 'Payment confirmed', time: '1 day ago', read: true },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { md: `calc(100% - ${actualWidth}px)` },
        ml: { md: `${actualWidth}px` },
        backgroundColor: 'background.paper',
        color: 'text.primary',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        borderBottom: `1px solid ${theme.palette.divider}`,
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
            sx={{ mr: 2, display: { md: 'none' }, color: 'text.primary' }}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            sx={{
              color: 'text.primary',
              '&:hover': {
                backgroundColor: alpha(theme.palette.action.hover, 0.5),
              },
            }}
          >
            <Badge badgeContent={3} color="error">
              <ShoppingCartIcon />
            </Badge>
          </IconButton>

          <IconButton
            onClick={handleNotificationMenuOpen}
            sx={{
              color: 'text.primary',
              '&:hover': {
                backgroundColor: alpha(theme.palette.action.hover, 0.5),
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
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ p: 2, pb: 1 }}>
              <Typography variant="h6" fontWeight={700}>
                Notifications
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {unreadCount} unread
              </Typography>
            </Box>
            <Divider />
            <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
              {notifications.map((notification) => (
                <MenuItem
                  key={notification.id}
                  onClick={handleNotificationMenuClose}
                  sx={{
                    py: 1.5,
                    px: 2,
                    backgroundColor: notification.read ? 'transparent' : alpha(theme.palette.primary.main, 0.05),
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.action.hover, 0.5),
                    },
                  }}
                >
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight={notification.read ? 400 : 600}>
                      {notification.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {notification.time}
                    </Typography>
                  </Box>
                  {!notification.read && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: theme.palette.primary.main,
                        ml: 1,
                      }}
                    />
                  )}
                </MenuItem>
              ))}
            </Box>
            <Divider />
            <MenuItem onClick={handleNotificationMenuClose} sx={{ justifyContent: 'center', py: 1.5 }}>
              <Typography variant="body2" color="primary" fontWeight={600}>
                View All Notifications
              </Typography>
            </MenuItem>
          </Menu>

          <IconButton
            onClick={handleProfileMenuOpen}
            sx={{
              p: 0.5,
              '&:hover': {
                backgroundColor: alpha(theme.palette.action.hover, 0.5),
              },
            }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: theme.palette.primary.main,
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
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
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
                    bgcolor: theme.palette.primary.main,
                    fontWeight: 700,
                  }}
                >
                  {initials}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {userName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {userEmail}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Divider />
            <MenuItem onClick={handleProfileMenuClose}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>My Profile</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleProfileMenuClose}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Settings</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
              </ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

BuyerNavbar.propTypes = {
  drawerWidth: PropTypes.number.isRequired,
};

export default BuyerNavbar;
