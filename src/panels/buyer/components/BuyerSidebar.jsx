import DashboardIcon from '@mui/icons-material/Dashboard';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import StoreIcon from '@mui/icons-material/Store';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HistoryIcon from '@mui/icons-material/History';
import PaymentIcon from '@mui/icons-material/Payment';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpIcon from '@mui/icons-material/Help';
import LogoutIcon from '@mui/icons-material/Logout';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
  alpha,
} from '@mui/material';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { useSidebar } from '../../../context/SidebarContext';

const navItems = [
  {
    label: 'Dashboard',
    to: '/buyer/dashboard',
    icon: <DashboardIcon />,
    badge: null,
  },
  {
    label: 'Orders',
    to: '/buyer/orders',
    icon: <ShoppingBagIcon />,
    badge: 5,
  },
  {
    label: 'Vendors',
    to: '/buyer/vendors',
    icon: <StoreIcon />,
    badge: null,
  },
  {
    label: 'Favorites',
    to: '/buyer/favorites',
    icon: <FavoriteIcon />,
    badge: 12,
  },
  {
    label: 'Order History',
    to: '/buyer/history',
    icon: <HistoryIcon />,
    badge: null,
  },
  {
    label: 'Invoices',
    to: '/buyer/invoices',
    icon: <ReceiptIcon />,
    badge: 2,
  },
  {
    label: 'Payments',
    to: '/buyer/payments',
    icon: <PaymentIcon />,
    badge: null,
  },
  {
    label: 'Promotions',
    to: '/buyer/promotions',
    icon: <LocalOfferIcon />,
    badge: 3,
  },
];

const settingsItems = [
  {
    label: 'Settings',
    to: '/buyer/settings',
    icon: <SettingsIcon />,
  },
  {
    label: 'Help & Support',
    to: '/buyer/help',
    icon: <HelpIcon />,
  },
];

function BuyerSidebar({ drawerWidth }) {
  const { isSidebarOpen, toggleSidebar, isCollapsed, toggleCollapse } = useSidebar();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const collapsedWidth = 64;
  const actualWidth = isCollapsed ? collapsedWidth : drawerWidth;

  const handleLogout = () => {
    console.log('Logging out...');
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'background.paper' }}>
      <Toolbar
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.8)} 100%)`,
          color: 'white',
          minHeight: '80px !important',
          justifyContent: 'space-between',
          px: isCollapsed ? 1 : 2,
        }}
      >
        {!isCollapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            <Avatar
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                width: 48,
                height: 48,
                fontWeight: 700,
              }}
            >
              BP
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                Buyer Panel
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                AgroBridge Platform
              </Typography>
            </Box>
          </Box>
        )}
        {isCollapsed && (
          <Avatar
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              width: 40,
              height: 40,
              fontWeight: 700,
              mx: 'auto',
            }}
          >
            BP
          </Avatar>
        )}
        {isDesktop && (
          <IconButton
            onClick={toggleCollapse}
            sx={{
              color: 'white',
              position: 'absolute',
              right: 8,
              top: 16,
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.2)',
              },
            }}
          >
            {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        )}
      </Toolbar>

      <Divider />

      <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 1 }}>
        <List>
          {navItems.map((item) => (
            <Tooltip key={item.to} title={isCollapsed ? item.label : ''} placement="right">
              <ListItemButton
                component={NavLink}
                to={item.to}
                onClick={() => {
                  if (!isDesktop) toggleSidebar();
                }}
                sx={{
                  mx: 1,
                  mb: 0.5,
                  borderRadius: 2,
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  minHeight: 48,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                  '&.active': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.15),
                    borderLeft: `4px solid ${theme.palette.primary.main}`,
                    '& .MuiListItemIcon-root': {
                      color: theme.palette.primary.main,
                    },
                    '& .MuiListItemText-primary': {
                      fontWeight: 600,
                      color: theme.palette.primary.main,
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: isCollapsed ? 0 : 40,
                    justifyContent: 'center',
                    color: 'text.secondary',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!isCollapsed && (
                  <>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: '0.95rem',
                      }}
                    />
                    {item.badge && (
                      <Chip
                        label={item.badge}
                        size="small"
                        color="error"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </>
                )}
              </ListItemButton>
            </Tooltip>
          ))}
        </List>

        {!isCollapsed && <Divider sx={{ my: 2, mx: 2 }} />}

        <List>
          {!isCollapsed && (
            <Typography
              variant="caption"
              sx={{
                px: 3,
                py: 1,
                color: 'text.secondary',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1,
                fontSize: '0.7rem',
              }}
            >
              Settings
            </Typography>
          )}
          {settingsItems.map((item) => (
            <Tooltip key={item.to} title={isCollapsed ? item.label : ''} placement="right">
              <ListItemButton
                component={NavLink}
                to={item.to}
                onClick={() => {
                  if (!isDesktop) toggleSidebar();
                }}
                sx={{
                  mx: 1,
                  mb: 0.5,
                  borderRadius: 2,
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  minHeight: 48,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.action.hover, 0.5),
                  },
                  '&.active': {
                    backgroundColor: alpha(theme.palette.action.selected, 0.5),
                    borderLeft: `4px solid ${theme.palette.text.secondary}`,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: isCollapsed ? 0 : 40,
                    justifyContent: 'center',
                    color: 'text.secondary',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!isCollapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.95rem',
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          ))}
        </List>
      </Box>

      <Divider />

      <Box sx={{ p: isCollapsed ? 1 : 2 }}>
        <Tooltip title={isCollapsed ? 'Logout' : ''} placement="right">
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.error.main, 0.08),
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              minHeight: 48,
              '&:hover': {
                backgroundColor: alpha(theme.palette.error.main, 0.15),
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 40, justifyContent: 'center', color: 'error.main' }}>
              <LogoutIcon />
            </ListItemIcon>
            {!isCollapsed && (
              <ListItemText
                primary="Logout"
                primaryTypographyProps={{
                  fontWeight: 600,
                  color: 'error.main',
                }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: actualWidth }, flexShrink: { md: 0 }, transition: 'width 0.3s ease' }}>
      <Drawer
        variant="temporary"
        open={isSidebarOpen}
        onClose={toggleSidebar}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: actualWidth,
            borderRight: `1px solid ${theme.palette.divider}`,
            transition: 'width 0.3s ease',
            overflowX: 'hidden',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}

BuyerSidebar.propTypes = {
  drawerWidth: PropTypes.number.isRequired,
};

export default BuyerSidebar;



