import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import SourceOutlinedIcon from '@mui/icons-material/SourceOutlined';
import LocalPhoneOutlinedIcon from '@mui/icons-material/LocalPhoneOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { fetchSellerLiveChatSupportSessions, fetchSellerLiveChatMessages, sendSellerLiveChatMessage } from '../../../api/liveChat';
import LiveChatAttachment from '../../../components/LiveChatAttachment';
import { useAuth } from '../../../context/AuthContext';

const STATUS_UNASSIGNED = 'unassigned';
const STATUS_ASSIGNED = 'assigned';
const STATUS_ARCHIVED = 'archived';
const STATUS_MAP_STORAGE_KEY = 'live_chat_support_status_map';

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
    const key = phone || email ? `${phone}::${email}` : `sid::${String(session?.session_id || '')}`;
    const existing = byKey.get(key);
    if (!existing || sessionSortTs(session) > sessionSortTs(existing)) {
      byKey.set(key, session);
    }
  });
  return Array.from(byKey.values()).sort((a, b) => sessionSortTs(b) - sessionSortTs(a));
}

function LiveChatSupport() {
  const { user } = useAuth();
  const isTeamPanelUser = user?.role?.id === 4 || user?.role?.id === 5;
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState(isTeamPanelUser ? STATUS_ASSIGNED : STATUS_UNASSIGNED);
  const [statusBySession, setStatusBySession] = useState({});
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);

  const messagesEndRef = useRef(null);
  const lastMessagesSigRef = useRef('');

  const menuOpen = Boolean(menuAnchorEl);

  const getSessionStatus = (sessionId) => statusBySession[String(sessionId)] || STATUS_UNASSIGNED;

  const setSessionStatus = (sessionId, status) => {
    setStatusBySession((prev) => ({ ...prev, [String(sessionId)]: status }));
  };

  const loadSessions = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetchSellerLiveChatSupportSessions();
      if (resp?.success && Array.isArray(resp.data)) {
        const deduped = dedupeSessionsByPhoneEmail(resp.data);
        setSessions(deduped);
        setStatusBySession((prev) => {
          const next = { ...(prev || {}) };
          deduped.forEach((s) => {
            const sid = String(s.session_id);
            const hasBackendAssignment = Boolean(s?.assigned_team_manager_id || s?.assigned_agent_id);
            // Archived state remains user-controlled, but backend assignment should force Assigned.
            if (next[sid] === STATUS_ARCHIVED) return;
            if (isTeamPanelUser || hasBackendAssignment) {
              next[sid] = STATUS_ASSIGNED;
            } else if (!next[sid]) {
              next[sid] = STATUS_UNASSIGNED;
            }
          });
          return next;
        });
        // Auto-select first session if none
        if (!selected && deduped.length > 0) setSelected(deduped[0]);
        if (selected?.session_id) {
          const stillExists = deduped.some((s) => s.session_id === selected.session_id);
          if (!stillExists && deduped.length > 0) setSelected(deduped[0]);
        }
      } else {
        setSessions([]);
      }
    } catch (e) {
      setError(e.message || 'Failed to load live chat sessions.');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (sessionId) => {
    if (!sessionId) return;
    try {
      const resp = await fetchSellerLiveChatMessages(sessionId, 200);
      if (resp?.success && Array.isArray(resp.data)) {
        const sig = resp.data
          .map((m) => `${m.message_id}|${m.file_url || ''}|${m.message || ''}`)
          .join(';;');
        if (sig && sig === lastMessagesSigRef.current) return;
        lastMessagesSigRef.current = sig;
        setMessages(resp.data);
      }
    } catch {
      // Keep old messages; UI shouldn't break.
    }
  };

  useEffect(() => {
    if (!isTeamPanelUser) return;
    setActiveTab(STATUS_ASSIGNED);
  }, [isTeamPanelUser]);


  useEffect(() => {
    try {
      if (!isTeamPanelUser) {
        const raw = localStorage.getItem(STATUS_MAP_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            setStatusBySession(parsed);
          }
        }
      }
    } catch {
      // Ignore parse issues.
    }

    // Always load sessions for both seller & team users.
    void loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTeamPanelUser]);

  useEffect(() => {
    try {
      if (isTeamPanelUser) return;
      localStorage.setItem(STATUS_MAP_STORAGE_KEY, JSON.stringify(statusBySession));
    } catch {
      // Ignore storage write errors.
    }
  }, [statusBySession, isTeamPanelUser]);

  useEffect(() => {
    if (!selected?.session_id) return;
    lastMessagesSigRef.current = '';
    void loadMessages(selected.session_id);
    const t = setInterval(() => {
      void loadMessages(selected.session_id);
    }, 2500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.session_id]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const tabbedSessions = useMemo(() => {
    return sessions.filter((s) => getSessionStatus(s.session_id) === activeTab);
  }, [sessions, activeTab, statusBySession, isTeamPanelUser]);

  const filteredSessions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tabbedSessions;
    return tabbedSessions.filter((s) => {
      const name = (s.customer_name || '').toLowerCase();
      const phone = (s.mobile_number || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const last = (s.last_message_text || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q) || last.includes(q);
    });
  }, [tabbedSessions, query]);

  const counts = useMemo(() => {
    let unassigned = 0;
    let assigned = 0;
    let archived = 0;
    sessions.forEach((s) => {
      const status = getSessionStatus(s.session_id);
      if (status === STATUS_ASSIGNED) assigned += 1;
      else if (status === STATUS_ARCHIVED) archived += 1;
      else unassigned += 1;
    });
    return { unassigned, assigned, archived };
  }, [sessions, statusBySession, isTeamPanelUser]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selected?.session_id) return;
    setInput('');
    await sendSellerLiveChatMessage(selected.session_id, text);
    await loadMessages(selected.session_id);
  };

  const handleSetAssigned = (assigned) => {
    if (!selected?.session_id) return;
    setSessionStatus(selected.session_id, assigned ? STATUS_ASSIGNED : STATUS_UNASSIGNED);
  };

  const handleArchive = () => {
    if (!selected?.session_id) return;
    setSessionStatus(selected.session_id, STATUS_ARCHIVED);
    setMenuAnchorEl(null);
    setActiveTab(STATUS_ARCHIVED);
  };

  return (
    <Box sx={{ p: 0, backgroundColor: '#020617', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', height: '100%' }}>
        {/* Left: inbox */}
        <Paper
          elevation={0}
          sx={{
            width: 350,
            backgroundColor: '#0b1624',
            borderRight: '1px solid rgba(148, 163, 184, 0.18)',
            borderRadius: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid rgba(148, 163, 184, 0.18)' }}>
            <Typography sx={{ color: '#e5e7eb', fontWeight: 800, fontSize: 16 }}>Inbox</Typography>
            <Typography sx={{ color: '#9ca3af', fontSize: 12, mt: 0.5 }}>
              Live chat with your bot customers
            </Typography>

            <TextField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by phone or name..."
              size="small"
              fullWidth
              sx={{ mt: 1.5 }}
              InputProps={{
                sx: {
                  backgroundColor: '#0f172a',
                  color: '#e5e7eb',
                  borderRadius: 1.5,
                },
              }}
            />

            <Box sx={{ display: 'flex', gap: 1, mt: 1.25 }}>
              <Chip
                size="small"
                label={`Unassigned (${counts.unassigned})`}
                onClick={() => setActiveTab(STATUS_UNASSIGNED)}
                sx={{
                  bgcolor: activeTab === STATUS_UNASSIGNED ? 'rgba(14,165,233,0.2)' : 'rgba(148,163,184,0.12)',
                  color: '#e5e7eb',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              />
              <Chip
                size="small"
                label={`Assigned (${counts.assigned})`}
                onClick={() => setActiveTab(STATUS_ASSIGNED)}
                sx={{
                  bgcolor: activeTab === STATUS_ASSIGNED ? 'rgba(14,165,233,0.2)' : 'rgba(148,163,184,0.12)',
                  color: '#e5e7eb',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              />
              <Chip
                size="small"
                label={`Archived (${counts.archived})`}
                onClick={() => setActiveTab(STATUS_ARCHIVED)}
                sx={{
                  bgcolor: activeTab === STATUS_ARCHIVED ? 'rgba(14,165,233,0.2)' : 'rgba(148,163,184,0.12)',
                  color: '#e5e7eb',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              />
            </Box>
          </Box>

          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 0,
              '&::-webkit-scrollbar': { width: 0, height: 0 },
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {loading ? (
              <Box sx={{ p: 2 }}>
                <Typography sx={{ color: '#9ca3af' }}>Loading...</Typography>
              </Box>
            ) : filteredSessions.length === 0 ? (
              <Box sx={{ p: 2 }}>
                <Typography sx={{ color: '#9ca3af' }}>No chats found.</Typography>
              </Box>
            ) : (
              filteredSessions.map((s) => {
                const isActive = selected?.session_id === s.session_id;
                return (
                  <Box
                    key={s.session_id}
                    onClick={() => {
                      setSelected(s);
                      setMessages([]);
                      lastMessagesSigRef.current = '';
                    }}
                    role="button"
                    tabIndex={0}
                    sx={{
                      cursor: 'pointer',
                      px: 2,
                      py: 1.5,
                      borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
                      backgroundColor: isActive ? 'rgba(14,165,233,0.12)' : 'transparent',
                      '&:hover': { backgroundColor: 'rgba(148,163,184,0.06)' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: 'rgba(14,165,233,0.25)', color: '#e5e7eb', width: 32, height: 32 }}>
                        {String(s.customer_name || 'U').trim().slice(0, 1).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ color: '#e5e7eb', fontWeight: 700, fontSize: 13 }}>
                          {s.customer_name || 'Customer'}
                        </Typography>
                        <Typography sx={{ color: '#9ca3af', fontSize: 12, mt: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.last_message_text || 'No messages yet'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                        <Chip
                          size="small"
                          label={s.last_message_sender_type === 'seller' ? 'Answered' : 'Open'}
                          sx={{
                            bgcolor: s.last_message_sender_type === 'seller' ? 'rgba(16,185,129,0.18)' : 'rgba(14,165,233,0.18)',
                            color: '#e5e7eb',
                            fontWeight: 700,
                          }}
                        />
                        <Typography sx={{ color: '#64748b', fontSize: 11 }}>
                          {s.last_message_created_at ? new Date(s.last_message_created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>
        </Paper>

        {/* Center: conversation */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            backgroundColor: '#0b1624',
            borderRadius: 0,
            overflow: 'hidden',
            borderRight: '1px solid rgba(148, 163, 184, 0.18)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid rgba(148, 163, 184, 0.18)' }}>
            {selected ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Box>
                    <Typography sx={{ color: '#e5e7eb', fontWeight: 800, fontSize: 16 }}>
                      {selected.customer_name || 'Customer'}
                    </Typography>
                    <Typography sx={{ color: '#9ca3af', fontSize: 12, mt: 0.5 }}>
                      {selected.mobile_number ? `+${selected.mobile_number}` : ''} {selected.email ? `• ${selected.email}` : ''}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleSetAssigned(true)}
                      sx={{ bgcolor: '#0ea5e9', textTransform: 'none' }}
                    >
                      Assign
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleSetAssigned(false)}
                      sx={{ borderColor: 'rgba(148,163,184,0.25)', textTransform: 'none', color: '#e5e7eb' }}
                    >
                      Unassigned
                    </Button>
                    <IconButton
                      size="small"
                      onClick={(e) => setMenuAnchorEl(e.currentTarget)}
                      sx={{ color: '#9ca3af' }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                    <Menu
                      anchorEl={menuAnchorEl}
                      open={menuOpen}
                      onClose={() => setMenuAnchorEl(null)}
                      PaperProps={{
                        sx: {
                          backgroundColor: '#0f172a',
                          color: '#e5e7eb',
                          border: '1px solid rgba(148,163,184,0.2)',
                        },
                      }}
                    >
                      <MenuItem onClick={handleArchive}>Archive</MenuItem>
                    </Menu>
                  </Box>
                </Box>
              </>
            ) : (
              <Typography sx={{ color: '#9ca3af' }}>Select a chat</Typography>
            )}
          </Box>

          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              '&::-webkit-scrollbar': { width: 0 },
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {selected && messages.length === 0 ? (
              <Typography sx={{ color: '#9ca3af', mt: 3, textAlign: 'center' }}>No chat history yet.</Typography>
            ) : (
              messages.map((m) => {
                const isSeller = m.sender_type === 'seller';
                return (
                  <Box
                    key={m.message_id}
                    sx={{ display: 'flex', justifyContent: isSeller ? 'flex-end' : 'flex-start' }}
                  >
                    <Box
                      sx={{
                        maxWidth: m.file_url ? '88%' : '78%',
                        minWidth: m.file_url ? 220 : undefined,
                        bgcolor: isSeller ? '#0ea5e9' : '#1e293b',
                        color: '#e5e7eb',
                        px: 2,
                        py: 1.2,
                        borderRadius: 2,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontSize: 13,
                      }}
                    >
                      {m.file_url ? (
                        <LiveChatAttachment message={m} textColor="#e5e7eb" primaryColor="#0ea5e9" />
                      ) : (
                        m.message
                      )}
                    </Box>
                  </Box>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input bar */}
          <Box sx={{ p: 2, borderTop: '1px solid rgba(148, 163, 184, 0.18)' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                fullWidth
                size="small"
                disabled={!selected}
                InputProps={{
                  sx: { backgroundColor: '#0f172a', color: '#e5e7eb', borderRadius: 1.5 },
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
              />
              <Button
                variant="contained"
                onClick={() => void handleSend()}
                disabled={!selected || !input.trim()}
                sx={{ bgcolor: '#0ea5e9', minWidth: 48, px: 1.5 }}
              >
                <SendIcon fontSize="small" />
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Right: details */}
        <Paper
          elevation={0}
          sx={{
            width: 320,
            backgroundColor: '#0b1624',
            borderRadius: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid rgba(148, 163, 184, 0.18)' }}>
            {selected ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Avatar
                  sx={{
                    width: 42,
                    height: 42,
                    bgcolor: 'rgba(148,163,184,0.18)',
                    color: '#e5e7eb',
                    fontWeight: 800,
                  }}
                >
                  {String(selected.customer_name || 'IN').trim().slice(0, 2).toUpperCase()}
                </Avatar>
                <Typography sx={{ color: '#e5e7eb', fontWeight: 900, fontSize: 15, lineHeight: 1.2, mt: 1.2, textAlign: 'center' }}>
                  {selected.customer_name || 'Customer'}
                </Typography>
                <Typography sx={{ color: '#9ca3af', fontSize: 12, mt: 0.6, textAlign: 'center' }}>
                  {selected.mobile_number ? `+${selected.mobile_number}` : ''}
                </Typography>
                <Typography sx={{ color: '#64748b', fontSize: 11, mt: 0.6, textAlign: 'center' }}>
                  {selected.email || 'via bot'}
                </Typography>
              </Box>
            ) : (
              <Typography sx={{ color: '#9ca3af' }}>Details</Typography>
            )}
          </Box>

          <Box
            sx={{
              p: 2,
              overflowY: 'auto',
              flex: 1,
              '&::-webkit-scrollbar': { width: 0 },
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {/* Quick fields */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
                <LocationOnOutlinedIcon sx={{ color: '#64748b', fontSize: 18 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ color: '#9ca3af', fontSize: 12, fontWeight: 800 }}>Location</Typography>
                  <Typography sx={{ color: '#e5e7eb', fontSize: 13, mt: 0.25 }}>
                    {selected?.bot_payload?.location || 'India'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
                <BusinessOutlinedIcon sx={{ color: '#64748b', fontSize: 18 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ color: '#9ca3af', fontSize: 12, fontWeight: 800 }}>Business</Typography>
                  <Typography sx={{ color: '#e5e7eb', fontSize: 13, mt: 0.25 }}>
                    {selected?.bot_payload?.business || 'N/A'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
                <SourceOutlinedIcon sx={{ color: '#64748b', fontSize: 18 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ color: '#9ca3af', fontSize: 12, fontWeight: 800 }}>Source</Typography>
                  <Typography sx={{ color: '#e5e7eb', fontSize: 13, mt: 0.25 }}>
                    {selected ? 'Natural Lead' : '—'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ borderTop: '1px solid rgba(148, 163, 184, 0.18)', mt: 0.5 }} />
              <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
                <LocalPhoneOutlinedIcon sx={{ color: '#64748b', fontSize: 18 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ color: '#9ca3af', fontSize: 12, fontWeight: 800 }}>WhatsApp</Typography>
                  <Typography sx={{ color: '#e5e7eb', fontSize: 13, mt: 0.25 }}>
                    {selected?.whatsapp_number ? `+${selected.whatsapp_number}` : 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Tags */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LabelOutlinedIcon sx={{ color: '#64748b', fontSize: 18 }} />
                <Typography sx={{ color: '#9ca3af', fontSize: 12, fontWeight: 900 }}>TAGS</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.25 }}>
                <Chip size="small" label="New User" sx={{ bgcolor: 'rgba(14,165,233,0.18)', color: '#e5e7eb', fontWeight: 700 }} />
                <Chip size="small" label="New Lead" sx={{ bgcolor: 'rgba(239,68,68,0.16)', color: '#e5e7eb', fontWeight: 700 }} />
                <Chip size="small" label="+ Add" variant="outlined" sx={{ borderColor: 'rgba(148,163,184,0.25)', color: '#e5e7eb' }} />
              </Box>
            </Box>

            {/* Notes */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ borderTop: '1px solid rgba(148, 163, 184, 0.18)', mb: 1.25 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <NotesOutlinedIcon sx={{ color: '#64748b', fontSize: 18 }} />
                <Typography sx={{ color: '#9ca3af', fontSize: 12, fontWeight: 900 }}>NOTES</Typography>
              </Box>
              <Box sx={{ mt: 1.25, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Typography sx={{ color: '#e5e7eb', fontSize: 13 }}>Interested in premium plan</Typography>
                <Typography sx={{ color: '#64748b', fontSize: 12 }}>Follow up next week</Typography>
                <Typography sx={{ color: '#94a3b8', fontSize: 12 }}>+ Add note</Typography>
              </Box>
              <Box sx={{ borderTop: '1px solid rgba(148, 163, 184, 0.18)', mt: 1.25 }} />
            </Box>

            {/* Captured intents */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PsychologyOutlinedIcon sx={{ color: '#64748b', fontSize: 18 }} />
                <Typography sx={{ color: '#9ca3af', fontSize: 12, fontWeight: 900 }}>CAPTURED INTENTS</Typography>
              </Box>
              <Box sx={{ mt: 1.25, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Typography sx={{ color: '#e5e7eb', fontSize: 13 }}>Pricing inquiry</Typography>
                <Typography sx={{ color: '#e5e7eb', fontSize: 13 }}>Product detail</Typography>
              </Box>
              <Box sx={{ borderTop: '1px solid rgba(148, 163, 184, 0.18)', mt: 1.25 }} />
            </Box>

            {/* Call history */}
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HistoryOutlinedIcon sx={{ color: '#64748b', fontSize: 18 }} />
                <Typography sx={{ color: '#9ca3af', fontSize: 12, fontWeight: 900 }}>CALL HISTORY</Typography>
              </Box>
              <Typography sx={{ color: '#64748b', fontSize: 12, mt: 1.25 }}>
                No recordings yet
              </Typography>
              <Box sx={{ borderTop: '1px solid rgba(148, 163, 184, 0.18)', mt: 1.25 }} />
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

export default LiveChatSupport;

