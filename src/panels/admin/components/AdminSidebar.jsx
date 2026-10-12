import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CategoryIcon from '@mui/icons-material/Category';
import PaymentIcon from '@mui/icons-material/Payment';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SecurityIcon from '@mui/icons-material/Security';
import HelpIcon from '@mui/icons-material/Help';
import LogoutIcon from '@mui/icons-material/Logout';
import InventoryIcon from '@mui/icons-material/Inventory2';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import StoreIcon from '@mui/icons-material/Store';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';
import {
  Avatar,
  Badge,
  Box,
  Chip,
  Collapse,
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
import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useSidebar } from '../../../context/SidebarContext';
import { useAuth } from '../../../context/AuthContext';
import { useThemeContext } from '../../../context/ThemeContext';

const navItems = [
  {
    label: 'Dashboard',
    to: '/admin/dashboard',
    icon: <DashboardIcon />,
    badge: null,
  },
  {
    label: 'User Management',
    icon: <PeopleIcon />,
    badge: null,
    subItems: [
      {
        label: 'Seller Management',
        to: '/admin/seller-management',
        icon: <StoreIcon />,
      },
      {
        label: 'Buyer Management',
        to: '/admin/buyer-management',
        icon: <PersonIcon />,
      },
      {
        label: 'Create Plan',
        to: '/admin/create-plan',
        icon: <AssignmentIcon />,
      },
    ],
  },
  {
    label: 'Create Seller',
    to: '/admin/create-seller',
    icon: <GroupAddIcon />,
    badge: null,
  },
  {
    label: 'Create Buyer',
    to: '/admin/create-buyer',
    icon: <GroupAddIcon />,
    badge: null,
  },
  // {
  //   label: 'Orders',
  //   to: '/admin/orders',
  //   icon: <ShoppingCartIcon />,
  //   badge: 5,
  // },
  // {
  //   label: 'Inventory',
  //   to: '/admin/inventory',
  //   icon: <InventoryIcon />,
  //   badge: null,
  // },
  // {
  //   label: 'Vendors',
  //   to: '/admin/vendors',
  //   icon: <StoreIcon />,
  //   badge: null,
  // },
  // {
  //   label: 'Analytics',
  //   to: '/admin/analytics',
  //   icon: <AnalyticsIcon />,
  //   badge: null,
  // },
  // {
  //   label: 'Reports',
  //   to: '/admin/reports',
  //   icon: <AssessmentIcon />,
  //   badge: null,
  // },
  // {
  //   label: 'Categories',
  //   to: '/admin/categories',
  //   icon: <CategoryIcon />,
  //   badge: null,
  // },
  // {
  //   label: 'Payments',
  //   to: '/admin/payments',
  //   icon: <PaymentIcon />,
  //   badge: 3,
  // },
];

const settingsItems = [
  {
    label: 'Settings',
    to: '/admin/settings',
    icon: <SettingsIcon />,
  },
  // {
  //   label: 'Security',
  //   to: '/admin/security',
  //   icon: <SecurityIcon />,
  // },
  // {
  //   label: 'Notifications',
  //   to: '/admin/notifications',
  //   icon: <NotificationsActiveIcon />,
  //   badge: 8,
  // },
  {
    label: 'Help & Support',
    to: '/admin/help',
    icon: <HelpIcon />,
  },
];

