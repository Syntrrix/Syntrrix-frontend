import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  TextField,
  Typography,
  Paper,
  Alert,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useParams } from 'react-router-dom';

import {
  fetchSellerLiveChatSession,
  fetchSellerLiveChatMessages,
  sendSellerLiveChatMessage,
} from '../../../api/liveChat';
import LiveChatAttachment from '../../../components/LiveChatAttachment';

function LiveChatSession() {
  const { customerId } = useParams();

  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');

  const [pollingEnabled, setPollingEnabled] = useState(false);

  const messagesEndRef = useRef(null);

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

  const canSend = useMemo(() => {
    if (!session?.session_id) return false;
    return input.trim().length > 0;
  }, [session?.session_id, input]);

  const handleSend = async () => {
    if (!canSend) return;
    setError('');
    const text = input.trim();
    setInput('');
    try {
      await sendSellerLiveChatMessage(session.session_id, text);
      await loadMessages();
    } catch (e) {
      setError(e.message || 'Failed to send message.');
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 3 },
        backgroundColor: '#020617',
        minHeight: '100vh',
        color: '#e5e7eb',
      }}
    >
      <Card
        sx={{
          backgroundColor: '#0f172a',
          borderRadius: 2,
          border: '1px solid rgba(148, 163, 184, 0.25)',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            backgroundColor: '#1e293b',
            padding: 2,
            borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
          }}
        >
          <Typography variant="h6" sx={{ color: '#e5e7eb', fontWeight: 700 }}>
            Live Chat
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            Customer ID: {customerId}
          </Typography>
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
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                size="small"
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
                <SendIcon />
              </Button>
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}

export default LiveChatSession;

