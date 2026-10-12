import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  TextField,
  Typography,
  Paper,
  IconButton,
  Alert,
  Chip,
  InputAdornment,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useNavigate } from 'react-router-dom';
import { useThemeContext } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';

import {
  fetchSellerLiveChatSession,
  fetchSellerLiveChatMessages,
  sendSellerLiveChatMessage,
} from '../../../api/liveChat';
import LiveChatAttachment from '../../../components/LiveChatAttachment';

function LiveChatSession() {
  const { isDark } = useThemeContext();
  const { user } = useAuth();
  const { customerId } = useParams();
  const navigate = useNavigate();

  const handleBackToLeadPipeline = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      const roleId = user?.role?.id;
      if (roleId === 4) {
        navigate('/team-manager/lead-pipeline');
      } else if (roleId === 5) {
        navigate('/agent/lead-pipeline');
      } else {
        navigate('/seller/lead-pipeline');
      }
    }
  };

  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const loadSession = async () => {
    if (!customerId) return;
    setLoading(true);
    setError('');
    try {
      const resp = await fetchSellerLiveChatSession(customerId);
      if (resp?.success) {
        setSession(resp.data || null);
      } else {
        setError(resp?.message || 'Failed to load live chat session.');
      }
    } catch (e) {
      setError(e.message || 'Failed to load live chat session.');
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!session?.session_id) return;
    try {
      const resp = await fetchSellerLiveChatMessages(session.session_id, 200);
      if (resp?.success && Array.isArray(resp.data)) {
        setMessages(resp.data);
      }
    } catch (e) {
      // Keep UI responsive; just show error if needed
      setError((prev) => prev || e.message || 'Failed to load chat messages.');
    }
  };

  useEffect(() => {
    setPollingEnabled(false);
    setMessages([]);
    setSession(null);
    void loadSession();
  }, [customerId]);

  useEffect(() => {
    if (!session?.session_id) return;
    setPollingEnabled(true);
    void loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.session_id]);

  useEffect(() => {
    if (!pollingEnabled) return;
    const t = setInterval(() => {
      void loadMessages();
    }, 2500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollingEnabled, session?.session_id]);

  useEffect(() => {
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  const canSend = useMemo(() => {
    if (!session?.session_id || sending) return false;
    return input.trim().length > 0 || Boolean(attachedFile);
  }, [session?.session_id, input, attachedFile, sending]);

  const handleSend = async () => {
    if (!canSend) return;
    setError('');
    setSending(true);
    const text = input.trim();
    const fileToSend = attachedFile;
    setInput('');
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      await sendSellerLiveChatMessage(session.session_id, text, fileToSend);
      await loadMessages();
    } catch (e) {
      setError(e.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 3 },
        backgroundColor: isDark ? '#020617' : '#f1f5f9',
        minHeight: '100vh',
        color: isDark ? '#e5e7eb' : '#0f172a',
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
    >
      <Card
        sx={{
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          borderRadius: 2,
          border: isDark ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            backgroundColor: '#1e293b',
            padding: 2,
            borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <IconButton
            onClick={handleBackToLeadPipeline}
            sx={{
              color: '#e5e7eb',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.18)' },
            }}
            title="Back to Lead Pipeline"
          >
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h6" sx={{ color: '#e5e7eb', fontWeight: 700, lineHeight: 1.2 }}>
              Live Chat
            </Typography>
            <Typography variant="body2" sx={{ color: '#9ca3af', mt: 0.2 }}>
              Customer ID: {customerId}
            </Typography>
          </Box>
        </Box>

        {error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              overflowY: 'auto',
              backgroundColor: '#0b1624',
              p: 2.5,
              borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
            }}
          >
            {loading && messages.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress sx={{ color: '#0ea5e9' }} />
              </Box>
            ) : messages.length === 0 ? (
              <Typography sx={{ color: '#9ca3af', textAlign: 'center', mt: 5 }}>
                No messages yet. Send the first one.
              </Typography>
            ) : (
              messages.map((m) => (
                <Box
                  key={m.message_id}
                  sx={{
                    display: 'flex',
                    justifyContent: m.sender_type === 'seller' ? 'flex-end' : 'flex-start',
                    mb: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: m.file_url ? '88%' : '78%',
                      minWidth: m.file_url ? 220 : undefined,
                      padding: 1.5,
                      borderRadius: 2,
                      backgroundColor: m.sender_type === 'seller' ? '#0ea5e9' : '#1e293b',
                      color: '#fff',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontSize: 14,
                    }}
                  >
                    {m.file_url ? (
                      <LiveChatAttachment message={m} textColor="#fff" primaryColor="#0ea5e9" />
                    ) : (
                      m.message
                    )}
                  </Box>
                </Box>
              ))
            )}
            <div ref={messagesEndRef} />
          </Paper>

          <Box sx={{ p: 2, backgroundColor: '#0f172a' }}>
            {attachedFile ? (
              <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  icon={attachedFile.type?.startsWith('image/') ? <ImageIcon fontSize="small" /> : <AttachFileIcon fontSize="small" />}
                  label={`${attachedFile.name} (${(attachedFile.size / 1024).toFixed(1)} KB)`}
                  onDelete={() => {
                    setAttachedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  color="primary"
                  variant="outlined"
                  size="small"
                  sx={{
                    borderColor: '#0ea5e9',
                    color: '#38bdf8',
                    fontWeight: 600,
                  }}
                />
              </Box>
            ) : null}

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
              />
              <TextField
                fullWidth
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                size="small"
                disabled={sending}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        disabled={sending}
                        onClick={() => fileInputRef.current?.click()}
                        sx={{ color: attachedFile ? '#0ea5e9' : '#9ca3af' }}
                        title="Upload Image or PDF Document"
                      >
                        <AttachFileIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#1e293b',
                    color: '#e5e7eb',
                  },
                }}
              />
              <Button
                variant="contained"
                disabled={!canSend}
                onClick={() => void handleSend()}
                sx={{
                  backgroundColor: '#0ea5e9',
                  color: '#fff',
                  '&:hover': { backgroundColor: '#0284c7' },
                  minWidth: 56,
                  height: 40,
                }}
              >
                {sending ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <SendIcon />}
              </Button>
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}

export default LiveChatSession;

