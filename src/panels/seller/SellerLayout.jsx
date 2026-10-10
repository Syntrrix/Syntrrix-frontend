import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import SellerSidebar from './components/SellerSidebar';
import SellerNavbar from './components/SellerNavbar';
import { SidebarProvider, useSidebar } from '../../context/SidebarContext';

const drawerWidth = 300;
const collapsedWidth = 64;

function SellerLayoutContent() {
  const { isCollapsed } = useSidebar();
  const actualWidth = isCollapsed ? collapsedWidth : drawerWidth;

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#020617',
        width: '100%',
        overflowX: 'hidden',
      }}
    >
      <SellerNavbar drawerWidth={drawerWidth} />
      <SellerSidebar drawerWidth={drawerWidth} />
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

function SellerLayout() {
  return (
    <SidebarProvider>
      <SellerLayoutContent />
    </SidebarProvider>
  );
}

export default SellerLayout;



