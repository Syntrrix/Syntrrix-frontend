import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  People,
  Store,
  PersonOff,
  PersonAdd,
} from '@mui/icons-material';
import { fetchSellers } from '../../../api/sellers';
import { fetchBuyers } from '../../../api/buyers';
import { useThemeContext } from '../../../context/ThemeContext';

// KPI Card Component
const KPICard = ({ title, value, icon, color }) => {
  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 2,
        backgroundColor: '#0f172a',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: `0 4px 12px ${alpha(color, 0.2)}`,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              backgroundColor: alpha(color, 0.1),
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
        <Typography variant="h4" fontWeight={700} sx={{ color: '#e5e7eb' }} gutterBottom>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ color: '#9ca3af' }} fontWeight={500}>
          {title}
        </Typography>
      </CardContent>
    </Card>
  );
};


function AdminDashboard() {
  const { isDark } = useThemeContext();
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeSellers, setActiveSellers] = useState(0);
  const [inactiveSellers, setInactiveSellers] = useState(0);
  const [activeBuyers, setActiveBuyers] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [sellersResponse, buyersResponse] = await Promise.all([
        fetchSellers(),
        fetchBuyers(),
      ]);

      const sellers = sellersResponse?.data || [];
      const buyers = buyersResponse?.data || [];

      // Calculate counts
      const activeSellersCount = sellers.filter((seller) => seller.status === 'active').length;
      const inactiveSellersCount = sellers.filter((seller) => seller.status === 'inactive').length;
      const activeBuyersCount = buyers.filter((buyer) => buyer.status === 'active').length;
      const totalActiveUsers = activeSellersCount + activeBuyersCount;

      setActiveSellers(activeSellersCount);
      setInactiveSellers(inactiveSellersCount);
      setActiveBuyers(activeBuyersCount);
      setTotalUsers(totalActiveUsers);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const kpiData = [
    {
      title: 'Total Users',
      value: totalUsers.toLocaleString(),
      icon: <People />,
      color: '#3b82f6',
    },
    {
      title: 'Active Sellers',
      value: activeSellers.toLocaleString(),
      icon: <Store />,
      color: '#10b981',
    },
    {
      title: 'Inactive Sellers',
      value: inactiveSellers.toLocaleString(),
      icon: <PersonOff />,
      color: '#f59e0b',
    },
    {
      title: 'Active Buyers',
      value: activeBuyers.toLocaleString(),
      icon: <PersonAdd />,
      color: '#8b5cf6',
    },
  ];

  return (
    <Box sx={{ width: '100%', height: '100%', p: { xs: 1.5, md: 3 }, backgroundColor: isDark ? '#020617' : '#f1f5f9', minHeight: '100vh', color: isDark ? '#e5e7eb' : '#0f172a', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
      {/* Header Section */}
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: isDark ? '#e5e7eb' : '#0f172a' }}>
          Dashboard
        </Typography>
       
      </Box>

      {/* KPI Cards */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress sx={{ color: '#22d3ee' }} />
        </Box>
      ) : (
        <Grid container spacing={2.5} mb={3}>
          {kpiData.map((kpi, index) => (
            <Grid item xs={12} sm={6} md={3} lg={3} width={300} key={index}>
              <KPICard {...kpi} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

export default AdminDashboard;


