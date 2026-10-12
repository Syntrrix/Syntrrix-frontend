import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { fetchBuyers } from '../../../api/buyers';
import { useThemeContext } from '../../../context/ThemeContext';

function BuyerManagement() {
  const { isDark } = useThemeContext();
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const buyersResponse = await fetchBuyers();
      setBuyers(buyersResponse.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch buyers data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const renderTable = (rows) => (
    <Table size="medium">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#e5e7eb' }}>
            Buyer
          </TableCell>
          <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#e5e7eb' }}>Email</TableCell>
          <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#e5e7eb' }}>Phone</TableCell>
          <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#e5e7eb' }}>Status</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.id}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(34, 211, 238, 0.05)',
              },
            }}
          >
            <TableCell sx={{ color: '#e5e7eb' }}>
              <Typography variant="body2" fontWeight={500} sx={{ color: '#e5e7eb' }}>
                {row.full_name}
              </Typography>
            </TableCell>
            <TableCell sx={{ color: '#e5e7eb' }}>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                {row.email}
              </Typography>
            </TableCell>
            <TableCell sx={{ color: '#e5e7eb' }}>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                {row.phone}
              </Typography>
            </TableCell>
            <TableCell sx={{ color: '#e5e7eb' }}>
              <Chip
                label={row.status}
                size="small"
                sx={{
                  fontWeight: 500,
                  backgroundColor:
                    row.status === 'active'
                      ? '#10b981'
                      : row.status === 'pending'
                        ? '#f59e0b'
                        : '#6b7280',
                  color: '#fff',
                }}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const activeBuyers = buyers.filter((buyer) => buyer.status === 'active');
  const inactiveBuyers = buyers.filter((buyer) => buyer.status === 'inactive');

  return (
    <Box sx={{ width: '100%', height: '100%', p: { xs: 1.5, md: 3 }, backgroundColor: isDark ? '#020617' : '#f1f5f9', minHeight: '100vh', color: isDark ? '#e5e7eb' : '#0f172a', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
      {/* Header Section */}
      <Box mb={3}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: isDark ? '#e5e7eb' : '#0f172a' }}>
              Buyer Management
            </Typography>
          
          </Box>
          <Tooltip title="Refresh data">
            <span>
              <IconButton onClick={loadData} disabled={loading} sx={{ color: '#22d3ee' }}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {error && (
        <Box mb={3}>
          <Alert severity="error" onClose={() => setError('')} sx={{ backgroundColor: '#1e293b', color: '#e5e7eb' }}>
            {error}
          </Alert>
        </Box>
      )}

      {loading ? (
        <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 400 }}>
          <CircularProgress sx={{ color: '#22d3ee' }} />
        </Stack>
      ) : (
        <Stack spacing={4}>
          {/* Active Buyers Container */}
          <Card
            sx={{
              borderRadius: 2,
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              boxShadow: '0 20px 45px rgba(15,23,42,0.85)',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 25px 50px rgba(15,23,42,0.9)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: '#e5e7eb' }}>
                Active Buyers ({activeBuyers.length})
              </Typography>
              {activeBuyers.length ? (
                <Box sx={{ overflowX: 'auto' }}>{renderTable(activeBuyers)}</Box>
              ) : (
                <Typography sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                  No active buyers found.
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Inactive Buyers Container */}
          <Card
            sx={{
              borderRadius: 2,
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              boxShadow: '0 20px 45px rgba(15,23,42,0.85)',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 25px 50px rgba(15,23,42,0.9)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: '#e5e7eb' }}>
                Inactive Buyers ({inactiveBuyers.length})
              </Typography>
              {inactiveBuyers.length ? (
                <Box sx={{ overflowX: 'auto' }}>{renderTable(inactiveBuyers)}</Box>
              ) : (
                <Typography sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                  No inactive buyers found.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}
    </Box>
  );
}

export default BuyerManagement;


