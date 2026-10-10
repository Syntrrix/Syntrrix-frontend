import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';

function TeamNavbar({ drawerWidth }) {
  const { toggleSidebar, isCollapsed } = useSidebar();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const actualWidth = isCollapsed ? 64 : drawerWidth;
  const isTeamManager = user?.role?.id === 4;
  const basePath = isTeamManager ? '/team-manager' : '/agent';
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const userName = user?.full_name || 'Team User';
  const userEmail = user?.email || '';
  const initials = useMemo(() => {
    const parts = userName.split(' ').filter(Boolean);
    const [first = 'T', second = 'U'] = parts;
    return `${first[0] || 'T'}${(parts.length > 1 ? parts[parts.length - 1][0] : second[0]) || 'U'}`.toUpperCase();
  }, [userName]);

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate('/login', { replace: true });
  };

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
          <IconButton color="inherit" onClick={toggleSidebar} sx={{ mr: 2, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography fontWeight={700}>
            {user?.role?.name || 'Team'} Dashboard
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              p: 0.5,
              '&:hover': { backgroundColor: alpha(theme.palette.action.hover, 0.5) },
            }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: theme.palette.secondary.main,
                fontWeight: 600,
              }}
            >
              {initials}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={() => setAnchorEl(null)}
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
                <Avatar sx={{ width: 48, height: 48, bgcolor: theme.palette.secondary.main, fontWeight: 700 }}>
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
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                navigate(`${basePath}/profile`);
              }}
            >
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>My Profile</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => setAnchorEl(null)}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Settings</ListItemText>
            </MenuItem>
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

TeamNavbar.propTypes = {
  drawerWidth: PropTypes.number.isRequired,
};

export default TeamNavbar;
