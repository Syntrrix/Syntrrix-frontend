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
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import SourceOutlinedIcon from '@mui/icons-material/SourceOutlined';
import LocalPhoneOutlinedIcon from '@mui/icons-material/LocalPhoneOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { fetchSellerLiveChatSupportSessions, fetchSellerLiveChatMessages, sendSellerLiveChatMessage } from '../../../api/liveChat';
import LiveChatAttachment from '../../../components/LiveChatAttachment';
import { useAuth } from '../../../context/AuthContext';
import { useThemeContext } from '../../../context/ThemeContext';

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

function formatMessageTime(createdAt) {
  if (!createdAt) return '';
  try {
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
}

function renderMessageContent(m, isSeller, isDark) {
  if (m.file_url) {
    return (
      <LiveChatAttachment
        message={m}
        textColor={isSeller ? '#ffffff' : (isDark ? '#e5e7eb' : '#0f172a')}
        primaryColor="#0ea5e9"
      />
    );
  }

  const rawText = String(m.message || '').trim();

  // 1. Template Message Card
  if (rawText.startsWith('[Template Message:')) {
    const headerMatch = rawText.match(/^\[Template Message:\s*([^\]]+)\]/);
    const templateTitle = headerMatch ? headerMatch[1] : 'Template Message';
    const bodyContent = rawText.replace(/^\[Template Message:\s*[^\]]+\]\n?/, '').trim();

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Chip
            size="small"
            label={`📢 Template: ${templateTitle}`}
            sx={{
              bgcolor: isSeller ? 'rgba(255,255,255,0.25)' : (isDark ? 'rgba(14,165,233,0.2)' : '#e0f2fe'),
              color: isSeller ? '#ffffff' : (isDark ? '#38bdf8' : '#0284c7'),
              fontWeight: 800,
              fontSize: 11,
            }}
          />
        </Box>
        <Typography sx={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {bodyContent}
        </Typography>
      </Box>
    );
  }

  // 2. Bot Question / Multiple Choice Card
  if (rawText.startsWith('[Bot Question]:') || rawText.includes('Options:\n') || rawText.includes('Selectable Options:\n')) {
    const parts = rawText.split(/(Options:\n|Selectable Options:\n)/);
    const mainQuestion = (parts[0] || '').replace(/^\[Bot Question\]:\s*/, '').trim();
    const optionsSection = parts[2] || '';

    const optionLines = optionsSection
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {mainQuestion}
        </Typography>
        {optionLines.length > 0 ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mt: 0.5 }}>
            {optionLines.map((opt, idx) => (
              <Chip
                key={idx}
                size="small"
                label={opt}
                sx={{
                  bgcolor: isSeller ? 'rgba(255,255,255,0.2)' : (isDark ? 'rgba(148,163,184,0.15)' : '#ffffff'),
                  color: isSeller ? '#ffffff' : (isDark ? '#e5e7eb' : '#0f172a'),
                  border: isSeller ? '1px solid rgba(255,255,255,0.3)' : (isDark ? '1px solid rgba(148,163,184,0.2)' : '1px solid #cbd5e1'),
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
            ))}
          </Box>
        ) : null}
      </Box>
    );
  }

  return rawText;
}

