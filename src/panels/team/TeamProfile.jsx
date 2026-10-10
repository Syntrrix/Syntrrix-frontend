import { useEffect, useMemo, useState } from 'react';
import { Alert, Avatar, Box, Card, CardContent, Chip, CircularProgress, Divider, Grid, Typography } from '@mui/material';
import { fetchTeamMemberContext } from '../../api/teamManagement';

function DetailItem({ label, value, fullWidth = false }) {
  return (
    <Box sx={{ gridColumn: fullWidth ? { xs: '1 / -1', md: '1 / -1' } : 'auto' }}>
      <Typography sx={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ color: '#e5e7eb', fontSize: 15, fontWeight: 600, mt: 0.5 }}>
        {value || '-'}
      </Typography>
    </Box>
  );
}

function TeamProfile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contextData, setContextData] = useState(null);

  const member = contextData?.team_member || {};
  const seller = contextData?.seller || {};
  const assignedManager = contextData?.assigned_team_manager || {};

  const initials = useMemo(() => {
    const raw = String(member?.name || '').trim();
    if (!raw) return 'TM';
    const parts = raw.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || 'T';
    const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : (parts[0]?.[1] || 'M');
    return `${first}${second}`.toUpperCase();
  }, [member?.name]);

  const roleLabel = member?.member_type === 'team_manager' ? 'Team Manager' : 'Agent';
  const statusLabel = member?.status || 'active';

  useEffect(() => {
    const loadContext = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetchTeamMemberContext();
        setContextData(response?.data || null);
      } catch (err) {
        setError(err.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    void loadContext();
  }, []);

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, backgroundColor: '#020617', minHeight: 'calc(100vh - 64px)' }}>
      <Card
        sx={{
          backgroundColor: '#0f172a',
          borderRadius: 2,
          border: '1px solid rgba(148, 163, 184, 0.25)',
          boxShadow: '0 20px 45px rgba(15,23,42,0.85)',
          p: { xs: 2, md: 3 },
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Typography variant="h5" fontWeight={800} sx={{ color: '#e5e7eb', mb: 2 }}>
            My Profile
          </Typography>
          <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.25)', mb: 3 }} />

          {loading ? <CircularProgress size={24} sx={{ color: '#22d3ee' }} /> : null}
          {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}

          {!loading && !error && contextData ? (
            <>
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
                      width: 96,
                      height: 96,
                      bgcolor: '#22d3ee',
                      color: '#020617',
                      fontSize: '2.2rem',
                      fontWeight: 800,
                    }}
                  >
                    {initials}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 220 }}>
                    <Typography variant="h4" fontWeight={700} sx={{ color: '#e5e7eb', mb: 1 }}>
                      {member?.name || '-'}
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#9ca3af' }}>
                      {member?.email || '-'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mt: 2 }}>
                      <Chip
                        label={statusLabel}
                        sx={{
                          backgroundColor: 'rgba(34,211,238,0.18)',
                          color: '#e5e7eb',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                        }}
                      />
                      <Chip
                        label={roleLabel}
                        sx={{
                          backgroundColor: 'rgba(148,163,184,0.2)',
                          color: '#e5e7eb',
                          fontWeight: 700,
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              </Card>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ backgroundColor: '#1e293b', borderRadius: 2, border: '1px solid rgba(148, 163, 184, 0.25)', p: 3, height: '100%' }}>
                    <Typography variant="h6" fontWeight={700} sx={{ color: '#e5e7eb', mb: 2 }}>Personal Information</Typography>
                    <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.25)', mb: 2 }} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                      <DetailItem label="Name" value={member?.name} />
                      <DetailItem label="Email" value={member?.email} />
                      <DetailItem label="Phone" value={member?.phone} />
                      <DetailItem label="City" value={member?.city} />
                      <DetailItem label="Role" value={roleLabel} />
                      <DetailItem label="Status" value={statusLabel} />
                    </Box>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ backgroundColor: '#1e293b', borderRadius: 2, border: '1px solid rgba(148, 163, 184, 0.25)', p: 3, height: '100%' }}>
                    <Typography variant="h6" fontWeight={700} sx={{ color: '#e5e7eb', mb: 2 }}>Team Information</Typography>
                    <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.25)', mb: 2 }} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                      <DetailItem label="Team Name" value={member?.team_name} />
                      <DetailItem label="Assigned Team Manager" value={assignedManager?.name} />
                      <DetailItem label="Team Description" value={member?.team_description} fullWidth />
                    </Box>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ backgroundColor: '#1e293b', borderRadius: 2, border: '1px solid rgba(148, 163, 184, 0.25)', p: 3, height: '100%' }}>
                    <Typography variant="h6" fontWeight={700} sx={{ color: '#e5e7eb', mb: 2 }}>Seller Information</Typography>
                    <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.25)', mb: 2 }} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                      <DetailItem label="Seller Name" value={seller?.company_name || seller?.name} />
                      <DetailItem label="Seller Email" value={seller?.email} />
                    </Box>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ backgroundColor: '#1e293b', borderRadius: 2, border: '1px solid rgba(148, 163, 184, 0.25)', p: 3, height: '100%' }}>
                    <Typography variant="h6" fontWeight={700} sx={{ color: '#e5e7eb', mb: 2 }}>Account Information</Typography>
                    <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.25)', mb: 2 }} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                      <DetailItem label="User ID" value={member?.user_id} />
                      <DetailItem label="Team Member ID" value={member?.team_member_id} />
                    </Box>
                  </Card>
                </Grid>
              </Grid>
            </>
          ) : null}
        </CardContent>
      </Card>
    </Box>
  );
}

export default TeamProfile;
