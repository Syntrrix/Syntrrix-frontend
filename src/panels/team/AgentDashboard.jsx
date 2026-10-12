import { useEffect, useState } from 'react';
import { Alert, Box, Card, CardContent, CircularProgress, Grid, Typography } from '@mui/material';
import { fetchSellerLiveChatSupportSessions } from '../../api/liveChat';
import { useThemeContext } from '../../context/ThemeContext';

function normalizePhone(value) {
  return String(value || '').replace(/\D+/g, '');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function sessionSortTs(session) {
  const raw = session?.updated_at || session?.last_message_created_at || session?.created_at || '';
  const ts = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(ts) ? ts : 0;
}

function dedupeSessionsByPhoneEmail(list) {
  const byKey = new Map();
  (Array.isArray(list) ? list : []).forEach((session) => {
    const phone = normalizePhone(session?.mobile_number);
    const email = normalizeEmail(session?.email);
    const key =
      session?.is_manual_pipeline_lead === true
        ? `manual::${String(session?.session_id || '')}`
        : phone || email
          ? `${phone}::${email}`
          : `sid::${String(session?.session_id || '')}`;
    const existing = byKey.get(key);
    if (!existing || sessionSortTs(session) > sessionSortTs(existing)) {
      byKey.set(key, session);
    }
  });
  return Array.from(byKey.values()).sort((a, b) => sessionSortTs(b) - sessionSortTs(a));
}

function AgentDashboard() {
  const { isDark } = useThemeContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalLeads, setTotalLeads] = useState(0);
  const [leadCount, setLeadCount] = useState(0);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetchSellerLiveChatSupportSessions({ forLeadPipeline: true });
        const rawRows = Array.isArray(response?.data) ? response.data : [];
        const rows = dedupeSessionsByPhoneEmail(rawRows);
        setTotalLeads(rows.length);
        // Lead Count = currently open leads (last sender is customer).
        setLeadCount(rows.filter((row) => row?.last_message_sender_type !== 'seller').length);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 3 },
        backgroundColor: isDark ? '#020617' : '#f1f5f9',
        minHeight: 'calc(100vh - 64px)',
        color: isDark ? '#e5e7eb' : '#0f172a',
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
    >
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2, color: isDark ? '#e5e7eb' : '#0f172a' }}>
        Agent Dashboard
      </Typography>
      {loading ? <CircularProgress size={22} sx={{ color: '#0ea5e9' }} /> : null}
      {error ? <Alert severity="error" sx={{ mt: 2, maxWidth: 560 }}>{error}</Alert> : null}
      {!loading && !error ? (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                backgroundColor: '#0f172a',
                borderRadius: 2,
                border: '1px solid rgba(148, 163, 184, 0.25)',
                minHeight: 220,
                display: 'flex',
              }}
            >
              <CardContent sx={{ p: 3.5, width: '100%' }}>
                <Typography sx={{ color: '#9ca3af', fontSize: 15, fontWeight: 600, mb: 1 }}>
                  Lead Count
                </Typography>
                <Typography sx={{ color: '#e5e7eb', fontSize: { xs: 38, md: 46 }, fontWeight: 800 }}>
                  {leadCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                backgroundColor: '#0f172a',
                borderRadius: 2,
                border: '1px solid rgba(148, 163, 184, 0.25)',
                minHeight: 220,
                display: 'flex',
              }}
            >
              <CardContent sx={{ p: 3.5, width: '100%' }}>
                <Typography sx={{ color: '#9ca3af', fontSize: 15, fontWeight: 600, mb: 1 }}>
                  Total Leads
                </Typography>
                <Typography sx={{ color: '#e5e7eb', fontSize: { xs: 38, md: 46 }, fontWeight: 800 }}>
                  {totalLeads}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : null}
    </Box>
  );
}

export default AgentDashboard;
