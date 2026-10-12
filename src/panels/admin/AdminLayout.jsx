import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import AdminNavbar from './components/AdminNavbar';
import AdminSidebar from './components/AdminSidebar';
import { SidebarProvider, useSidebar } from '../../context/SidebarContext';
import { useThemeContext } from '../../context/ThemeContext';

const drawerWidth = 300;
const collapsedWidth = 64;

function AdminLayoutContent() {
  const { isCollapsed } = useSidebar();
  const { isDark } = useThemeContext();
  const actualWidth = isCollapsed ? collapsedWidth : drawerWidth;

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: isDark ? '#020617' : '#f1f5f9',
        color: isDark ? '#f8fafc' : '#0f172a',
        transition: 'background-color 0.3s ease, color 0.3s ease',
        width: '100%',
        overflowX: 'hidden',
      }}
    >
      <AdminNavbar drawerWidth={drawerWidth} />
      <AdminSidebar drawerWidth={drawerWidth} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${actualWidth}px)` },
          minWidth: 0,
          maxWidth: { md: `calc(100% - ${actualWidth}px)` },
          p: 0,
          transition: 'width 0.3s ease, max-width 0.3s ease',
          boxSizing: 'border-box',
          overflowX: 'hidden',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}

function AdminLayout() {
  return (
    <SidebarProvider>
      <AdminLayoutContent />
    </SidebarProvider>
  );
}

export default AdminLayout;
