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
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import Swal from 'sweetalert2';
import { fetchBuyers } from '../../../api/buyers';
import { fetchSellers, updateSellerStatus } from '../../../api/sellers';

function BuyerSeller() {
  const [buyers, setBuyers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState({});

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [buyersResponse, sellersResponse] = await Promise.all([fetchBuyers(), fetchSellers()]);
      setBuyers(buyersResponse.data || []);
      setSellers(sellersResponse.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch marketplace data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusToggle = async (seller) => {
    const currentStatus = seller.status;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';

    // Show confirmation dialog
    const result = await Swal.fire({
      title: 'Confirm Status Change',
      text: `Are you sure you want to ${action} this user?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'OK',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) {
      return;
    }

    setUpdatingStatus((prev) => ({ ...prev, [seller.id]: true }));

    try {
      const response = await updateSellerStatus(seller.id, newStatus);

      if (response && response.success) {
        // Update the seller in the local state
        setSellers((prevSellers) =>
          prevSellers.map((s) =>
            s.id === seller.id ? { ...s, status: newStatus } : s
          )
        );

        await Swal.fire({
          icon: 'success',
          title: 'Status Updated',
          text: `Seller status has been ${action}d successfully.`,
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        throw new Error(response?.message || 'Failed to update seller status');
      }
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: err.message || 'Failed to update seller status. Please try again.',
        confirmButtonColor: '#d32f2f',
      });
    } finally {
      setUpdatingStatus((prev) => {
        const newState = { ...prev };
        delete newState[seller.id];
        return newState;
      });
    }
  };

  const renderTable = (rows, labelKey) => (
    <Table size="medium">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#e5e7eb' }}>
            {labelKey === 'buyer' ? 'Buyer' : 'Seller'}
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
            <TableCell>
              {labelKey === 'seller' ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                  <Tooltip title={row.status === 'active' ? 'Deactivate seller' : 'Activate seller'}>
                    <Switch
                      checked={row.status === 'active'}
                      onChange={() => handleStatusToggle(row)}
                      disabled={updatingStatus[row.id]}
                      size="small"
                      color="primary"
                    />
                  </Tooltip>
                  {updatingStatus[row.id] && (
                    <CircularProgress size={16} sx={{ ml: 1 }} />
                  )}
                </Box>
              ) : (
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
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <Box sx={{ width: '100%', height: '100%', p: { xs: 1.5, md: 3 }, backgroundColor: '#020617', minHeight: '100vh', color: '#e5e7eb' }}>
      {/* Header Section */}
      <Box mb={3}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: '#e5e7eb' }}>
              User Management
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
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </Box>
      )}

      {loading ? (
        <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 400 }}>
          <CircularProgress />
        </Stack>
      ) : (
        <Stack spacing={4}>
          {/* Sellers Container - First */}
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
                Sellers ({sellers.length})
              </Typography>
              {sellers.length ? (
                <Box sx={{ overflowX: 'auto' }}>{renderTable(sellers, 'seller')}</Box>
              ) : (
                <Typography sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                  No sellers found.
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Buyers Container - Second */}
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
                Buyers ({buyers.length})
              </Typography>
              {buyers.length ? (
                <Box sx={{ overflowX: 'auto' }}>{renderTable(buyers, 'buyer')}</Box>
              ) : (
                <Typography sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                  No buyers found.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}
    </Box>
  );
}

export default BuyerSeller;
