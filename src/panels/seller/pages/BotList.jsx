import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useNavigate } from 'react-router-dom';
import { fetchBots } from '../../../api/bots';
import { useThemeContext } from '../../../context/ThemeContext';

function formatDateTime(value) {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function BotList() {
  const { isDark } = useThemeContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [bots, setBots] = useState([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newBotName, setNewBotName] = useState('');

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchBots();
      if (response?.success && Array.isArray(response?.data)) {
        setBots(response.data);
      } else {
        setBots([]);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load bots.');
      setBots([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredBots = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bots;
    return bots.filter((bot) => {
      const name = String(bot?.name || '').toLowerCase();
      const id = String(bot?.bot_id || '').toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [bots, search]);

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
      <Card
        sx={{
          backgroundColor: isDark ? '#020617' : '#ffffff',
          borderRadius: 2,
          border: isDark ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid #e2e8f0',
          boxShadow: isDark ? '0 20px 45px rgba(15,23,42,0.85)' : '0 10px 30px rgba(0,0,0,0.05)',
          p: { xs: 2, md: 3 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
            mb: 3,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="h5" fontWeight={700} sx={{ color: '#e5e7eb' }}>
            Manage Bots
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateModalOpen(true)}
            sx={{
              textTransform: 'none',
              backgroundColor: '#0ea5e9',
              '&:hover': { backgroundColor: '#0284c7' },
            }}
          >
            Create a New Bot
          </Button>
        </Box>

        <TextField
          fullWidth
          size="small"
          placeholder="Search by bot name or ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#0f2339',
              color: '#e5e7eb',
            },
          }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress sx={{ color: '#0ea5e9' }} />
          </Box>
        ) : filteredBots.length === 0 ? (
          <Paper
            sx={{
              p: 4,
              textAlign: 'center',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148,163,184,0.25)',
              color: '#9ca3af',
            }}
          >
            No bots found.
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {filteredBots.map((bot) => (
              <Grid item xs={12} md={6} lg={4} key={bot.bot_id}>
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(148,163,184,0.25)',
                    color: '#e5e7eb',
                    borderRadius: 2,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <SmartToyIcon sx={{ color: '#22d3ee' }} />
                      <Typography variant="subtitle1" fontWeight={700}>
                        {bot.name || 'Untitled Bot'}
                      </Typography>
                    </Box>

                    <Typography variant="body2" sx={{ color: '#9ca3af', mb: 0.5 }}>
                      ID: {bot.bot_id}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mb: 0.5 }}>
                      Created: {formatDateTime(bot.created_at)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1.5 }}>
                      Updated: {formatDateTime(bot.updated_at)}
                    </Typography>
                    <Chip
                      size="small"
                      label={bot.is_published ? 'Active' : 'Draft'}
                      sx={{
                        backgroundColor: bot.is_published ? 'rgba(16,185,129,0.2)' : 'rgba(148,163,184,0.2)',
                        color: bot.is_published ? '#34d399' : '#cbd5e1',
                        border: `1px solid ${bot.is_published ? 'rgba(16,185,129,0.35)' : 'rgba(148,163,184,0.35)'}`,
                      }}
                    />
                  </Box>

                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      onClick={() => navigate(`/seller/bots/${bot.bot_id}`)}
                      sx={{ textTransform: 'none', color: '#0ea5e9' }}
                    >
                      View Details
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Card>

      <Dialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            backgroundColor: '#0f172a',
            border: '1px solid rgba(148,163,184,0.25)',
            color: '#e5e7eb',
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Create New Bot</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#9ca3af', mb: 1, fontSize: 13 }}>Bot name</Typography>
          <TextField
            value={newBotName}
            onChange={(e) => setNewBotName(e.target.value)}
            placeholder="Enter bot name"
            fullWidth
            size="small"
            InputProps={{ sx: { backgroundColor: '#0b1624', color: '#e5e7eb' } }}
          />
          <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <Button
              variant="contained"
              onClick={() => {
                const name = newBotName.trim();
                setCreateModalOpen(false);
                navigate('/seller/create-boat', { state: { prefillBotName: name } });
              }}
              sx={{ textTransform: 'none', backgroundColor: '#0ea5e9', fontWeight: 700, py: 1 }}
            >
              Web Bot
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setCreateModalOpen(false);
                navigate('/seller/dashboard');
              }}
              sx={{
                textTransform: 'none',
                borderColor: 'rgba(148,163,184,0.35)',
                color: '#e5e7eb',
                fontWeight: 700,
                py: 1,
              }}
            >
              Whats App Bot
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setCreateModalOpen(false)}
            sx={{ textTransform: 'none', color: '#9ca3af' }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default BotList;

