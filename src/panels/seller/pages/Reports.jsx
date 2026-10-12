import { Box, Card, Typography } from '@mui/material';
import { useThemeContext } from '../../../context/ThemeContext';

function Reports() {
  const { isDark } = useThemeContext();
  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, backgroundColor: isDark ? '#020617' : '#f1f5f9', minHeight: '100vh', color: isDark ? '#e5e7eb' : '#0f172a', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
      <Card
        sx={{
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          borderRadius: 2,
          border: isDark ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid #e2e8f0',
          boxShadow: isDark ? '0 20px 45px rgba(15,23,42,0.85)' : '0 10px 30px rgba(0,0,0,0.05)',
          p: { xs: 2, md: 3 },
        }}
      >
        <Typography variant="h5" fontWeight={700} sx={{ color: isDark ? '#e5e7eb' : '#0f172a' }}>
          Reports
        </Typography>
        <Typography variant="body2" sx={{ color: isDark ? '#9ca3af' : '#475569', mt: 1 }}>
          Select a report from the sidebar.
        </Typography>
      </Card>
    </Box>
  );
}

export default Reports;


