import { Box, Card, Typography } from '@mui/material';

function Reports() {
  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, backgroundColor: '#020617', minHeight: '100vh', color: '#e5e7eb' }}>
      <Card
        sx={{
          backgroundColor: '#0f172a',
          borderRadius: 2,
          border: '1px solid rgba(148, 163, 184, 0.25)',
          boxShadow: '0 20px 45px rgba(15,23,42,0.85)',
          p: { xs: 2, md: 3 },
        }}
      >
        <Typography variant="h5" fontWeight={700} sx={{ color: '#e5e7eb' }}>
          Reports
        </Typography>
        <Typography variant="body2" sx={{ color: '#9ca3af', mt: 1 }}>
          Select a report from the sidebar.
        </Typography>
      </Card>
    </Box>
  );
}

export default Reports;


