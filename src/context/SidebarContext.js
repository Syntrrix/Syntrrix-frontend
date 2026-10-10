import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';

const SidebarContext = createContext();

export function SidebarProvider({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isSidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-collapse on mobile/tablet
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const toggleCollapse = () => setIsCollapsed((prev) => !prev);

  const value = useMemo(
    () => ({
      isSidebarOpen,
      isCollapsed,
      toggleSidebar,
      toggleCollapse,
      closeSidebar: () => setSidebarOpen(false),
      openSidebar: () => setSidebarOpen(true),
    }),
    [isSidebarOpen, isCollapsed],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