function AdminSidebar({ drawerWidth }) {
  const { isSidebarOpen, toggleSidebar, isCollapsed, toggleCollapse } = useSidebar();
  const { logout } = useAuth();
  const { isDark } = useThemeContext();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const collapsedWidth = 64;
  const actualWidth = isCollapsed ? collapsedWidth : drawerWidth;
  const [openSubmenu, setOpenSubmenu] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleSubmenuToggle = (label) => {
    setOpenSubmenu(openSubmenu === label ? '' : label);
  };

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: isDark ? '#0b1624' : '#ffffff',
        color: isDark ? '#e5e7eb' : '#0f172a',
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
    >
      <Toolbar
        sx={{
          backgroundColor: isDark ? '#0f1f33' : '#f8fafc',
          color: isDark ? '#e5e7eb' : '#0f172a',
          minHeight: '80px !important',
          justifyContent: 'space-between',
          px: isCollapsed ? 1 : 2,
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
        }}
      >
        {!isCollapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            <Avatar
              sx={{
                bgcolor: '#22d3ee',
                width: 48,
                height: 48,
                fontWeight: 700,
              }}
            >
              AP
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2, color: '#e5e7eb' }}>
                Admin Panel
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9, color: '#e5e7eb' }}>
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
            AP
          </Avatar>
        )}
        {isDesktop && (
          <IconButton
            onClick={toggleCollapse}
            sx={{
              color: '#cbd5e1',
              position: 'absolute',
              right: 8,
              top: 16,
              '&:hover': {
                backgroundColor: alpha('#22d3ee', 0.15),
              },
            }}
          >
            {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        )}
      </Toolbar>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          py: 1,
          scrollbarWidth: 'none', // Firefox
          '&::-webkit-scrollbar': { display: 'none' }, // Chrome/Safari
          msOverflowStyle: 'none', // IE/Edge
        }}
      >
        <List sx={{ px: 0.5 }}>
          {navItems.map((item) => {
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isSubmenuOpen = openSubmenu === item.label;
            const isSubmenuActive = hasSubItems && item.subItems.some(subItem => location.pathname === subItem.to);

            return (
              <Box key={item.label || item.to}>
                <Tooltip title={isCollapsed ? item.label : ''} placement="right">
                  <ListItemButton
                    component={hasSubItems ? 'div' : NavLink}
                    to={hasSubItems ? undefined : item.to}
                    onClick={() => {
                      if (hasSubItems) {
                        if (!isCollapsed) {
                          handleSubmenuToggle(item.label);
                        }
                      } else {
                        if (!isDesktop) toggleSidebar();
                      }
                    }}
                    sx={{
                      mx: 1,
                      mb: 0.3,
                      borderRadius: 2,
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      minHeight: 42,
                      backgroundColor: isSubmenuActive ? alpha('#22d3ee', 0.18) : 'transparent',
                      '&:hover': {
                        backgroundColor: alpha('#22d3ee', 0.1),
                      },
                      '&.active': {
                        backgroundColor: alpha('#22d3ee', 0.18),
                        borderLeft: `4px solid #22d3ee`,
                        '& .MuiListItemIcon-root': {
                          color: '#22d3ee',
                        },
                        '& .MuiListItemText-primary': {
                          fontWeight: 600,
                          color: '#22d3ee',
                        },
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: isCollapsed ? 0 : 40,
                        justifyContent: 'center',
                        color: isSubmenuActive ? '#22d3ee' : '#9ca3af',
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
                            color: isSubmenuActive ? '#22d3ee' : '#e5e7eb',
                            fontWeight: isSubmenuActive ? 600 : 400,
                          }}
                        />
                        {item.badge && (
                          <Chip
                            label={item.badge}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: '#ef4444',
                              color: '#fff',
                            }}
                          />
                        )}
                        {hasSubItems && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubmenuToggle(item.label);
                            }}
                            sx={{ color: '#9ca3af', ml: 1 }}
                          >
                            {isSubmenuOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        )}
                      </>
                    )}
                  </ListItemButton>
                </Tooltip>
                {hasSubItems && !isCollapsed && (
                  <Collapse in={isSubmenuOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {item.subItems.map((subItem) => {
                        const isActive = location.pathname === subItem.to;
                        return (
                          <ListItemButton
                            key={subItem.to}
                            component={NavLink}
                            to={subItem.to}
                            onClick={() => {
                              if (!isDesktop) toggleSidebar();
                            }}
                            sx={{
                              mx: 1,
                              mb: 0.3,
                              ml: 4,
                              borderRadius: 2,
                              minHeight: 38,
                              backgroundColor: isActive ? alpha('#22d3ee', 0.18) : 'transparent',
                              '&:hover': {
                                backgroundColor: alpha('#22d3ee', 0.1),
                              },
                              '&.active': {
                                backgroundColor: alpha('#22d3ee', 0.18),
                                borderLeft: `4px solid #22d3ee`,
                                '& .MuiListItemIcon-root': {
                                  color: '#22d3ee',
                                },
                                '& .MuiListItemText-primary': {
                                  fontWeight: 600,
                                  color: '#22d3ee',
                                },
                              },
                            }}
                          >
                            <ListItemIcon
                              sx={{
                                minWidth: 32,
                                justifyContent: 'center',
                                color: isActive ? '#22d3ee' : '#9ca3af',
                              }}
                            >
                              {subItem.icon}
                            </ListItemIcon>
                            <ListItemText
                              primary={subItem.label}
                              primaryTypographyProps={{
                                fontSize: '0.9rem',
                                color: isActive ? '#22d3ee' : '#e5e7eb',
                                fontWeight: isActive ? 600 : 400,
                              }}
                            />
                          </ListItemButton>
                        );
                      })}
                    </List>
                  </Collapse>
                )}
              </Box>
            );
          })}
        </List>

        {!isCollapsed && <Divider sx={{ my: 2, mx: 2, borderColor: 'rgba(255,255,255,0.08)' }} />}

        {/* Settings Section */}
        <List sx={{ px: 0.5 }}>
          {!isCollapsed && (
            <Typography
              variant="caption"
              sx={{
                px: 2,
                py: 1,
                color: '#9ca3af',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1,
                fontSize: '0.7rem',
              }}
            >
              Settings & More
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
                  mb: 0.3,
                  borderRadius: 2,
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  minHeight: 42,
                  '&:hover': {
                    backgroundColor: alpha('#22d3ee', 0.1),
                  },
                  '&.active': {
                    backgroundColor: alpha('#22d3ee', 0.18),
                    borderLeft: `4px solid #22d3ee`,
                    '& .MuiListItemIcon-root': {
                      color: '#22d3ee',
                    },
                    '& .MuiListItemText-primary': {
                      fontWeight: 600,
                      color: '#22d3ee',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: isCollapsed ? 0 : 40,
                    justifyContent: 'center',
                    color: '#9ca3af',
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
                        color: '#e5e7eb',
                      }}
                    />
                    {item.badge && (
                      <Chip
                        label={item.badge}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          backgroundColor: '#ef4444',
                          color: '#fff',
                        }}
                      />
                    )}
                  </>
                )}
              </ListItemButton>
            </Tooltip>
          ))}
        </List>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {/* User Profile & Logout */}
      <Box sx={{ p: isCollapsed ? 1 : 2 }}>
        <Tooltip title={isCollapsed ? 'Logout' : ''} placement="right">
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              backgroundColor: alpha('#ef4444', 0.12),
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              minHeight: 48,
              '&:hover': {
                backgroundColor: alpha('#ef4444', 0.2),
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 40, justifyContent: 'center', color: '#f87171' }}>
              <LogoutIcon />
            </ListItemIcon>
            {!isCollapsed && (
              <ListItemText
                primary="Logout"
                primaryTypographyProps={{
                  fontWeight: 600,
                  color: '#fca5a5',
                }}
              />
            )}
          </ListItemButton>
        </Tooltip>
        {!isCollapsed && (
          <Box sx={{ mt: 2, px: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
              Sync OK
            </Typography>
          </Box>
        )}
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
            borderRight: isDark ? `1px solid rgba(255,255,255,0.08)` : `1px solid #e2e8f0`,
            backgroundColor: isDark ? '#0b1624' : '#ffffff',
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
            borderRight: isDark ? `1px solid rgba(255,255,255,0.08)` : `1px solid #e2e8f0`,
            transition: 'width 0.3s ease',
            overflowX: 'hidden',
            backgroundColor: isDark ? '#0b1624' : '#ffffff',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}

AdminSidebar.propTypes = {
  drawerWidth: PropTypes.number.isRequired,
};

export default AdminSidebar;

