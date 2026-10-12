import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import Swal from 'sweetalert2';
import { useNavigate, useParams } from 'react-router-dom';
import { useThemeContext } from '../../../context/ThemeContext';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { fetchBots, publishBot, unpublishBot } from '../../../api/bots';
import { getApiOrigin } from '../../../api/client';


/** Full-width flow canvas height — taller for readability on Bot Details */
const BOT_FLOW_CANVAS_HEIGHT = { xs: '58vh', sm: '62vh', md: '68vh' };
const BOT_FLOW_CANVAS_MAX = 880;

function formatDateTime(value) {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function BotFlowViewer({ flow }) {
  const nodesInit = Array.isArray(flow?.nodes) ? flow.nodes : [];
  const edgesInit = Array.isArray(flow?.edges) ? flow.edges : [];
  const [nodes, setNodes] = useState(nodesInit);
  const [edges, setEdges] = useState(edgesInit);
  const { fitView, setViewport } = useReactFlow();

  useEffect(() => {
    setNodes(Array.isArray(flow?.nodes) ? flow.nodes : []);
    setEdges(Array.isArray(flow?.edges) ? flow.edges : []);
  }, [flow]);

  useEffect(() => {
    const vp = flow?.viewport;
    const hasVp =
      vp &&
      typeof vp.x === 'number' &&
      typeof vp.y === 'number' &&
      typeof vp.zoom === 'number';
    if (!nodes.length) return;
    const t = requestAnimationFrame(() => {
      if (hasVp) {
        setViewport({ x: vp.x, y: vp.y, zoom: vp.zoom }, { duration: 0 });
      } else {
        fitView({ padding: 0.2 });
      }
    });
    return () => cancelAnimationFrame(t);
  }, [flow, nodes.length, fitView, setViewport]);

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);
  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  if (!nodes.length) {
    return (
      <Box
        sx={{
          height: BOT_FLOW_CANVAS_HEIGHT,
          maxHeight: BOT_FLOW_CANVAS_MAX,
          width: '100%',
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          borderRadius: 1,
        }}
      >
        <Typography sx={{ color: '#64748b' }}>No flow nodes saved for this bot.</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: BOT_FLOW_CANVAS_HEIGHT,
        maxHeight: BOT_FLOW_CANVAS_MAX,
        width: '100%',
        minWidth: 0,
        backgroundColor: '#ffffff',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        deleteKeyCode={null}
        multiSelectionKeyCode={null}
        panOnScroll
        fitView={false}
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </Box>
  );
}

function BotFlowPanel({ flow }) {
  return (
    <ReactFlowProvider>
      <BotFlowViewer flow={flow} />
    </ReactFlowProvider>
  );
}

function BotDetails() {
  const { isDark } = useThemeContext();
  const navigate = useNavigate();
  const { botId } = useParams();

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [bot, setBot] = useState(null);

  const embedScript = useMemo(() => {
    if (!bot?.bot_id) return '';
    const base = getApiOrigin();
    return `<script>
(function (w, d) {
  var s = d.createElement('script');
  s.async = true;
  s.src = '${base}/api/bots/widget.js?bot_id=${bot.bot_id}';
  d.head.appendChild(s);
})(window, document);
</script>`;
  }, [bot?.bot_id]);

  useEffect(() => {
    loadBot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botId]);

  const loadBot = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchBots(botId);
      const bots = response?.success && Array.isArray(response?.data) ? response.data : [];
      const found = bots.find((b) => String(b.bot_id) === String(botId));
      if (!found) {
        setBot(null);
        setError('Bot not found.');
      } else {
        setBot(found);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load bot details.');
      setBot(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!bot?.bot_id) return;
    setActionLoading(true);
    try {
      const response = await publishBot(bot.bot_id);
      if (!response?.success) throw new Error(response?.message || 'Failed to publish bot.');
      await Swal.fire({
        icon: 'success',
        title: 'Published',
        text: response.message || 'Bot published successfully.',
        confirmButtonColor: '#0ea5e9',
      });
      await loadBot();
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.message || 'Failed to publish bot.',
        confirmButtonColor: '#d32f2f',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnpublish = async () => {
    if (!bot?.bot_id) return;
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Are you sure you want to unpublish this bot?',
      showCancelButton: true,
      confirmButtonText: 'OK',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#6b7280',
    });
    if (!result.isConfirmed) return;

    setActionLoading(true);
    try {
      const response = await unpublishBot(bot.bot_id);
      if (!response?.success) throw new Error(response?.message || 'Failed to unpublish bot.');
      await Swal.fire({
        icon: 'success',
        title: 'Unpublished',
        text: response.message || 'Bot unpublished successfully.',
        confirmButtonColor: '#0ea5e9',
      });
      await loadBot();
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.message || 'Failed to unpublish bot.',
        confirmButtonColor: '#d32f2f',
      });
    } finally {
      setActionLoading(false);
    }
  };

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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton
              onClick={() => navigate('/seller/bots')}
              sx={{
                color: '#9ca3af',
                border: '1px solid rgba(148, 163, 184, 0.25)',
                '&:hover': { backgroundColor: 'rgba(148, 163, 184, 0.1)', color: '#e5e7eb' },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" fontWeight={700}>
              Bot Details
            </Typography>
          </Box>

          {bot?.is_published ? (
            <Button
              variant="outlined"
              onClick={handleUnpublish}
              disabled={actionLoading}
              sx={{
                textTransform: 'none',
                color: '#f87171',
                borderColor: '#f87171',
                '&:hover': { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' },
              }}
            >
              Unpublish
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handlePublish}
              disabled={actionLoading}
              sx={{ textTransform: 'none', backgroundColor: '#0ea5e9', '&:hover': { backgroundColor: '#0284c7' } }}
            >
              Publish
            </Button>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress sx={{ color: '#0ea5e9' }} />
          </Box>
        ) : !bot ? null : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Top: two boxes */}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2, backgroundColor: '#0f172a', border: '1px solid rgba(148,163,184,0.25)', color: '#e5e7eb' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ minWidth: 220 }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                        Bot - Seller New
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {bot.name || 'Untitled Bot'}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={bot.is_published ? 'Published' : 'Unpublished'}
                      sx={{
                        backgroundColor: bot.is_published ? 'rgba(16,185,129,0.2)' : 'rgba(148,163,184,0.2)',
                        color: bot.is_published ? '#34d399' : '#cbd5e1',
                      }}
                    />
                  </Box>
                  <Divider sx={{ my: 1.5, borderColor: 'rgba(148,163,184,0.2)' }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2" sx={{ color: '#9ca3af' }}>Bot ID</Typography>
                      <Typography variant="body1">{bot.bot_id}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2" sx={{ color: '#9ca3af' }}>Created</Typography>
                      <Typography variant="body1">{formatDateTime(bot.created_at)}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2" sx={{ color: '#9ca3af' }}>Updated</Typography>
                      <Typography variant="body1">{formatDateTime(bot.updated_at)}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>

            {/* Flow box */}
            <Paper
              sx={{
                p: 2,
                backgroundColor: '#0f172a',
                border: '1px solid rgba(148,163,184,0.25)',
                width: '100%',
                maxWidth: '100%',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Bot Flow / Script
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => navigate('/seller/create-boat', { state: { bot } })}
                  sx={{ color: '#9ca3af' }}
                  title="Edit Bot Flow"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Box>
              <BotFlowPanel flow={bot.flow} />
            </Paper>

            {/* Embed box */}
            <Paper sx={{ p: 2, backgroundColor: '#0f172a', border: '1px solid rgba(148,163,184,0.25)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Embed Script
                </Typography>
                <IconButton
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(embedScript);
                      await Swal.fire({
                        icon: 'success',
                        title: 'Copied',
                        timer: 900,
                        showConfirmButton: false,
                      });
                    } catch {
                      // ignore
                    }
                  }}
                  sx={{ color: '#9ca3af' }}
                  title="Copy"
                >
                  <ContentCopyIcon />
                </IconButton>
              </Box>
              <TextField
                fullWidth
                multiline
                minRows={5}
                value={embedScript}
                InputProps={{
                  readOnly: true,
                  sx: { fontFamily: 'monospace', fontSize: 12, color: '#e5e7eb', backgroundColor: '#0f2339' },
                }}
              />
            </Paper>
          </Box>
        )}
      </Card>
    </Box>
  );
}

export default BotDetails;

