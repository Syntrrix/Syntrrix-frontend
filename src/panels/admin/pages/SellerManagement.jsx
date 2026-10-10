import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
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
  Avatar,
  Button,
  DialogActions,
  Paper,
  TextField,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SaveIcon from '@mui/icons-material/Save';
import Swal from 'sweetalert2';
import { fetchSellers, updateSellerStatus, assignSellerPlan, updateSellerAppId } from '../../../api/sellers';
import { fetchPlans } from '../../../api/plans';

function SellerManagement() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState({});
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [channelAppIds, setChannelAppIds] = useState({});
  const [savingAppIdConfigId, setSavingAppIdConfigId] = useState(null);

  // Assign Plan State
  const [assignPlanModalOpen, setAssignPlanModalOpen] = useState(false);
  const [sellerForPlan, setSellerForPlan] = useState(null);
  const [plansList, setPlansList] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const sellersResponse = await fetchSellers();
      setSellers(sellersResponse.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch sellers data.');
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

  const handleViewSeller = (seller) => {
    setSelectedSeller(seller);
    const initialAppIds = {};
    const configs = seller.whatsapp_configs || (seller.whatsapp_config ? [seller.whatsapp_config] : []);
    configs.forEach((c) => {
      if (c.config_id) {
        initialAppIds[c.config_id] = c.app_id || '';
      }
    });
    setChannelAppIds(initialAppIds);
    setViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setViewModalOpen(false);
    setSelectedSeller(null);
    setChannelAppIds({});
  };

  const handleSaveAppId = async (configId) => {
    if (!selectedSeller) return;
    const appIdToSave = channelAppIds[configId] || '';
    setSavingAppIdConfigId(configId);
    try {
      const res = await updateSellerAppId(selectedSeller.id, appIdToSave, configId);
      if (res && res.success) {
        const updatedConfigs = (selectedSeller.whatsapp_configs || []).map((c) =>
          c.config_id === configId ? { ...c, app_id: appIdToSave } : c
        );
        setSellers((prev) =>
          prev.map((s) =>
            s.id === selectedSeller.id
              ? {
                  ...s,
                  whatsapp_configs: updatedConfigs,
                  whatsapp_config: updatedConfigs[0] || s.whatsapp_config,
                }
              : s
          )
        );
        setSelectedSeller((prev) => ({
          ...prev,
          whatsapp_configs: updatedConfigs,
          whatsapp_config: updatedConfigs[0] || prev?.whatsapp_config,
        }));

        await Swal.fire({
          icon: 'success',
          title: 'App ID Saved',
          text: 'Meta App ID saved successfully for this WhatsApp channel!',
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        throw new Error(res?.message || 'Failed to save App ID');
      }
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to save App ID', 'error');
    } finally {
      setSavingAppIdConfigId(null);
    }
  };

  const handleOpenAssignPlan = async (seller) => {
    setSellerForPlan(seller);
    setSelectedPlanId(seller.plan ? seller.plan.plan_id : '');
    setAssignPlanModalOpen(true);
    setLoadingPlans(true);
    try {
      const res = await fetchPlans();
      setPlansList(res.data || []);
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to fetch plans', 'error');
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleCloseAssignPlan = () => {
    setAssignPlanModalOpen(false);
    setSellerForPlan(null);
    setSelectedPlanId('');
  };

  const handleAssignPlanSubmit = async () => {
    if (!sellerForPlan) return;
    setAssigning(true);
    try {
      const planIdVal = selectedPlanId ? parseInt(selectedPlanId, 10) : null;
      const res = await assignSellerPlan(sellerForPlan.id, planIdVal);

      if (res && res.success) {
        setSellers((prev) =>
          prev.map((s) =>
            s.id === sellerForPlan.id ? { ...s, plan: res.data?.plan || null } : s
          )
        );

        await Swal.fire({
          icon: 'success',
          title: 'Plan Assigned',
          text: `Plan updated for ${sellerForPlan.full_name}!`,
          timer: 2000,
          showConfirmButton: false,
        });
        handleCloseAssignPlan();
      } else {
        throw new Error(res?.message || 'Failed to assign plan');
      }
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to assign plan', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const getInitials = (fullName) => {
    if (!fullName) return 'SE';
    const parts = fullName.split(' ').filter(Boolean);
    const [first = 'S', second = 'E'] = parts;
    return `${first[0] || 'S'}${(parts.length > 1 ? parts[parts.length - 1][0] : second[0]) || 'E'}`.toUpperCase();
  };

  const renderTable = (rows) => (
    <Table size="medium">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#e5e7eb' }}>
            Seller
          </TableCell>
          <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#e5e7eb' }}>Email</TableCell>
          <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#e5e7eb' }}>Phone</TableCell>
          <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#e5e7eb' }}>Assigned Plan</TableCell>
          <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#e5e7eb' }}>Status</TableCell>
          <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#e5e7eb' }}>Action</TableCell>
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
                label={row.plan ? row.plan.name : 'No Plan'}
                size="small"
                sx={{
                  fontWeight: 600,
                  backgroundColor: row.plan ? 'rgba(56, 189, 248, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                  color: row.plan ? '#38bdf8' : '#94a3b8',
                  border: row.plan ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(148, 163, 184, 0.2)',
                }}
              />
            </TableCell>
            <TableCell sx={{ color: '#e5e7eb' }}>
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
            </TableCell>
            <TableCell>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AssignmentIcon fontSize="small" />}
                  onClick={() => handleOpenAssignPlan(row)}
                  sx={{
                    color: '#38bdf8',
                    borderColor: 'rgba(56, 189, 248, 0.4)',
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    py: 0.4,
                    px: 1.2,
                    '&:hover': {
                      backgroundColor: 'rgba(56, 189, 248, 0.1)',
                      borderColor: '#38bdf8',
                    },
                  }}
                >
                  Assign Plan
                </Button>
                <Tooltip title="View Seller Profile">
                  <IconButton
                    onClick={() => handleViewSeller(row)}
                    size="small"
                    sx={{
                      color: '#22d3ee',
                      '&:hover': {
                        backgroundColor: 'rgba(34, 211, 238, 0.1)',
                      },
                    }}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const activeSellers = sellers.filter((seller) => seller.status === 'active');
  const inactiveSellers = sellers.filter((seller) => seller.status === 'inactive');

  return (
    <Box sx={{ width: '100%', height: '100%', p: { xs: 1.5, md: 3 }, backgroundColor: '#020617', minHeight: '100vh', color: '#e5e7eb' }}>
      {/* Header Section */}
      <Box mb={3}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: '#e5e7eb' }}>
              Seller Management
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
          {/* Active Sellers Container */}
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
                Active Sellers ({activeSellers.length})
              </Typography>
              {activeSellers.length ? (
                <Box sx={{ overflowX: 'auto' }}>{renderTable(activeSellers)}</Box>
              ) : (
                <Typography sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                  No active sellers found.
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Inactive Sellers Container */}
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
                Inactive Sellers ({inactiveSellers.length})
              </Typography>
              {inactiveSellers.length ? (
                <Box sx={{ overflowX: 'auto' }}>{renderTable(inactiveSellers)}</Box>
              ) : (
                <Typography sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                  No inactive sellers found.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* Seller Profile View Modal */}
      <Dialog
        open={viewModalOpen}
        onClose={handleCloseViewModal}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#0f172a',
            color: '#e5e7eb',
            borderRadius: 3.5,
            border: '1px solid rgba(148, 163, 184, 0.25)',
            boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.9)',
            width: '95vw',
            maxWidth: '1450px',
            maxHeight: '92vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
            py: 2,
            px: 3.5,
          }}
        >
          <Typography variant="h5" fontWeight={700} sx={{ color: '#e5e7eb' }}>
            Seller Profile
          </Typography>
          <IconButton
            onClick={handleCloseViewModal}
            sx={{
              color: '#9ca3af',
              '&:hover': {
                backgroundColor: 'rgba(148, 163, 184, 0.1)',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            p: { xs: 2.5, md: 3.5 },
            overflowY: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {selectedSeller && (
            <>
              {/* Profile Header Card */}
              <Card
                sx={{
                  backgroundColor: '#1e293b',
                  borderRadius: 2,
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  p: 3,
                  mb: 3,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                  <Avatar
                    sx={{
                      width: 100,
                      height: 100,
                      bgcolor: '#22d3ee',
                      fontSize: '2.5rem',
                      fontWeight: 700,
                    }}
                  >
                    {getInitials(selectedSeller.full_name)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="h4" fontWeight={700} sx={{ color: '#e5e7eb', mb: 1 }}>
                      {selectedSeller.full_name || 'N/A'}
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#9ca3af', mb: 1 }}>
                      {selectedSeller.email || 'N/A'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                      <Chip
                        label={selectedSeller.status || 'N/A'}
                        color={getStatusColor(selectedSeller.status)}
                        sx={{
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}
                      />
                      <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                        {selectedSeller.role?.name || 'Seller'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Card>

              {/* Profile Details */}
              <Grid container spacing={3}>
                {/* Personal Information */}
                <Grid item xs={12} md={6}>
                  <Card
                    sx={{
                      backgroundColor: '#1e293b',
                      borderRadius: 2,
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      p: 3,
                      height: '100%',
                    }}
                  >
                    <Typography variant="h6" fontWeight={600} sx={{ color: '#e5e7eb', mb: 2 }}>
                      Personal Information
                    </Typography>
                    <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.25)', mb: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                          Full Name
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#e5e7eb', mt: 0.5 }}>
                          {selectedSeller.full_name || 'N/A'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                          Email
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#e5e7eb', mt: 0.5 }}>
                          {selectedSeller.email || 'N/A'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                          Phone
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#e5e7eb', mt: 0.5 }}>
                          {selectedSeller.phone || 'N/A'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                          Status
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <Chip
                            label={selectedSeller.status || 'N/A'}
                            color={getStatusColor(selectedSeller.status)}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              textTransform: 'capitalize',
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>
                  </Card>
                </Grid>

                {/* Business Information */}
                <Grid item xs={12} md={6}>
                  <Card
                    sx={{
                      backgroundColor: '#1e293b',
                      borderRadius: 2,
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      p: 3,
                      height: '100%',
                    }}
                  >
                    <Typography variant="h6" fontWeight={600} sx={{ color: '#e5e7eb', mb: 2 }}>
                      Business Information
                    </Typography>
                    <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.25)', mb: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                          Company Name
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#e5e7eb', mt: 0.5 }}>
                          {selectedSeller.company_name || 'N/A'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                          GST Number
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#e5e7eb', mt: 0.5 }}>
                          {selectedSeller.gst_number || 'N/A'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                          Address
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#e5e7eb', mt: 0.5 }}>
                          {selectedSeller.address || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>

                {/* Banking Information */}
                <Grid item xs={12} md={6}>
                  <Card
                    sx={{
                      backgroundColor: '#1e293b',
                      borderRadius: 2,
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      p: 3,
                      height: '100%',
                    }}
                  >
                    <Typography variant="h6" fontWeight={600} sx={{ color: '#e5e7eb', mb: 2 }}>
                      Banking Information
                    </Typography>
                    <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.25)', mb: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                          Account Holder Name
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#e5e7eb', mt: 0.5 }}>
                          {selectedSeller.meta?.account_holder_name || 'N/A'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                          Account Number
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#e5e7eb', mt: 0.5 }}>
                          {selectedSeller.meta?.account_number || 'N/A'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                          IFSC Code
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#e5e7eb', mt: 0.5 }}>
                          {selectedSeller.meta?.ifsc_code || 'N/A'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                          Bank Name
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#e5e7eb', mt: 0.5 }}>
                          {selectedSeller.meta?.bank_name || 'N/A'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                          PAN Number
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#e5e7eb', mt: 0.5 }}>
                          {selectedSeller.meta?.pan_number || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>

                {/* Account Information */}
                <Grid item xs={12} md={6}>
                  <Card
                    sx={{
                      backgroundColor: '#1e293b',
                      borderRadius: 2,
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      p: 3,
                      height: '100%',
                    }}
                  >
                    <Typography variant="h6" fontWeight={600} sx={{ color: '#e5e7eb', mb: 2 }}>
                      Account Information
                    </Typography>
                    <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.25)', mb: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                          User ID
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#e5e7eb', mt: 0.5 }}>
                          {selectedSeller.id || 'N/A'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                          Role
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#e5e7eb', mt: 0.5 }}>
                          {selectedSeller.role?.name || 'Seller'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                          Account Created
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#e5e7eb', mt: 0.5 }}>
                          {formatDate(selectedSeller.created_at)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                          Last Updated
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#e5e7eb', mt: 0.5 }}>
                          {formatDate(selectedSeller.updated_at)}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>

                {/* WhatsApp Information (Multiple Channels Supported) */}
                <Grid item xs={12}>
                  <Box sx={{ mt: 1 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box sx={{ backgroundColor: '#25d366', p: 0.8, borderRadius: '10px', display: 'flex' }}>
                          <WhatsAppIcon sx={{ color: '#ffffff', fontSize: 20 }} />
                        </Box>
                        <Box>
                          <Typography variant="h6" fontWeight={700} sx={{ color: '#e5e7eb', fontSize: '1.1rem' }}>
                            WhatsApp Channels & Configuration
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                            {(selectedSeller.whatsapp_configs || (selectedSeller.whatsapp_config ? [selectedSeller.whatsapp_config] : [])).length} Channel(s) configured for this seller
                          </Typography>
                        </Box>
                      </Stack>
                    </Stack>

                    {(selectedSeller.whatsapp_configs || (selectedSeller.whatsapp_config ? [selectedSeller.whatsapp_config] : [])).length === 0 ? (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 3,
                          borderRadius: 2,
                          backgroundColor: '#1e293b',
                          border: '1px dashed rgba(148, 163, 184, 0.25)',
                          textAlign: 'center',
                        }}
                      >
                        <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                          No WhatsApp Channels configured for this seller yet.
                        </Typography>
                      </Paper>
                    ) : (
                      <Grid container spacing={3}>
                        {(selectedSeller.whatsapp_configs || [selectedSeller.whatsapp_config]).map((channel, idx) => {
                          const configId = channel.config_id;
                          const currentAppId = channelAppIds[configId] !== undefined ? channelAppIds[configId] : (channel.app_id || '');
                          const isSaving = savingAppIdConfigId === configId;

                          return (
                            <Grid item xs={12} md={6} key={configId || idx}>
                              <Card
                                sx={{
                                  backgroundColor: '#1e293b',
                                  borderRadius: 2.5,
                                  border: '1px solid rgba(56, 189, 248, 0.25)',
                                  p: 3,
                                  height: '100%',
                                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                                }}
                              >
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <Chip
                                      label={`Channel ${idx + 1}`}
                                      size="small"
                                      sx={{ bgcolor: '#0284c7', color: '#ffffff', fontWeight: 800, fontSize: '0.72rem' }}
                                    />
                                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#ffffff' }}>
                                      {channel.channel_name || `WhatsApp Channel ${idx + 1}`}
                                    </Typography>
                                  </Stack>
                                  <Chip
                                    label={channel.phone_number ? 'Configured' : 'Not Connected'}
                                    size="small"
                                    color={channel.phone_number ? 'success' : 'default'}
                                    sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                                  />
                                </Stack>

                                <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.2)', mb: 2 }} />

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <Box>
                                    <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                                      Channel Name (Read-only)
                                    </Typography>
                                    <Typography variant="body1" sx={{ color: '#e5e7eb', mt: 0.4, fontWeight: 600 }}>
                                      {channel.channel_name || 'N/A'}
                                    </Typography>
                                  </Box>

                                  <Box>
                                    <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                                      Mobile Phone Number (Read-only)
                                    </Typography>
                                    <Typography variant="body1" sx={{ color: '#e5e7eb', mt: 0.4, fontWeight: 500 }}>
                                      {channel.phone_number || 'N/A'}
                                    </Typography>
                                  </Box>

                                  <Box>
                                    <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                                      Phone Number ID (Read-only)
                                    </Typography>
                                    <Typography variant="body1" sx={{ color: '#38bdf8', mt: 0.4, fontFamily: 'monospace', fontSize: '0.88rem' }}>
                                      {channel.phone_number_id || 'N/A'}
                                    </Typography>
                                  </Box>

                                  <Box>
                                    <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                                      WABA ID (WhatsApp Business Account ID - Read-only)
                                    </Typography>
                                    <Typography variant="body1" sx={{ color: '#38bdf8', mt: 0.4, fontFamily: 'monospace', fontSize: '0.88rem' }}>
                                      {channel.whatsapp_business_account_id || 'N/A'}
                                    </Typography>
                                  </Box>

                                  <Box>
                                    <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                                      System Access Token (Read-only)
                                    </Typography>
                                    <Typography variant="body1" sx={{ color: '#94a3b8', mt: 0.4, fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-all', bgcolor: '#0f172a', p: 1, borderRadius: 1, border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                                      {channel.access_token ? `${channel.access_token.substring(0, 45)}...` : 'N/A'}
                                    </Typography>
                                  </Box>

                                  {/* App ID Field (Editable per Channel + Save Button) */}
                                  <Box sx={{ mt: 1, p: 2, bgcolor: '#0f172a', borderRadius: 2, border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                                    <Typography variant="caption" sx={{ color: '#38bdf8', fontWeight: 700, display: 'block', mb: 1 }}>
                                      App ID for {channel.channel_name || `Channel ${idx + 1}`} (Editable) *
                                    </Typography>
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                      <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Enter Meta App ID for this channel"
                                        value={currentAppId}
                                        onChange={(e) =>
                                          setChannelAppIds((prev) => ({
                                            ...prev,
                                            [configId]: e.target.value,
                                          }))
                                        }
                                        InputProps={{
                                          sx: {
                                            color: '#ffffff',
                                            backgroundColor: '#020617',
                                            borderRadius: '8px',
                                            height: 40,
                                            fontSize: '0.85rem',
                                            fontFamily: 'monospace',
                                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#38bdf8' },
                                          },
                                        }}
                                      />
                                      <Button
                                        variant="contained"
                                        disabled={isSaving}
                                        onClick={() => handleSaveAppId(configId)}
                                        startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon fontSize="small" />}
                                        sx={{
                                          bgcolor: '#0ea5e9',
                                          color: '#ffffff',
                                          textTransform: 'none',
                                          fontWeight: 700,
                                          height: 40,
                                          px: 2.5,
                                          borderRadius: '8px',
                                          whiteSpace: 'nowrap',
                                          '&:hover': { bgcolor: '#0284c7' },
                                        }}
                                      >
                                        {isSaving ? 'Saving...' : 'Save App ID'}
                                      </Button>
                                    </Stack>
                                  </Box>
                                </Box>
                              </Card>
                            </Grid>
                          );
                        })}
                      </Grid>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Plan Modal */}
      <Dialog
        open={assignPlanModalOpen}
        onClose={handleCloseAssignPlan}
        maxWidth="sm"
        fullWidth
        PaperProps={{ style: { backgroundColor: '#0f172a', color: '#f8fafc' } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid rgba(148, 163, 184, 0.2)', color: '#38bdf8', fontWeight: 600 }}>
          Assign Plan to {sellerForPlan?.full_name}
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {loadingPlans ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 4 }}>
              <CircularProgress sx={{ color: '#22d3ee' }} />
            </Stack>
          ) : (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Select a membership plan for <strong>{sellerForPlan?.full_name}</strong> ({sellerForPlan?.email}). Only enabled features in the chosen plan will be visible in their Seller Panel sidebar.
              </Typography>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#e2e8f0', fontWeight: 600 }}>
                  Available Plans ({plansList.length})
                </Typography>
                
                <Stack spacing={1.5}>
                  {/* Option: No Plan / Default Access */}
                  <Paper
                    onClick={() => setSelectedPlanId('')}
                    variant="outlined"
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      backgroundColor: selectedPlanId === '' ? 'rgba(34, 211, 238, 0.12)' : '#0b1624',
                      borderColor: selectedPlanId === '' ? '#22d3ee' : 'rgba(148, 163, 184, 0.2)',
                      borderRadius: 2,
                      transition: 'all 0.2s ease',
                      '&:hover': { borderColor: '#22d3ee' },
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                          No Plan (Default Access)
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                          Standard default access to all features.
                        </Typography>
                      </Box>
                      {selectedPlanId === '' && <CheckCircleIcon sx={{ color: '#22d3ee' }} />}
                    </Stack>
                  </Paper>

                  {/* List of Created Plans */}
                  {plansList.map((plan) => {
                    const isSelected = selectedPlanId === plan.plan_id || selectedPlanId === String(plan.plan_id);
                    return (
                      <Paper
                        key={plan.plan_id}
                        onClick={() => setSelectedPlanId(plan.plan_id)}
                        variant="outlined"
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'rgba(34, 211, 238, 0.12)' : '#0b1624',
                          borderColor: isSelected ? '#22d3ee' : 'rgba(148, 163, 184, 0.2)',
                          borderRadius: 2,
                          transition: 'all 0.2s ease',
                          '&:hover': { borderColor: '#22d3ee' },
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box sx={{ flex: 1, pr: 2 }}>
                            <Typography variant="subtitle2" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                              {plan.name}
                            </Typography>
                            {plan.description && (
                              <Typography variant="caption" display="block" sx={{ color: '#94a3b8', mb: 1 }}>
                                {plan.description}
                              </Typography>
                            )}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                              {(plan.features || []).map((feat) => (
                                <Chip key={feat} label={feat} size="small" sx={{ backgroundColor: '#1e293b', color: '#cbd5e1', fontSize: '0.7rem' }} />
                              ))}
                            </Box>
                          </Box>
                          {isSelected && <CheckCircleIcon sx={{ color: '#22d3ee', mt: 0.5 }} />}
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
          <Button onClick={handleCloseAssignPlan} sx={{ color: '#94a3b8' }}>
            Cancel
          </Button>
          <Button
            onClick={handleAssignPlanSubmit}
            variant="contained"
            disabled={assigning}
            startIcon={assigning ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ backgroundColor: '#0284c7', '&:hover': { backgroundColor: '#0369a1' } }}
          >
            {assigning ? 'Assigning...' : 'Assign Plan'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SellerManagement;


