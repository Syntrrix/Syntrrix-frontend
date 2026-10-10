import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import Swal from 'sweetalert2';
import {
  createTeamMember,
  fetchTeamManagers,
  fetchTeamMembers,
  updateTeamMember,
} from '../../../api/teamManagement';

const initialForm = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  user_type: 'team_manager',
  city: '',
  team_name: '',
  team_description: '',
  parent_team_manager_id: '',
  password: '',
  confirm_password: '',
};

function UserManagement() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [teamManagers, setTeamManagers] = useState([]);

  const isEditMode = Boolean(editingMemberId);
  const isTeamManager = form.user_type === 'team_manager';

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [membersRes, managersRes] = await Promise.all([
        fetchTeamMembers(),
        fetchTeamManagers(),
      ]);
      setUsers(Array.isArray(membersRes?.data) ? membersRes.data : []);
      setTeamManagers(Array.isArray(managersRes?.data) ? managersRes.data : []);
    } catch (err) {
      setError(err.message || 'Failed to load user management data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'phone') {
      const clean = String(value).replace(/\D/g, '').slice(0, 10);
      setForm((prev) => ({ ...prev, [name]: clean }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const rows = useMemo(() => users, [users]);

  const resetAndClose = () => {
    setForm(initialForm);
    setEditingMemberId(null);
    setModalOpen(false);
  };

  const handleOpenCreate = () => {
    setError('');
    setEditingMemberId(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setError('');
    setEditingMemberId(item.team_member_id);
    setForm({
      first_name: item.first_name || '',
      last_name: item.last_name || '',
      phone: item.phone || '',
      email: item.email || '',
      user_type: item.member_type || 'team_manager',
      city: item.city || '',
      team_name: item.team_name || '',
      team_description: item.team_description || '',
      parent_team_manager_id: item.assigned_team_manager?.id ? String(item.assigned_team_manager.id) : '',
      password: '',
      confirm_password: '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.first_name || !form.phone || !form.email) {
      setError('Please fill all required fields.');
      return;
    }
    if (!isEditMode && !form.password) {
      setError('Please fill all required fields.');
      return;
    }
    if (isEditMode && form.password && form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password || form.confirm_password) {
      if (form.password !== form.confirm_password) {
        setError('Password and confirm password must match.');
        return;
      }
    }
    if (!isTeamManager && !form.parent_team_manager_id) {
      setError('Please select team for Agent.');
      return;
    }
    if (isTeamManager && (!form.team_name || !form.team_description)) {
      setError('Team name and team description are required for Team Manager.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        email: form.email,
        city: form.city,
        team_name: isTeamManager ? form.team_name : '',
        team_description: isTeamManager ? form.team_description : '',
        parent_team_manager_id: isTeamManager ? null : Number(form.parent_team_manager_id),
      };
      if (form.password) {
        payload.password = form.password;
      }

      if (isEditMode) {
        await updateTeamMember(editingMemberId, payload);
        await Swal.fire({
          icon: 'success',
          title: 'User updated successfully',
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await createTeamMember({
          ...payload,
          user_type: form.user_type,
          password: form.password,
        });
        await Swal.fire({
          icon: 'success',
          title: 'User created successfully',
          timer: 1500,
          showConfirmButton: false,
        });
      }
      resetAndClose();
      await loadData();
    } catch (err) {
      const detail = err?.response?.data?.errors;
      if (detail && typeof detail === 'object') {
        const firstMessage = Object.values(detail).flat().map(String).find(Boolean);
        setError(firstMessage || err.message || 'Failed to save user.');
      } else {
        setError(err.message || 'Failed to save user.');
      }
    } finally {
      setSaving(false);
    }
  };

  const colCellSx = { color: '#e5e7eb', borderColor: 'rgba(148, 163, 184, 0.18)' };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, backgroundColor: '#020617', minHeight: 'calc(100vh - 64px)' }}>
      <Card
        sx={{
          p: 2.5,
          borderRadius: 2,
          backgroundColor: '#0f172a',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          color: '#e5e7eb',
          boxShadow: '0 20px 45px rgba(15,23,42,0.85)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#e5e7eb' }}>User Management</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate} sx={{ bgcolor: '#0ea5e9' }}>
            Create New User
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TableContainer sx={{ border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#1e293b' }}>
                <TableCell sx={{ color: '#e5e7eb', borderColor: 'rgba(148, 163, 184, 0.25)' }}>User Name</TableCell>
                <TableCell sx={{ color: '#e5e7eb', borderColor: 'rgba(148, 163, 184, 0.25)' }}>Email ID</TableCell>
                <TableCell sx={{ color: '#e5e7eb', borderColor: 'rgba(148, 163, 184, 0.25)' }}>User Type</TableCell>
                <TableCell sx={{ color: '#e5e7eb', borderColor: 'rgba(148, 163, 184, 0.25)' }}>Assigned Team</TableCell>
                <TableCell sx={{ color: '#e5e7eb', borderColor: 'rgba(148, 163, 184, 0.25)' }}>City</TableCell>
                <TableCell sx={{ color: '#e5e7eb', borderColor: 'rgba(148, 163, 184, 0.25)' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ color: '#e5e7eb', borderColor: 'rgba(148, 163, 184, 0.25)' }}><CircularProgress size={28} sx={{ color: '#0ea5e9' }} /></TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ color: '#94a3b8', borderColor: 'rgba(148, 163, 184, 0.25)' }}>No users created yet.</TableCell>
                </TableRow>
              ) : (
                rows.map((item) => (
                  <TableRow key={item.team_member_id}>
                    <TableCell sx={colCellSx}>{item.full_name || '-'}</TableCell>
                    <TableCell sx={colCellSx}>{item.email || '-'}</TableCell>
                    <TableCell sx={colCellSx}>{item.member_type === 'team_manager' ? 'Team Manager' : 'Agent'}</TableCell>
                    <TableCell sx={colCellSx}>{item.team_name || item.assigned_team_manager?.name || '-'}</TableCell>
                    <TableCell sx={colCellSx}>{item.city || '-'}</TableCell>
                    <TableCell sx={colCellSx}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => handleOpenEdit(item)}
                        sx={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.45)', textTransform: 'none' }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={modalOpen} onClose={resetAndClose} maxWidth="md" fullWidth PaperProps={{ sx: { backgroundColor: '#0f172a', color: '#e5e7eb', border: '1px solid rgba(148, 163, 184, 0.25)' } }}>
        <DialogTitle>{isEditMode ? 'Edit User' : 'Create New User'}</DialogTitle>
        <DialogContent sx={{ '& .MuiInputLabel-root': { color: '#9ca3af' }, '& .MuiInputBase-input': { color: '#e5e7eb' }, '& .MuiSelect-select': { color: '#e5e7eb' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.35)' } }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}><TextField label="First Name *" name="first_name" value={form.first_name} onChange={handleChange} fullWidth /></Grid>
              <Grid item xs={12} md={6}><TextField label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} fullWidth /></Grid>
              <Grid item xs={12} md={6}><TextField label="Phone Number *" name="phone" value={form.phone} onChange={handleChange} fullWidth /></Grid>
              <Grid item xs={12} md={6}><TextField label="Email ID *" name="email" value={form.email} onChange={handleChange} fullWidth /></Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>User Type *</InputLabel>
                  <Select label="User Type *" name="user_type" value={form.user_type} onChange={handleChange} disabled={isEditMode}>
                    <MenuItem value="team_manager">Team Manager</MenuItem>
                    <MenuItem value="agent">Agent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}><TextField label="City" name="city" value={form.city} onChange={handleChange} fullWidth /></Grid>

              {isTeamManager ? (
                <>
                  <Grid item xs={12}><TextField label="Team Name *" name="team_name" value={form.team_name} onChange={handleChange} fullWidth /></Grid>
                  <Grid item xs={12}><TextField label="Team Description *" name="team_description" value={form.team_description} onChange={handleChange} fullWidth /></Grid>
                </>
              ) : (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Select Team *</InputLabel>
                    <Select
                      label="Select Team *"
                      name="parent_team_manager_id"
                      value={form.parent_team_manager_id}
                      onChange={handleChange}
                    >
                      {teamManagers.map((manager) => (
                        <MenuItem key={manager.id} value={manager.id}>
                          {manager.team_name || manager.manager_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12} md={6}><TextField type="password" label={isEditMode ? 'New Password' : 'Password *'} name="password" value={form.password} onChange={handleChange} fullWidth /></Grid>
              <Grid item xs={12} md={6}><TextField type="password" label={isEditMode ? 'Confirm New Password' : 'Confirm Password *'} name="confirm_password" value={form.confirm_password} onChange={handleChange} fullWidth /></Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetAndClose} sx={{ color: '#cbd5e1' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saving} sx={{ bgcolor: '#0ea5e9' }}>
            {saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Send Invite'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default UserManagement;
