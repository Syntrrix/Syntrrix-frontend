import { useCallback, useEffect, useState } from 'react';
import AssessmentIcon from '@mui/icons-material/Assessment';
import InventoryIcon from '@mui/icons-material/Inventory2';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PaymentIcon from '@mui/icons-material/Payment';
import LogoutIcon from '@mui/icons-material/Logout';
import CategoryIcon from '@mui/icons-material/Category';
import ReceiptIcon from '@mui/icons-material/Receipt';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import HistoryIcon from '@mui/icons-material/History';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddBoxIcon from '@mui/icons-material/AddBox';
import ListAltIcon from '@mui/icons-material/ListAlt';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import GroupIcon from '@mui/icons-material/Group';
import {
  Avatar,
  Badge,
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
import { NavLink, useNavigate } from 'react-router-dom';
import { useSidebar } from '../../../context/SidebarContext';
import { useAuth } from '../../../context/AuthContext';
import { useThemeContext } from '../../../context/ThemeContext';
import { fetchSellerLiveChatSupportSessions } from '../../../api/liveChat';

const navSections = [
  {
    title: null,
    items: [
      { label: 'Dashboard', to: '/seller/dashboard', icon: <AssessmentIcon /> }

    ],
  },
  {
    title: 'Supplier',
    items: [
      { label: 'Manage Supplier’s', to: '/seller/suppliers', icon: <PersonIcon /> },
      // { label: 'New Purchase', to: '/seller/purchases/new', icon: <ShoppingCartIcon /> },
      { label: 'Manage Purchase', to: '/seller/purchases/history', icon: <HistoryIcon /> },
      // { label: 'Supplier Payment', to: '/seller/payments', icon: <PaymentIcon /> },
      { label: 'Outstanding', to: '/seller/outstanding', icon: <ReceiptIcon /> },
    ],
  },
  {
    title: 'Product',
    items: [
      // { label: 'Product Mgmt', to: '/seller/products/add', icon: <AddBoxIcon /> },
      { label: 'Product List', to: '/seller/products/list', icon: <ListAltIcon /> },
      { label: 'Categories', to: '/seller/categories', icon: <CategoryIcon /> },
      // { label: 'Stock In', to: '/seller/stock-in', icon: <InventoryIcon /> },
      // { label: 'Stock Out', to: '/seller/stock-out', icon: <LocalShippingIcon /> },

    ],
  },
  {
    title: 'Customer',
    items: [
      { label: 'Add Customer', to: '/seller/customers', icon: <PersonIcon /> },
      // { label: 'Customer Purchase / Sell', to: '/seller/billing', icon: <ShoppingCartIcon /> },
      { label: 'Customer Purchase History', to: '/seller/customers/purchase', icon: <HistoryIcon /> },
      // { label: 'Customer Payment', to: '/seller/customers/payment', icon: <PaymentIcon /> },
      { label: 'Customer Outstanding', to: '/seller/customers/outstanding', icon: <ReceiptIcon /> },
    ],
  },
  {
    title: 'Online market place',
    items: [
      { label: 'Lead Pipeline', to: '/seller/lead-pipeline', icon: <AccountTreeIcon /> },
      { label: 'Online orders', to: '/seller/online-orders', icon: <ShoppingCartIcon /> },
    ],
  },
  {
    title: 'Chatbot',

    items: [
      // { label: 'Create Boat', to: '/seller/create-boat', icon: <SmartToyIcon /> },
      { label: 'Live Chat Support', to: '/seller/live-chat-support', icon: <WhatsAppIcon /> },
      { label: 'Bot List', to: '/seller/bots', icon: <ListAltIcon /> },
      { label: 'Data Hub', to: '/seller/data-hub', icon: <ListAltIcon /> },
      // { label: 'Chatbot', to: '/seller/chatbot', icon: <SmartToyIcon /> },
    ],


  },

  {
    title: 'User Management',
    items: [
      { label: 'User Management', to: '/seller/user-management', icon: <GroupIcon /> },
    ],
  },
  {
    title: 'Automation',

    items: [
      { label: 'WhatsApp', to: '/seller/whatsapp', icon: <WhatsAppIcon /> },
    ],


  },
  {
    title: 'Reports & Settings',
    items: [
      { label: 'Reports', to: '/seller/reports', icon: <AssessmentIcon /> },
      // { label: 'Bot', to: '/seller/reports/bot', icon: <SmartToyIcon /> },
      { label: 'Settings', to: '/seller/settings', icon: <SettingsIcon /> },
    ],
  },
];

function normalizeFeatureName(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isItemAllowed(item, planFeatures) {
  if (!planFeatures || !Array.isArray(planFeatures)) {
    return true;
  }
  if (item.label === 'Settings') {
    return true;
  }

  const normItem = normalizeFeatureName(item.label);
  return planFeatures.some((feat) => {
    const normFeat = normalizeFeatureName(feat);
    return normFeat === normItem || normItem.includes(normFeat) || normFeat.includes(normItem);
  });
}

function SellerSidebar({ drawerWidth }) {
  const { isSidebarOpen, toggleSidebar, isCollapsed, toggleCollapse } = useSidebar();
  const { user, logout } = useAuth();
  const { isDark } = useThemeContext();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const collapsedWidth = 64;
  const actualWidth = isCollapsed ? collapsedWidth : drawerWidth;

  const [unreadChatCount, setUnreadChatCount] = useState(0);

function dedupeSessionsForCount(list) {
  const byKey = new Map();
  (Array.isArray(list) ? list : []).forEach((session) => {
    const phone = String(session?.mobile_number || '').replace(/\D+/g, '');
    const email = String(session?.email || '').trim().toLowerCase();
    const key = phone || email ? `${phone}::${email}` : `sid::${String(session?.session_id || '')}`;
    const existing = byKey.get(key);
    const getTs = (s) => {
      const raw = s?.updated_at || s?.last_message_created_at || s?.created_at || '';
      const ts = raw ? new Date(raw).getTime() : 0;
      return Number.isFinite(ts) ? ts : 0;
    };
    if (!existing || getTs(session) > getTs(existing)) {
      byKey.set(key, session);
    }
  });
  return Array.from(byKey.values());
}

  const updateUnreadCount = useCallback(async () => {
    try {
      const resp = await fetchSellerLiveChatSupportSessions();
      if (resp?.success && Array.isArray(resp.data)) {
        const deduped = dedupeSessionsForCount(resp.data);
        const count = deduped.filter((s) => Number(s.unread_count || 0) > 0).length;
        setUnreadChatCount(count);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void updateUnreadCount();
    const interval = setInterval(() => {
      void updateUnreadCount();
    }, 4000);

    const handleCustomEvent = (e) => {
      if (typeof e.detail?.unreadCount === 'number') {
        setUnreadChatCount(e.detail.unreadCount);
      } else {
        void updateUnreadCount();
      }
    };

    window.addEventListener('live_chat_unread_update', handleCustomEvent);
    return () => {
      clearInterval(interval);
      window.removeEventListener('live_chat_unread_update', handleCustomEvent);
    };
  }, [updateUnreadCount]);

  const planFeatures = user?.plan?.features || null;

  const filteredNavSections = navSections
    .map((section) => {
      const allowedItems = section.items.filter((item) => isItemAllowed(item, planFeatures));
      return {
        ...section,
        items: allowedItems,
      };
    })
    .filter((section) => section.items.length > 0);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
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
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, width: '100%', py: 1 }}>
            <Box
              component="img"
              src="/biznex-logo.png"
              alt="Biznex Logo"
              onClick={() => navigate('/seller/dashboard')}
              onError={(e) => {
                if (e.target.src && !e.target.src.endsWith('biznex-logo.png.png')) {
                  e.target.src = '/biznex-logo.png.png';
                }
              }}
              sx={{
                maxWidth: '170px',
                width: 'auto',
                height: 'auto',
                maxHeight: '75px',
                objectFit: 'contain',
                display: 'block',
                cursor: 'pointer',
                filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.25))',
                transition: 'opacity 0.2s ease',
                '&:hover': {
                  opacity: 0.85,
                },
              }}
            />
          </Box>
        )}
        {isCollapsed && (
          <Box
            component="img"
            src="/biznex-logo.png"
            alt="Biznex Logo"
            onClick={() => navigate('/seller/dashboard')}
            onError={(e) => {
              if (e.target.src && !e.target.src.endsWith('biznex-logo.png.png')) {
                e.target.src = '/biznex-logo.png.png';
              }
            }}
            sx={{
              maxWidth: '50px',
              width: 'auto',
              height: 'auto',
              maxHeight: '50px',
              objectFit: 'contain',
              display: 'block',
              mx: 'auto',
              cursor: 'pointer',
            }}
          />
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
          {filteredNavSections.map((section) => (
            <Box key={section.title || 'root'} sx={{ mb: 1 }}>
              {!isCollapsed && section.title && (
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
                  {section.title}
                </Typography>
              )}
              {section.items.map((item) => {
                const isLiveChat = item.label === 'Live Chat Support';
                return (
                  <Tooltip key={item.to} title={isCollapsed ? (isLiveChat && unreadChatCount > 0 ? `${item.label} (${unreadChatCount})` : item.label) : ''} placement="right">
                    <ListItemButton
                      component={NavLink}
                      to={item.to}
                      end={item.to === '/seller/customers' || item.to === '/seller/whatsapp'}
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
                        {isLiveChat && unreadChatCount > 0 ? (
                          <Badge
                            badgeContent={unreadChatCount}
                            color="error"
                            max={99}
                            sx={{
                              '& .MuiBadge-badge': {
                                fontWeight: 900,
                                fontSize: 11,
                                height: 18,
                                minWidth: 18,
                                px: 0.5,
                              },
                            }}
                          >
                            {item.icon}
                          </Badge>
                        ) : (
                          item.icon
                        )}
                      </ListItemIcon>
                      {!isCollapsed && (
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontSize: '0.95rem',
                            color: '#e5e7eb',
                            noWrap: true,
                          }}
                        />
                      )}
                    </ListItemButton>
                  </Tooltip>
                );
              })}
            </Box>
          ))}
        </List>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

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

SellerSidebar.propTypes = {
  drawerWidth: PropTypes.number.isRequired,
};

export default SellerSidebar;



