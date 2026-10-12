import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

const ThemeContext = createContext({
  mode: 'dark',
  isDark: true,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export const useThemeContext = () => useContext(ThemeContext);

export const CustomThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('app_theme_mode');
    return savedMode === 'light' ? 'light' : 'dark';
  });

  const toggleTheme = () => {
    setMode((prevMode) => {
      const nextMode = prevMode === 'dark' ? 'light' : 'dark';
      localStorage.setItem('app_theme_mode', nextMode);
      return nextMode;
    });
  };

  const setThemeMode = (newMode) => {
    if (newMode === 'dark' || newMode === 'light') {
      setMode(newMode);
      localStorage.setItem('app_theme_mode', newMode);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    document.body.setAttribute('data-theme', mode);
    if (mode === 'light') {
      document.body.style.backgroundColor = '#f1f5f9';
      document.body.style.color = '#0f172a';
    } else {
      document.body.style.backgroundColor = '#020617';
      document.body.style.color = '#f8fafc';
    }
  }, [mode]);

  const isDark = mode === 'dark';

  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: mode,
          primary: {
            main: '#2f855a',
            light: '#38a169',
            dark: '#22543d',
          },
          secondary: {
            main: '#6b46c1',
          },
          background: {
            default: isDark ? '#020617' : '#f1f5f9',
            paper: isDark ? '#0f172a' : '#ffffff',
          },
          text: {
            primary: isDark ? '#f8fafc' : '#0f172a',
            secondary: isDark ? '#94a3b8' : '#475569',
          },
          divider: isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(226, 232, 240, 0.8)',
        },
        typography: {
          fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                backgroundColor: isDark ? '#020617' : '#f1f5f9',
                color: isDark ? '#f8fafc' : '#0f172a',
                transition: 'background-color 0.3s ease, color 0.3s ease',
              },
              'html[data-theme="light"] main, html[data-theme="light"] #root': {
                backgroundColor: '#f1f5f9 !important',
                color: '#0f172a !important',
              },
              /* Global Light Mode Overrides for Modals, Papers, Cards, and Text Visibility */
              'html[data-theme="light"] .MuiPaper-root, html[data-theme="light"] .MuiDialog-paper, html[data-theme="light"] .MuiPopover-paper, html[data-theme="light"] .MuiMenu-paper': {
                backgroundColor: '#ffffff !important',
                color: '#0f172a !important',
                borderColor: 'rgba(226, 232, 240, 0.8) !important',
              },
              'html[data-theme="light"] .MuiDialogTitle-root, html[data-theme="light"] .MuiDialogContent-root, html[data-theme="light"] .MuiDialogActions-root': {
                backgroundColor: '#ffffff !important',
                color: '#0f172a !important',
              },
              'html[data-theme="light"] .MuiTypography-root': {
                color: 'inherit',
              },
              'html[data-theme="light"] .MuiTypography-h1, html[data-theme="light"] .MuiTypography-h2, html[data-theme="light"] .MuiTypography-h3, html[data-theme="light"] .MuiTypography-h4, html[data-theme="light"] .MuiTypography-h5, html[data-theme="light"] .MuiTypography-h6, html[data-theme="light"] .MuiTypography-subtitle1, html[data-theme="light"] .MuiTypography-subtitle2, html[data-theme="light"] .MuiTypography-body1, html[data-theme="light"] .MuiTypography-body2': {
                color: '#0f172a !important',
              },
              'html[data-theme="light"] .MuiTypography-caption': {
                color: '#475569 !important',
              },
              'html[data-theme="light"] .MuiOutlinedInput-root input, html[data-theme="light"] .MuiInputBase-input, html[data-theme="light"] .MuiOutlinedInput-input': {
                color: '#0f172a !important',
                backgroundColor: '#ffffff !important',
              },
              'html[data-theme="light"] .MuiOutlinedInput-root': {
                backgroundColor: '#ffffff !important',
              },
              'html[data-theme="light"] .MuiTableHead-root th, html[data-theme="light"] .MuiTableCell-head': {
                backgroundColor: '#f1f5f9 !important',
                color: '#334155 !important',
                borderColor: '#e2e8f0 !important',
              },
              'html[data-theme="light"] .MuiTableCell-body, html[data-theme="light"] .MuiTableCell-root': {
                color: '#0f172a !important',
                borderColor: '#e2e8f0 !important',
              },
              'html[data-theme="light"] .MuiCard-root': {
                backgroundColor: '#ffffff !important',
                color: '#0f172a !important',
                borderColor: '#e2e8f0 !important',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05) !important',
              },
              'html[data-theme="light"] [style*="background-color: #020617"], html[data-theme="light"] [style*="backgroundColor: #020617"]': {
                backgroundColor: '#f1f5f9 !important',
                color: '#0f172a !important',
              },
              'html[data-theme="light"] [style*="background-color: #0f172a"], html[data-theme="light"] [style*="backgroundColor: #0f172a"]': {
                backgroundColor: '#ffffff !important',
                color: '#0f172a !important',
                borderColor: 'rgba(226, 232, 240, 0.8) !important',
              },
              'html[data-theme="light"] [style*="color: #ffffff"], html[data-theme="light"] [style*="color: white"]': {
                color: '#0f172a !important',
              },
              'html[data-theme="light"] [style*="color: #f8fafc"], html[data-theme="light"] [style*="color: #e5e7eb"], html[data-theme="light"] [style*="color: #e2e8f0"]': {
                color: '#0f172a !important',
              },
              'html[data-theme="light"] [style*="background-color: #0b1329"], html[data-theme="light"] [style*="backgroundColor: #0b1329"]': {
                backgroundColor: '#ffffff !important',
                color: '#0f172a !important',
                borderColor: '#e2e8f0 !important',
              },
              'html[data-theme="light"] [style*="background-color: #090d16"], html[data-theme="light"] [style*="backgroundColor: #090d16"]': {
                backgroundColor: '#f8fafc !important',
                color: '#0f172a !important',
              },
              'html[data-theme="light"] [style*="background-color: #0b1624"], html[data-theme="light"] [style*="backgroundColor: #0b1624"]': {
                backgroundColor: '#f1f5f9 !important',
                color: '#0f172a !important',
              },
              'html[data-theme="light"] .MuiTableHead-root .MuiTableCell-root, html[data-theme="light"] .MuiTableCell-head, html[data-theme="light"] th.MuiTableCell-root': {
                backgroundColor: '#0ea5e9 !important',
                color: '#ffffff !important',
                fontWeight: '700 !important',
              },
              'html[data-theme="light"] [style*="background-color: #0f2339"], html[data-theme="light"] [style*="backgroundColor: #0f2339"]': {
                backgroundColor: '#f8fafc !important',
                color: '#0f172a !important',
                borderColor: '#cbd5e1 !important',
              },
              'html[data-theme="light"] .MuiInputBase-input, html[data-theme="light"] .MuiOutlinedInput-input': {
                color: '#0f172a !important',
              },
              'html[data-theme="light"] .MuiInputLabel-root': {
                color: '#475569 !important',
              },
              'html[data-theme="light"] .MuiOutlinedInput-notchedOutline': {
                borderColor: '#cbd5e1 !important',
              },
              'html[data-theme="light"] .react-flow': {
                backgroundColor: '#f1f5f9 !important',
              },
              'html[data-theme="light"] .react-flow__node': {
                backgroundColor: '#ffffff !important',
                color: '#0f172a !important',
                borderColor: '#cbd5e1 !important',
                boxShadow: '0 4px 14px rgba(0,0,0,0.08) !important',
              },
              'html[data-theme="light"] .react-flow__node-default, html[data-theme="light"] .react-flow__node-input, html[data-theme="light"] .react-flow__node-output': {
                backgroundColor: '#ffffff !important',
                color: '#0f172a !important',
                borderColor: '#0284c7 !important',
              },
              'html[data-theme="light"] .react-flow__controls button': {
                backgroundColor: '#ffffff !important',
                color: '#0f172a !important',
                fill: '#0f172a !important',
                borderColor: '#cbd5e1 !important',
              },
              'html[data-theme="light"] .MuiDialog-paper, html[data-theme="light"] .MuiDialogContent-root': {
                backgroundColor: '#ffffff !important',
                color: '#0f172a !important',
              },
              'html[data-theme="light"] .MuiDialogTitle-root': {
                color: '#0f172a !important',
                borderColor: '#e2e8f0 !important',
              },
              'html[data-theme="light"] .MuiDialogActions-root': {
                borderColor: '#e2e8f0 !important',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: '24px',
                textTransform: 'none',
              },
              contained: {
                borderRadius: '24px',
              },
              outlined: {
                borderRadius: '24px',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                color: isDark ? '#f8fafc' : '#0f172a',
                backgroundImage: 'none',
                transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                color: isDark ? '#f8fafc' : '#0f172a',
                boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.06)',
                border: isDark ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid rgba(226, 232, 240, 0.8)',
              },
            },
          },
          MuiDialog: {
            styleOverrides: {
              paper: {
                backgroundColor: isDark ? '#090d16' : '#ffffff',
                color: isDark ? '#f8fafc' : '#0f172a',
                border: isDark ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid rgba(226, 232, 240, 0.8)',
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              root: {
                borderColor: isDark ? 'rgba(148, 163, 184, 0.15)' : '#e2e8f0',
                color: isDark ? '#f8fafc' : '#0f172a',
              },
              head: {
                backgroundColor: isDark ? '#1e293b' : '#0ea5e9',
                color: '#ffffff !important',
                fontWeight: 700,
              },
            },
          },
        },
      }),
    [mode, isDark]
  );

  const contextValue = useMemo(
    () => ({
      mode,
      isDark,
      toggleTheme,
      setThemeMode,
    }),
    [mode, isDark]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
