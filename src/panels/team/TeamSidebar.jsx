import { useCallback, useEffect, useState } from 'react';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ChatIcon from '@mui/icons-material/Chat';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LogoutIcon from '@mui/icons-material/Logout';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
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
import { useSidebar } from '../../context/SidebarContext';
import { useAuth } from '../../context/AuthContext';
import { fetchSellerLiveChatSupportSessions } from '../../api/liveChat';

function TeamSidebar({ drawerWidth }) {
  const { isSidebarOpen, toggleSidebar, isCollapsed, toggleCollapse } = useSidebar();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const collapsedWidth = 64;
  const actualWidth = isCollapsed ? collapsedWidth : drawerWidth;
  const isTeamManager = user?.role?.id === 4;
  const basePath = isTeamManager ? '/team-manager' : '/agent';

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

  const items = [
    { label: 'Dashboard', to: `${basePath}/dashboard`, icon: <AssessmentIcon /> },
    { label: 'Live Chat', to: `${basePath}/live-chat-support`, icon: <ChatIcon /> },
    { label: 'Lead Pipeline', to: `${basePath}/lead-pipeline`, icon: <AccountTreeIcon /> },
    { label: 'Data Hub', to: `${basePath}/data-hub`, icon: <ListAltIcon /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#0b1624', color: '#e5e7eb' }}>
      <Toolbar
        sx={{
          backgroundColor: '#0f1f33',
          minHeight: '80px !important',
          justifyContent: 'space-between',
          px: isCollapsed ? 1 : 2,
        }}
      >
        {!isCollapsed ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <Typography sx={{ fontWeight: 800, fontSize: 18 }}>
              {isTeamManager ? 'Team Manager' : 'Agent'} Panel
            </Typography>
            <Typography variant="caption" sx={{ color: '#9ca3af' }}>
              Seller Team Workspace
            </Typography>
          </Box>
        ) : (
          <Typography sx={{ fontWeight: 800, mx: 'auto' }}>
            {isTeamManager ? 'TM' : 'AG'}
          </Typography>
        )}
        {isDesktop && (
          <IconButton onClick={toggleCollapse} sx={{ color: '#cbd5e1', position: 'absolute', right: 8, top: 16 }}>
            {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        )}
      </Toolbar>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      <Box sx={{ flexGrow: 1, py: 1, overflowY: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
        <List sx={{ px: 0.5 }}>
          {items.map((item) => {
            const isLiveChat = item.label === 'Live Chat' || item.to.includes('live-chat-support');
            return (
              <Tooltip key={item.to} title={isCollapsed ? (isLiveChat && unreadChatCount > 0 ? `${item.label} (${unreadChatCount})` : item.label) : ''} placement="right">
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
                    '&:hover': { backgroundColor: alpha('#22d3ee', 0.1) },
                    '&.active': {
                      backgroundColor: alpha('#22d3ee', 0.18),
                      borderLeft: '4px solid #22d3ee',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 40, justifyContent: 'center', color: '#9ca3af' }}>
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
                      primaryTypographyProps={{ fontSize: '0.95rem', color: '#e5e7eb', noWrap: true }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            );
          })}
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
            }}
          >
            <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 40, justifyContent: 'center', color: '#f87171' }}>
              <LogoutIcon />
            </ListItemIcon>
            {!isCollapsed && (
              <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 600, color: '#fca5a5' }} />
            )}
          </ListItemButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: actualWidth }, flexShrink: { md: 0 } }}>
      <Drawer
        variant="temporary"
        open={isSidebarOpen}
        onClose={toggleSidebar}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, backgroundColor: '#0b1624' },
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
            borderRight: '1px solid rgba(255,255,255,0.08)',
            transition: 'width 0.3s ease',
            overflowX: 'hidden',
            backgroundColor: '#0b1624',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}

TeamSidebar.propTypes = {
  drawerWidth: PropTypes.number.isRequired,
};

export default TeamSidebar;
