import { useEffect, useMemo, useState } from 'react';
import { useThemeContext } from '../../../context/ThemeContext';
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
  IconButton,
  InputAdornment,
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
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
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
  const { isDark } = useThemeContext();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [teamManagers, setTeamManagers] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError('');
    setModalOpen(false);
  };

  const handleOpenCreate = () => {
    setError('');
    setEditingMemberId(null);
    setForm(initialForm);
    setShowPassword(false);
    setShowConfirmPassword(false);
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
    setShowPassword(false);
    setShowConfirmPassword(false);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    // 1. Required basic fields validation
    if (!form.first_name.trim()) {
      setError('First Name is required.');
      return;
    }
    if (!form.phone.trim()) {
      setError('Phone Number is required.');
      return;
    }
    if (form.phone.trim().length < 10) {
      setError('Phone Number must be a valid 10-digit number.');
      return;
    }
    if (!form.email.trim()) {
      setError('Email ID is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Please enter a valid Email ID address.');
      return;
    }

    // 2. Role specific validations
    if (isTeamManager) {
      if (!form.team_name.trim()) {
        setError('Team Name is required for Team Manager.');
        return;
      }
      if (!form.team_description.trim()) {
        setError('Team Description is required for Team Manager.');
        return;
      }
    } else {
      if (!form.parent_team_manager_id) {
        setError('Select Team is required for Agent.');
        return;
      }
    }

    // 3. Password validations
    if (!isEditMode && !form.password) {
      setError('Password is required.');
      return;
    }
    if (form.password) {
      if (form.password.length < 6) {
        setError('Password must be at least 6 digits/characters long.');
        return;
      }
      if (!form.confirm_password) {
        setError('Confirm Password is required.');
        return;
      }
      if (form.password !== form.confirm_password) {
        setError('Password and Confirm Password do not match.');
        return;
      }
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        city: form.city.trim(),
        team_name: isTeamManager ? form.team_name.trim() : '',
        team_description: isTeamManager ? form.team_description.trim() : '',
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

  const colCellSx = { color: isDark ? '#e5e7eb' : '#0f172a', borderColor: isDark ? 'rgba(148, 163, 184, 0.18)' : '#e2e8f0' };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, backgroundColor: isDark ? '#020617' : '#f1f5f9', minHeight: 'calc(100vh - 64px)', color: isDark ? '#f8fafc' : '#0f172a', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
      <Card
        sx={{
          p: 2.5,
          borderRadius: 2,
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          border: isDark ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid #e2e8f0',
          color: isDark ? '#e5e7eb' : '#0f172a',
          boxShadow: isDark ? '0 20px 45px rgba(15,23,42,0.85)' : '0 10px 30px rgba(0,0,0,0.05)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" fontWeight={700} sx={{ color: isDark ? '#e5e7eb' : '#0f172a' }}>User Management</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate} sx={{ bgcolor: '#0ea5e9', '&:hover': { bgcolor: '#0284c7' } }}>
            Create New User
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TableContainer sx={{ border: isDark ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid #e2e8f0', borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: isDark ? '#1e293b' : '#f8fafc' }}>
                <TableCell sx={{ color: isDark ? '#e5e7eb' : '#0f172a', fontWeight: 700, borderColor: isDark ? 'rgba(148, 163, 184, 0.25)' : '#e2e8f0' }}>User Name</TableCell>
                <TableCell sx={{ color: isDark ? '#e5e7eb' : '#0f172a', fontWeight: 700, borderColor: isDark ? 'rgba(148, 163, 184, 0.25)' : '#e2e8f0' }}>Email ID</TableCell>
                <TableCell sx={{ color: isDark ? '#e5e7eb' : '#0f172a', fontWeight: 700, borderColor: isDark ? 'rgba(148, 163, 184, 0.25)' : '#e2e8f0' }}>User Type</TableCell>
                <TableCell sx={{ color: isDark ? '#e5e7eb' : '#0f172a', fontWeight: 700, borderColor: isDark ? 'rgba(148, 163, 184, 0.25)' : '#e2e8f0' }}>Assigned Team</TableCell>
                <TableCell sx={{ color: isDark ? '#e5e7eb' : '#0f172a', fontWeight: 700, borderColor: isDark ? 'rgba(148, 163, 184, 0.25)' : '#e2e8f0' }}>City</TableCell>
                <TableCell sx={{ color: isDark ? '#e5e7eb' : '#0f172a', fontWeight: 700, borderColor: isDark ? 'rgba(148, 163, 184, 0.25)' : '#e2e8f0' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ color: isDark ? '#e5e7eb' : '#0f172a', borderColor: isDark ? 'rgba(148, 163, 184, 0.25)' : '#e2e8f0' }}>
                    <CircularProgress size={28} sx={{ color: '#0ea5e9' }} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ color: '#94a3b8', borderColor: isDark ? 'rgba(148, 163, 184, 0.25)' : '#e2e8f0' }}>No users created yet.</TableCell>
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

      <Dialog
        open={modalOpen}
        onClose={resetAndClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            color: isDark ? '#e5e7eb' : '#0f172a',
            border: isDark ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid #e2e8f0',
            borderRadius: 3,
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.25rem', borderBottom: isDark ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid #e2e8f0', pb: 1.5 }}>
          {isEditMode ? 'Edit User' : 'Create New User'}
        </DialogTitle>

        <DialogContent
          sx={{
            pt: 2.5,
            '& .MuiInputLabel-root': { color: isDark ? '#9ca3af' : '#475569', fontWeight: 600 },
            '& .MuiInputBase-input': { color: isDark ? '#e5e7eb' : '#0f172a' },
            '& .MuiSelect-select': { color: isDark ? '#e5e7eb' : '#0f172a' },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#00a6ff !important',
              borderWidth: '1.5px !important',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#38bdf8 !important',
              borderWidth: '2px !important',
            },
            '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#00a6ff !important',
              borderWidth: '2px !important',
              boxShadow: '0 0 8px rgba(0, 166, 255, 0.35)',
            },
            '& .MuiSvgIcon-root': { color: isDark ? '#38bdf8' : '#00a6ff' },
          }}
        >
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ borderRadius: 2, fontWeight: 600, fontSize: '0.9rem' }}>
                {error}
              </Alert>
            )}

            <Grid container spacing={2}>
              {/* Row 1 */}
              <Grid item xs={12} sm={6}>
                <TextField label="First Name *" name="first_name" value={form.first_name} onChange={handleChange} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} fullWidth />
              </Grid>

              {/* Row 2 */}
              <Grid item xs={12} sm={6}>
                <TextField label="Phone Number *" name="phone" value={form.phone} onChange={handleChange} fullWidth placeholder="10-digit number" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Email ID *" name="email" value={form.email} onChange={handleChange} fullWidth />
              </Grid>

              {/* Row 3 */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="user-type-label">User Type *</InputLabel>
                  <Select
                    labelId="user-type-label"
                    label="User Type *"
                    name="user_type"
                    value={form.user_type}
                    onChange={handleChange}
                    disabled={isEditMode}
                    fullWidth
                  >
                    <MenuItem value="team_manager">Team Manager</MenuItem>
                    <MenuItem value="agent">Agent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="City" name="city" value={form.city} onChange={handleChange} fullWidth />
              </Grid>

              {/* Row 4 (Conditional based on User Type) */}
              {isTeamManager ? (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Team Name *" name="team_name" value={form.team_name} onChange={handleChange} fullWidth />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Team Description *" name="team_description" value={form.team_description} onChange={handleChange} fullWidth />
                  </Grid>
                </>
              ) : (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="select-team-label">Select Team *</InputLabel>
                    <Select
                      labelId="select-team-label"
                      label="Select Team *"
                      name="parent_team_manager_id"
                      value={form.parent_team_manager_id}
                      onChange={handleChange}
                      fullWidth
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

              {/* Row 5: Password Fields */}
              <Grid item xs={12} sm={6}>
                <TextField
                  type={showPassword ? 'text' : 'password'}
                  label={isEditMode ? 'New Password' : 'Password *'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword((v) => !v)}
                          edge="end"
                          sx={{ color: '#00a6ff' }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  type={showConfirmPassword ? 'text' : 'password'}
                  label={isEditMode ? 'Confirm New Password' : 'Confirm Password *'}
                  name="confirm_password"
                  value={form.confirm_password}
                  onChange={handleChange}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle confirm password visibility"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          edge="end"
                          sx={{ color: '#00a6ff' }}
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, borderTop: isDark ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid #e2e8f0' }}>
          <Button onClick={resetAndClose} sx={{ color: isDark ? '#cbd5e1' : '#64748b', textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving}
            sx={{ bgcolor: '#0ea5e9', '&:hover': { bgcolor: '#0284c7' }, textTransform: 'none', fontWeight: 700, px: 3, borderRadius: 2 }}
          >
            {saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Send Invite'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default UserManagement;