function LiveChatSupport() {
  const navigate = useNavigate();
  const { isDark } = useThemeContext();
  const { user } = useAuth();

  const handleBackToDashboard = () => {
    const roleId = user?.role?.id;
    if (roleId === 4) {
      navigate('/team-manager/dashboard');
    } else if (roleId === 5) {
      navigate('/agent/dashboard');
    } else {
      navigate('/seller/dashboard');
    }
  };
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
  const [attachedFile, setAttachedFile] = useState(null);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastMessagesSigRef = useRef('');
  const selectedRef = useRef(selected);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const menuOpen = Boolean(menuAnchorEl);

  const getSessionStatus = (sessionId) => statusBySession[String(sessionId)] || STATUS_UNASSIGNED;

  const setSessionStatus = (sessionId, status) => {
    setStatusBySession((prev) => ({ ...prev, [String(sessionId)]: status }));
  };

  const loadSessions = async (quiet = false) => {
    if (!quiet) {
      setLoading(true);
      setError('');
    }
    try {
      const resp = await fetchSellerLiveChatSupportSessions();
      if (resp?.success && Array.isArray(resp.data)) {
        const deduped = dedupeSessionsByPhoneEmail(resp.data);
        setSessions((prev) => {
          const selId = selectedRef.current?.session_id;
          return deduped.map((s) => {
            if (selId && s.session_id === selId) {
              return { ...s, unread_count: 0, is_read: true };
            }
            return s;
          });
        });
        setStatusBySession((prev) => {
          const next = { ...(prev || {}) };
          deduped.forEach((s) => {
            const sid = String(s.session_id);
            const hasBackendAssignment = Boolean(s?.assigned_team_manager_id || s?.assigned_agent_id);
            if (next[sid] === STATUS_ARCHIVED) return;
            if (isTeamPanelUser || hasBackendAssignment) {
              next[sid] = STATUS_ASSIGNED;
            } else if (!next[sid]) {
              next[sid] = STATUS_UNASSIGNED;
            }
          });
          return next;
        });
        if (!selectedRef.current && deduped.length > 0) setSelected(deduped[0]);
        if (selectedRef.current?.session_id) {
          const stillExists = deduped.some((s) => s.session_id === selectedRef.current.session_id);
          if (!stillExists && deduped.length > 0) setSelected(deduped[0]);
        }
      } else if (!quiet) {
        setSessions([]);
      }
    } catch (e) {
      if (!quiet) {
        setError(e.message || 'Failed to load live chat sessions.');
        setSessions([]);
      }
    } finally {
      if (!quiet) {
        setLoading(false);
      }
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
    const interval = setInterval(() => {
      void loadSessions(true);
    }, 3500);
    return () => clearInterval(interval);
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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && !attachedFile) || !selected?.session_id || sending) return;

    setSending(true);
    const fileToSend = attachedFile;
    setInput('');
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      await sendSellerLiveChatMessage(selected.session_id, text, fileToSend);
      lastMessagesSigRef.current = '';
      await loadMessages(selected.session_id);
    } catch (err) {
      console.error('Failed to send live chat message/file:', err);
    } finally {
      setSending(false);
    }
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

  useEffect(() => {
    const unreadCountTotal = sessions.filter((s) => Number(s.unread_count || 0) > 0).length;
    window.dispatchEvent(new CustomEvent('live_chat_unread_update', { detail: { unreadCount: unreadCountTotal } }));
  }, [sessions]);

  const handleSelectSession = (s) => {
    setSelected(s);
    setMessages([]);
    lastMessagesSigRef.current = '';
    setSessions((prev) =>
      prev.map((item) => (item.session_id === s.session_id ? { ...item, unread_count: 0, is_read: true } : item))
    );
  };

  return (
    <Box sx={{ p: 0, backgroundColor: isDark ? '#020617' : '#f1f5f9', height: 'calc(100vh - 64px)', overflow: 'hidden', transition: 'background-color 0.3s ease' }}>
      <Box sx={{ display: 'flex', height: '100%' }}>
        {/* Left: inbox */}
        <Paper
          elevation={0}
          sx={{
            width: 350,
            backgroundColor: isDark ? '#0b1624' : '#ffffff',
            borderRight: isDark ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid #e2e8f0',
            borderRadius: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ p: 2, borderBottom: isDark ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <IconButton
                size="small"
                onClick={handleBackToDashboard}
                sx={{
                  color: isDark ? '#e5e7eb' : '#0f172a',
                  bgcolor: isDark ? 'rgba(148,163,184,0.12)' : '#f1f5f9',
                  '&:hover': { bgcolor: isDark ? 'rgba(148,163,184,0.25)' : '#e2e8f0' },
                }}
                title="Back to Dashboard"
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
              <Typography sx={{ color: isDark ? '#e5e7eb' : '#0f172a', fontWeight: 800, fontSize: 16 }}>Inbox</Typography>
            </Box>
            <Typography sx={{ color: isDark ? '#9ca3af' : '#64748b', fontSize: 12 }}>
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
                  backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
                  color: isDark ? '#e5e7eb' : '#0f172a',
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
                  bgcolor: activeTab === STATUS_UNASSIGNED ? (isDark ? 'rgba(14,165,233,0.2)' : '#e0f2fe') : (isDark ? 'rgba(148,163,184,0.12)' : '#f1f5f9'),
                  color: activeTab === STATUS_UNASSIGNED ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#e5e7eb' : '#475569'),
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              />
              <Chip
                size="small"
                label={`Assigned (${counts.assigned})`}
                onClick={() => setActiveTab(STATUS_ASSIGNED)}
                sx={{
                  bgcolor: activeTab === STATUS_ASSIGNED ? (isDark ? 'rgba(14,165,233,0.2)' : '#e0f2fe') : (isDark ? 'rgba(148,163,184,0.12)' : '#f1f5f9'),
                  color: activeTab === STATUS_ASSIGNED ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#e5e7eb' : '#475569'),
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              />
              <Chip
                size="small"
                label={`Archived (${counts.archived})`}
                onClick={() => setActiveTab(STATUS_ARCHIVED)}
                sx={{
                  bgcolor: activeTab === STATUS_ARCHIVED ? (isDark ? 'rgba(14,165,233,0.2)' : '#e0f2fe') : (isDark ? 'rgba(148,163,184,0.12)' : '#f1f5f9'),
                  color: activeTab === STATUS_ARCHIVED ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#e5e7eb' : '#475569'),
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
                <Typography sx={{ color: isDark ? '#9ca3af' : '#64748b' }}>Loading...</Typography>
              </Box>
            ) : filteredSessions.length === 0 ? (
              <Box sx={{ p: 2 }}>
                <Typography sx={{ color: isDark ? '#9ca3af' : '#64748b' }}>No chats found.</Typography>
              </Box>
            ) : (
              filteredSessions.map((s) => {
                const isActive = selected?.session_id === s.session_id;
                const isSellerMsg = s.last_message_sender_type === 'seller';
                const unreadNum = isActive ? 0 : Number(s.unread_count || 0);
                return (
                  <Box
                    key={s.session_id}
                    onClick={() => handleSelectSession(s)}
                    role="button"
                    tabIndex={0}
                    sx={{
                      cursor: 'pointer',
                      px: 2,
                      py: 1.5,
                      borderBottom: isDark ? '1px solid rgba(148, 163, 184, 0.08)' : '1px solid #f1f5f9',
                      backgroundColor: isActive ? (isDark ? 'rgba(14,165,233,0.12)' : '#f0f9ff') : 'transparent',
                      '&:hover': { backgroundColor: isDark ? 'rgba(148,163,184,0.06)' : '#f8fafc' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: isDark ? 'rgba(14,165,233,0.25)' : '#e0f2fe', color: isDark ? '#e5e7eb' : '#0284c7', width: 32, height: 32, fontWeight: 700 }}>
                        {String(s.customer_name || 'U').trim().slice(0, 1).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                          <Typography sx={{ color: isDark ? '#e5e7eb' : '#0f172a', fontWeight: 700, fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {s.customer_name || 'Customer'}
                          </Typography>
                          {!isSellerMsg && unreadNum > 0 ? (
                            <Chip
                              size="small"
                              label={unreadNum}
                              sx={{
                                bgcolor: '#ef4444',
                                color: '#ffffff',
                                fontWeight: 900,
                                fontSize: 11,
                                height: 18,
                                minWidth: 18,
                                px: 0.5,
                                borderRadius: '10px',
                                boxShadow: '0 0 6px rgba(239, 68, 68, 0.4)',
                              }}
                            />
                          ) : null}
                        </Box>
                        <Typography sx={{ color: isDark ? '#9ca3af' : '#64748b', fontSize: 12, mt: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.last_message_text || 'No messages yet'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, minWidth: 65 }}>
                        <Chip
                          size="small"
                          label={isSellerMsg ? 'Answered' : 'Open'}
                          sx={{
                            bgcolor: isSellerMsg ? (isDark ? 'rgba(16,185,129,0.18)' : '#ecfdf5') : (isDark ? 'rgba(14,165,233,0.18)' : '#e0f2fe'),
                            color: isSellerMsg ? (isDark ? '#6ee7b7' : '#047857') : (isDark ? '#38bdf8' : '#0284c7'),
                            fontWeight: 700,
                          }}
                        />
                        <Typography sx={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 11 }}>
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
            backgroundColor: isDark ? '#0b1624' : '#ffffff',
            borderRadius: 0,
            overflow: 'hidden',
            borderRight: isDark ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ p: 2, borderBottom: isDark ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid #e2e8f0' }}>
            {selected ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Box>
                    <Typography sx={{ color: isDark ? '#e5e7eb' : '#0f172a', fontWeight: 800, fontSize: 16 }}>
                      {selected.customer_name || 'Customer'}
                    </Typography>
                    <Typography sx={{ color: isDark ? '#9ca3af' : '#64748b', fontSize: 12, mt: 0.5 }}>
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
                      sx={{ borderColor: isDark ? 'rgba(148,163,184,0.25)' : '#cbd5e1', textTransform: 'none', color: isDark ? '#e5e7eb' : '#0f172a' }}
                    >
                      Unassigned
                    </Button>
                    <IconButton
                      size="small"
                      onClick={(e) => setMenuAnchorEl(e.currentTarget)}
                      sx={{ color: isDark ? '#9ca3af' : '#64748b' }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                    <Menu
                      anchorEl={menuAnchorEl}
                      open={menuOpen}
                      onClose={() => setMenuAnchorEl(null)}
                      PaperProps={{
                        sx: {
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                          color: isDark ? '#e5e7eb' : '#0f172a',
                          border: isDark ? '1px solid rgba(148,163,184,0.2)' : '1px solid #e2e8f0',
                        },
                      }}
                    >
                      <MenuItem onClick={handleArchive}>Archive</MenuItem>
                    </Menu>
                  </Box>
                </Box>
              </>
            ) : (
              <Typography sx={{ color: isDark ? '#9ca3af' : '#64748b' }}>Select a chat</Typography>
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
              <Typography sx={{ color: isDark ? '#9ca3af' : '#64748b', mt: 3, textAlign: 'center' }}>No chat history yet.</Typography>
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
                        minWidth: m.file_url ? 220 : 120,
                        bgcolor: isSeller ? '#0ea5e9' : (isDark ? '#1e293b' : '#f1f5f9'),
                        color: isSeller ? '#ffffff' : (isDark ? '#e5e7eb' : '#0f172a'),
                        px: 2,
                        py: 1.2,
                        borderRadius: 2,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontSize: 13,
                        boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {renderMessageContent(m, isSeller, isDark)}
                      {m.created_at ? (
                        <Typography
                          sx={{
                            fontSize: 10,
                            color: isSeller ? 'rgba(255, 255, 255, 0.75)' : (isDark ? '#94a3b8' : '#64748b'),
                            alignSelf: 'flex-end',
                            mt: 0.5,
                            fontWeight: 500,
                            lineHeight: 1,
                            userSelect: 'none',
                          }}
                        >
                          {formatMessageTime(m.created_at)}
                        </Typography>
                      ) : null}
                    </Box>
                  </Box>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input bar */}
          <Box sx={{ p: 2, borderTop: isDark ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid #e2e8f0' }}>
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
                    color: isDark ? '#38bdf8' : '#0284c7',
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
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                fullWidth
                size="small"
                disabled={!selected || sending}
                InputProps={{
                  sx: { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#e5e7eb' : '#0f172a', borderRadius: 1.5 },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        disabled={!selected || sending}
                        onClick={() => fileInputRef.current?.click()}
                        sx={{ color: attachedFile ? '#0ea5e9' : (isDark ? '#9ca3af' : '#64748b') }}
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
              />
              <Button
                variant="contained"
                onClick={() => void handleSend()}
                disabled={!selected || sending || (!input.trim() && !attachedFile)}
                sx={{ bgcolor: '#0ea5e9', minWidth: 48, px: 1.5, height: 40 }}
              >
                {sending ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <SendIcon fontSize="small" />}
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Right: details */}
        <Paper
          elevation={0}
          sx={{
            width: 320,
            backgroundColor: isDark ? '#0b1624' : '#ffffff',
            borderRadius: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ p: 2, borderBottom: isDark ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid #e2e8f0' }}>
            {selected ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Avatar
                  sx={{
                    width: 42,
                    height: 42,
                    bgcolor: isDark ? 'rgba(148,163,184,0.18)' : '#e0f2fe',
                    color: isDark ? '#e5e7eb' : '#0284c7',
                    fontWeight: 800,
                  }}
                >
                  {String(selected.customer_name || 'IN').trim().slice(0, 2).toUpperCase()}
                </Avatar>
                <Typography sx={{ color: isDark ? '#e5e7eb' : '#0f172a', fontWeight: 900, fontSize: 15, lineHeight: 1.2, mt: 1.2, textAlign: 'center' }}>
                  {selected.customer_name || 'Customer'}
                </Typography>
                <Typography sx={{ color: isDark ? '#9ca3af' : '#64748b', fontSize: 12, mt: 0.6, textAlign: 'center' }}>
                  {selected.mobile_number ? `+${selected.mobile_number}` : ''}
                </Typography>
                <Typography sx={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 11, mt: 0.6, textAlign: 'center' }}>
                  {selected.email || 'via bot'}
                </Typography>
              </Box>
            ) : (
              <Typography sx={{ color: isDark ? '#9ca3af' : '#64748b' }}>Details</Typography>
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
                <LocationOnOutlinedIcon sx={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 18 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ color: isDark ? '#9ca3af' : '#64748b', fontSize: 12, fontWeight: 800 }}>Location</Typography>
                  <Typography sx={{ color: isDark ? '#e5e7eb' : '#0f172a', fontSize: 13, mt: 0.25 }}>
                    {selected?.bot_payload?.location || 'India'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
                <BusinessOutlinedIcon sx={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 18 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ color: isDark ? '#9ca3af' : '#64748b', fontSize: 12, fontWeight: 800 }}>Business</Typography>
                  <Typography sx={{ color: isDark ? '#e5e7eb' : '#0f172a', fontSize: 13, mt: 0.25 }}>
                    {selected?.bot_payload?.business || 'N/A'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
                <SourceOutlinedIcon sx={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 18 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ color: isDark ? '#9ca3af' : '#64748b', fontSize: 12, fontWeight: 800 }}>Source</Typography>
                  <Typography sx={{ color: isDark ? '#e5e7eb' : '#0f172a', fontSize: 13, mt: 0.25 }}>
                    {selected ? 'Natural Lead' : '—'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ borderTop: isDark ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid #e2e8f0', mt: 0.5 }} />
              <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
                <LocalPhoneOutlinedIcon sx={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 18 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ color: isDark ? '#9ca3af' : '#64748b', fontSize: 12, fontWeight: 800 }}>WhatsApp</Typography>
                  <Typography sx={{ color: isDark ? '#e5e7eb' : '#0f172a', fontSize: 13, mt: 0.25 }}>
                    {selected?.whatsapp_number ? `+${selected.whatsapp_number}` : 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Tags */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LabelOutlinedIcon sx={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 18 }} />
                <Typography sx={{ color: isDark ? '#9ca3af' : '#64748b', fontSize: 12, fontWeight: 900 }}>TAGS</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.25 }}>
                <Chip size="small" label="New User" sx={{ bgcolor: isDark ? 'rgba(14,165,233,0.18)' : '#e0f2fe', color: isDark ? '#e5e7eb' : '#0284c7', fontWeight: 700 }} />
                <Chip size="small" label="New Lead" sx={{ bgcolor: isDark ? 'rgba(239,68,68,0.16)' : '#fee2e2', color: isDark ? '#e5e7eb' : '#dc2626', fontWeight: 700 }} />
                <Chip size="small" label="+ Add" variant="outlined" sx={{ borderColor: isDark ? 'rgba(148,163,184,0.25)' : '#cbd5e1', color: isDark ? '#e5e7eb' : '#0f172a' }} />
              </Box>
            </Box>

            {/* Notes */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ borderTop: isDark ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid #e2e8f0', mb: 1.25 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <NotesOutlinedIcon sx={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 18 }} />
                <Typography sx={{ color: isDark ? '#9ca3af' : '#64748b', fontSize: 12, fontWeight: 900 }}>NOTES</Typography>
              </Box>
              <Box sx={{ mt: 1.25, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Typography sx={{ color: isDark ? '#e5e7eb' : '#0f172a', fontSize: 13 }}>Interested in premium plan</Typography>
                <Typography sx={{ color: isDark ? '#64748b' : '#64748b', fontSize: 12 }}>Follow up next week</Typography>
                <Typography sx={{ color: isDark ? '#94a3b8' : '#0ea5e9', fontSize: 12, cursor: 'pointer' }}>+ Add note</Typography>
              </Box>
              <Box sx={{ borderTop: isDark ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid #e2e8f0', mt: 1.25 }} />
            </Box>

            {/* Captured intents */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PsychologyOutlinedIcon sx={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 18 }} />
                <Typography sx={{ color: isDark ? '#9ca3af' : '#64748b', fontSize: 12, fontWeight: 900 }}>CAPTURED INTENTS</Typography>
              </Box>
              <Box sx={{ mt: 1.25, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Typography sx={{ color: isDark ? '#e5e7eb' : '#0f172a', fontSize: 13 }}>Pricing inquiry</Typography>
                <Typography sx={{ color: isDark ? '#e5e7eb' : '#0f172a', fontSize: 13 }}>Product detail</Typography>
              </Box>
              <Box sx={{ borderTop: isDark ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid #e2e8f0', mt: 1.25 }} />
            </Box>

            {/* Call history */}
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HistoryOutlinedIcon sx={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 18 }} />
                <Typography sx={{ color: isDark ? '#9ca3af' : '#64748b', fontSize: 12, fontWeight: 900 }}>CALL HISTORY</Typography>
              </Box>
              <Typography sx={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 12, mt: 1.25 }}>
                No recordings yet
              </Typography>
              <Box sx={{ borderTop: isDark ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid #e2e8f0', mt: 1.25 }} />
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

export default LiveChatSupport;

