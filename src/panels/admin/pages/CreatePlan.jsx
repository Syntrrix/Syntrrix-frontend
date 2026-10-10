import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import DeselectIcon from '@mui/icons-material/Deselect';
import CloseIcon from '@mui/icons-material/Close';
import Swal from 'sweetalert2';
import { createPlan, deletePlan, fetchPlans, updatePlan } from '../../../api/plans';

export const SELLER_FEATURES_LIST = [
  'Dashboard',
  'Manage Suppliers',
  'Manage Purchase',
  'Outstanding',
  'Product List',
  'Categories',
  'Add Customer',
  'Customer Purchase History',
  'Customer Outstanding',
  'Lead Pipeline',
  'Online Orders',
  'Live Chat Support',
  'Bot List',
  'Data Hub',
  'User Management',
  'WhatsApp Automation',
  'Reports',
];

function CreatePlan() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Create form state
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState([]);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFeatures, setEditFeatures] = useState([]);

  const loadPlansData = async () => {
    setLoading(true);
    try {
      const res = await fetchPlans();
      setPlans(res.data || []);
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to fetch plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlansData();
  }, []);

  const handleFeatureToggle = (feature) => {
    setSelectedFeatures((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]
    );
  };

  const handleSelectAll = () => {
    setSelectedFeatures([...SELLER_FEATURES_LIST]);
  };

  const handleDeselectAll = () => {
    setSelectedFeatures([]);
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!planName.trim()) {
      Swal.fire('Warning', 'Please enter a plan name', 'warning');
      return;
    }
    if (selectedFeatures.length === 0) {
      Swal.fire('Warning', 'Please select at least one feature for the plan', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createPlan({
        name: planName.trim(),
        description: planDescription.trim(),
        features: selectedFeatures,
      });

      if (res && res.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Plan Created',
          text: `Plan '${planName}' created successfully!`,
          timer: 2000,
          showConfirmButton: false,
        });
        setPlanName('');
        setPlanDescription('');
        setSelectedFeatures([]);
        loadPlansData();
      } else {
        throw new Error(res?.message || 'Failed to create plan');
      }
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to create plan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Plan Handlers
  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setEditName(plan.name);
    setEditDescription(plan.description || '');
    setEditFeatures(plan.features || []);
    setEditModalOpen(true);
  };

  const handleCloseEdit = () => {
    setEditModalOpen(false);
    setEditingPlan(null);
  };

  const handleEditFeatureToggle = (feature) => {
    setEditFeatures((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]
    );
  };

  const handleEditSelectAll = () => {
    setEditFeatures([...SELLER_FEATURES_LIST]);
  };

  const handleEditDeselectAll = () => {
    setEditFeatures([]);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      Swal.fire('Warning', 'Plan name cannot be empty', 'warning');
      return;
    }
    if (editFeatures.length === 0) {
      Swal.fire('Warning', 'Select at least one feature', 'warning');
      return;
    }

    try {
      const res = await updatePlan(editingPlan.plan_id, {
        name: editName.trim(),
        description: editDescription.trim(),
        features: editFeatures,
      });

      if (res && res.success) {
        Swal.fire('Success', 'Plan updated successfully', 'success');
        handleCloseEdit();
        loadPlansData();
      } else {
        throw new Error(res?.message || 'Failed to update plan');
      }
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to update plan', 'error');
    }
  };

  const handleDeletePlan = async (plan) => {
    const result = await Swal.fire({
      title: 'Delete Plan?',
      text: `Are you sure you want to delete '${plan.name}'? Sellers assigned to this plan will revert to default access.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete',
    });

    if (result.isConfirmed) {
      try {
        const res = await deletePlan(plan.plan_id);
        if (res && res.success) {
          Swal.fire('Deleted!', 'Plan has been deleted.', 'success');
          loadPlansData();
        } else {
          throw new Error(res?.message || 'Failed to delete plan');
        }
      } catch (err) {
        Swal.fire('Error', err.message || 'Failed to delete plan', 'error');
      }
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', color: '#e5e7eb' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ color: '#f8fafc', mb: 0.5 }}>
            Create & Manage Plans
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Define custom seller membership plans and enable features.
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={4}>
        {/* Create Plan Form Card */}
        <Grid item xs={12} lg={5}>
          <Card
            component="form"
            onSubmit={handleCreatePlan}
            sx={{
              borderRadius: 3,
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              boxShadow: '0 20px 45px rgba(15,23,42,0.85)',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 1 }}>
                <AddCircleOutlineIcon /> Add New Subscription Plan
              </Typography>
              <Divider sx={{ mb: 3, borderColor: 'rgba(148, 163, 184, 0.15)' }} />

              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#e2e8f0', fontWeight: 600 }}>
                    Plan Name *
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="e.g. Standard Plan, Premium Seller Plan"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    required
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: '#f8fafc',
                        backgroundColor: '#0b1624',
                        '& fieldset': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                        '&:hover fieldset': { borderColor: '#38bdf8' },
                        '&.Mui-focused fieldset': { borderColor: '#38bdf8' },
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#e2e8f0', fontWeight: 600 }}>
                    Description (Optional)
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Short summary of this plan..."
                    value={planDescription}
                    onChange={(e) => setPlanDescription(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: '#f8fafc',
                        backgroundColor: '#0b1624',
                        '& fieldset': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                        '&:hover fieldset': { borderColor: '#38bdf8' },
                        '&.Mui-focused fieldset': { borderColor: '#38bdf8' },
                      },
                    }}
                  />
                </Box>

                {/* Features Checklist */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                      Seller Features Access ({selectedFeatures.length} / {SELLER_FEATURES_LIST.length})
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        startIcon={<SelectAllIcon fontSize="small" />}
                        onClick={handleSelectAll}
                        sx={{ color: '#38bdf8', textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        Select All
                      </Button>
                      <Button
                        size="small"
                        startIcon={<DeselectIcon fontSize="small" />}
                        onClick={handleDeselectAll}
                        sx={{ color: '#94a3b8', textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        Clear
                      </Button>
                    </Stack>
                  </Stack>

                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      maxHeight: 320,
                      overflowY: 'auto',
                      backgroundColor: '#0b1624',
                      borderColor: 'rgba(148, 163, 184, 0.2)',
                      borderRadius: 2,
                    }}
                  >
                    <Grid container spacing={1}>
                      {SELLER_FEATURES_LIST.map((feat) => {
                        const isChecked = selectedFeatures.includes(feat);
                        return (
                          <Grid item xs={12} sm={6} key={feat}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={isChecked}
                                  onChange={() => handleFeatureToggle(feat)}
                                  size="small"
                                  sx={{
                                    color: '#64748b',
                                    '&.Mui-checked': { color: '#22d3ee' },
                                  }}
                                />
                              }
                              label={
                                <Typography variant="body2" sx={{ color: isChecked ? '#f8fafc' : '#94a3b8', fontSize: '0.825rem' }}>
                                  {feat}
                                </Typography>
                              }
                              sx={{ width: '100%', margin: 0 }}
                            />
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Paper>
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
                  sx={{
                    py: 1.2,
                    backgroundColor: '#0284c7',
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    borderRadius: 2,
                    '&:hover': { backgroundColor: '#0369a1' },
                  }}
                >
                  {submitting ? 'Saving Plan...' : 'Save & Create Plan'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Plans List Table */}
        <Grid item xs={12} lg={7}>
          <Card
            sx={{
              borderRadius: 3,
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              boxShadow: '0 20px 45px rgba(15,23,42,0.85)',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: '#f8fafc' }}>
                Existing Plans ({plans.length})
              </Typography>
              <Divider sx={{ mb: 3, borderColor: 'rgba(148, 163, 184, 0.15)' }} />

              {loading ? (
                <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 250 }}>
                  <CircularProgress sx={{ color: '#22d3ee' }} />
                </Stack>
              ) : plans.length === 0 ? (
                <Typography sx={{ color: '#94a3b8', textAlign: 'center', py: 6 }}>
                  No plans created yet. Use the form on the left to create your first plan.
                </Typography>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="medium">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, color: '#cbd5e1', fontSize: '0.875rem' }}>Plan Name</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#cbd5e1', fontSize: '0.875rem' }}>Features Count</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#cbd5e1', fontSize: '0.875rem' }}>Included Features</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: '#cbd5e1', fontSize: '0.875rem' }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {plans.map((p) => (
                        <TableRow
                          key={p.plan_id}
                          sx={{
                            '&:hover': { backgroundColor: 'rgba(34, 211, 238, 0.04)' },
                          }}
                        >
                          <TableCell sx={{ color: '#f8fafc', fontWeight: 600 }}>
                            {p.name}
                            {p.description && (
                              <Typography variant="caption" display="block" sx={{ color: '#94a3b8' }}>
                                {p.description}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ color: '#cbd5e1' }}>
                            <Chip
                              label={`${(p.features || []).length} Features`}
                              size="small"
                              sx={{ backgroundColor: 'rgba(34, 211, 238, 0.15)', color: '#22d3ee', fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: '#cbd5e1', maxWidth: 280 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {(p.features || []).slice(0, 4).map((f) => (
                                <Chip key={f} label={f} size="small" sx={{ backgroundColor: '#1e293b', color: '#cbd5e1', fontSize: '0.7rem' }} />
                              ))}
                              {(p.features || []).length > 4 && (
                                <Chip
                                  label={`+${(p.features || []).length - 4} more`}
                                  size="small"
                                  sx={{ backgroundColor: '#334155', color: '#94a3b8', fontSize: '0.7rem' }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="Edit Plan">
                                <IconButton onClick={() => handleOpenEdit(p)} size="small" sx={{ color: '#38bdf8' }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Plan">
                                <IconButton onClick={() => handleDeletePlan(p)} size="small" sx={{ color: '#ef4444' }}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Plan Dialog */}
      <Dialog
        open={editModalOpen}
        onClose={handleCloseEdit}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            borderRadius: 3,
            border: '1px solid rgba(148, 163, 184, 0.25)',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.95)',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
            color: '#38bdf8',
            fontWeight: 700,
            fontSize: '1.2rem',
            py: 2,
            px: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon sx={{ color: '#38bdf8' }} />
            Edit Subscription Plan - {editingPlan?.name}
          </Box>
          <IconButton
            aria-label="close"
            onClick={handleCloseEdit}
            sx={{
              color: '#94a3b8',
              '&:hover': { color: '#f8fafc', backgroundColor: 'rgba(148, 163, 184, 0.1)' },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#e2e8f0', fontWeight: 600 }}>
                Plan Name *
              </Typography>
              <TextField
                fullWidth
                placeholder="e.g. Standard Plan"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#f8fafc',
                    backgroundColor: '#0b1624',
                    '& fieldset': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                    '&:hover fieldset': { borderColor: '#38bdf8' },
                    '&.Mui-focused fieldset': { borderColor: '#38bdf8' },
                  },
                }}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#e2e8f0', fontWeight: 600 }}>
                Description
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Short summary of this plan..."
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#f8fafc',
                    backgroundColor: '#0b1624',
                    '& fieldset': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                    '&:hover fieldset': { borderColor: '#38bdf8' },
                    '&.Mui-focused fieldset': { borderColor: '#38bdf8' },
                  },
                }}
              />
            </Box>

            {/* Features Checklist */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                  Seller Features Access ({editFeatures.length} / {SELLER_FEATURES_LIST.length})
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    startIcon={<SelectAllIcon fontSize="small" />}
                    onClick={handleEditSelectAll}
                    sx={{ color: '#38bdf8', textTransform: 'none', fontSize: '0.75rem' }}
                  >
                    Select All
                  </Button>
                  <Button
                    size="small"
                    startIcon={<DeselectIcon fontSize="small" />}
                    onClick={handleEditDeselectAll}
                    sx={{ color: '#94a3b8', textTransform: 'none', fontSize: '0.75rem' }}
                  >
                    Clear
                  </Button>
                </Stack>
              </Stack>

              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  maxHeight: 280,
                  overflowY: 'auto',
                  backgroundColor: '#0b1624',
                  borderColor: 'rgba(148, 163, 184, 0.2)',
                  borderRadius: 2,
                }}
              >
                <Grid container spacing={1}>
                  {SELLER_FEATURES_LIST.map((feat) => {
                    const isChecked = editFeatures.includes(feat);
                    return (
                      <Grid item xs={12} sm={6} key={feat}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={isChecked}
                              onChange={() => handleEditFeatureToggle(feat)}
                              size="small"
                              sx={{
                                color: '#64748b',
                                '&.Mui-checked': { color: '#22d3ee' },
                              }}
                            />
                          }
                          label={
                            <Typography variant="body2" sx={{ color: isChecked ? '#f8fafc' : '#94a3b8', fontSize: '0.825rem' }}>
                              {feat}
                            </Typography>
                          }
                          sx={{ width: '100%', margin: 0 }}
                        />
                      </Grid>
                    );
                  })}
                </Grid>
              </Paper>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid rgba(148, 163, 184, 0.15)', gap: 1 }}>
          <Button
            onClick={handleCloseEdit}
            variant="outlined"
            sx={{
              color: '#94a3b8',
              borderColor: 'rgba(148, 163, 184, 0.3)',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { borderColor: '#94a3b8', backgroundColor: 'rgba(148, 163, 184, 0.1)' },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            startIcon={<CheckCircleIcon />}
            sx={{
              backgroundColor: '#0284c7',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              '&:hover': { backgroundColor: '#0369a1' },
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CreatePlan;
