import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
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
  CircularProgress,
  TablePagination,
  Drawer,
  Radio,
  RadioGroup,
  FormControlLabel,
  Chip,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import SendIcon from '@mui/icons-material/Send';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LaunchIcon from '@mui/icons-material/Launch';
import CallIcon from '@mui/icons-material/Call';
import CheckIcon from '@mui/icons-material/Check';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import ImageIcon from '@mui/icons-material/Image';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  fetchSellerLiveChatSupportSessions,
  patchLiveChatSupportSession,
  deleteLiveChatSupportSession,
  createManualPipelineLead,
} from '../../../api/liveChat';
import { fetchTeamMembers } from '../../../api/teamManagement';
import { fetchWhatsAppConfig, sendBulkWhatsAppTemplate, fetchWhatsAppTemplates, createWhatsAppCampaign } from '../../../api/whatsapp';
import { useAuth } from '../../../context/AuthContext';
import { useThemeContext } from '../../../context/ThemeContext';

// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000/api/';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.app.syntrrix.com/api/';

const resolveMediaUrl = (url) => {
  const raw = (url || '').toString().trim();
  if (!raw) return '';
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${raw.startsWith('/') ? raw : `/${raw}`}`;
};

const DEFAULT_PIPELINE_TABS = ['All Leads', 'New Leads', 'Contacted', 'Qualified', 'Won', 'Lost'];
const DEFAULT_PIPELINE_TAB_SET = new Set(DEFAULT_PIPELINE_TABS);
const DEFAULT_STATUS_OPTIONS = ['New Leads', 'Contacted', 'Qualified', 'Won', 'Lost'];
const DEFAULT_STATUS_OPTION_SET = new Set(DEFAULT_STATUS_OPTIONS);
const LEAD_PIPELINE_CUSTOM_TABS_STORAGE_KEY = 'lead_pipeline_custom_tabs';
/** Matches LiveChatSession.lead_pipeline_status max_length (backend). */
const MAX_PIPELINE_TAB_NAME_LEN = 40;

function loadCustomPipelineTabs(sellerKey = '') {
  try {
    const key = sellerKey ? `${LEAD_PIPELINE_CUSTOM_TABS_STORAGE_KEY}_${sellerKey}` : LEAD_PIPELINE_CUSTOM_TABS_STORAGE_KEY;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((s) => String(s).trim())
      .filter(
        (s) =>
          s.length > 0 &&
          s.length <= MAX_PIPELINE_TAB_NAME_LEN &&
          !DEFAULT_PIPELINE_TAB_SET.has(s),
      );
  } catch {
    return [];
  }
}

function resolveLeadPipelineStatus(session, localMetaRow, statusAllowList) {
  const list = statusAllowList?.length ? statusAllowList : DEFAULT_STATUS_OPTIONS;
  const server = String(session?.lead_pipeline_status || '').trim();
  if (server && list.includes(server)) return server;
  const localSt = String(localMetaRow?.status || '').trim();
  if (localSt && list.includes(localSt)) return localSt;
  const inferred = session.last_message_sender_type === 'seller' ? 'Contacted' : 'New Leads';
  return inferred;
}
const SOURCE_OPTIONS = ['Manual lead', 'Facebook', 'Website', 'WhatsApp', 'Instagram', 'Google'];
const LEAD_PIPELINE_META_STORAGE_KEY = 'lead_pipeline_meta_by_session';
const SELECT_TEAM_PLACEHOLDER = 'Please select team';
const SELECT_AGENT_PLACEHOLDER = 'Please select agent';

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

function formatCreated(rawIso) {
  if (!rawIso) return '—';
  const d = new Date(rawIso);
  if (Number.isNaN(d.getTime())) return String(rawIso);
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getTemplateHeaderType(tpl) {
  if (!tpl) return 'TEXT';
  const directType = String(
    tpl.header_type || tpl.header_format || tpl.type || tpl.header_media_type || tpl.headerType || ''
  ).toUpperCase();
  if (['IMAGE', 'VIDEO', 'DOCUMENT', 'TEXT', 'LOCATION'].includes(directType)) {
    return directType;
  }
  if (Array.isArray(tpl.components)) {
    const headerComp = tpl.components.find((c) => c && String(c.type || '').toUpperCase() === 'HEADER');
    if (headerComp) {
      const format = String(headerComp.format || headerComp.header_type || '').toUpperCase();
      if (['IMAGE', 'VIDEO', 'DOCUMENT', 'TEXT', 'LOCATION'].includes(format)) {
        return format;
      }
    }
  }
  const mediaStr = String(tpl.header_media || tpl.media_url || tpl.header_media_url || tpl.file || '').toLowerCase();
  if (mediaStr) {
    if (/\.(jpg|jpeg|png|gif|webp)($|\?)/i.test(mediaStr) || mediaStr.includes('image')) return 'IMAGE';
    if (/\.(mp4|mov|avi|webm)($|\?)/i.test(mediaStr) || mediaStr.includes('video')) return 'VIDEO';
    if (/\.(pdf|doc|docx|csv|txt)($|\?)/i.test(mediaStr) || mediaStr.includes('document')) return 'DOCUMENT';
  }
  const nameStr = String(tpl.name || tpl.header_text || '').toLowerCase();
  if (nameStr.includes('image') || nameStr.includes('img') || nameStr.includes('photo')) return 'IMAGE';
  if (nameStr.includes('video')) return 'VIDEO';
  if (nameStr.includes('pdf') || nameStr.includes('doc') || nameStr.includes('file')) return 'DOCUMENT';
  return 'TEXT';
}

function getAddressFromSession(session) {
  const payload = session?.bot_payload && typeof session.bot_payload === 'object' ? session.bot_payload : {};
  if (typeof session?.address === 'string' && session.address.trim()) return session.address.trim();
  const direct = [
    payload.address,
    payload.Address,
    payload.customer_address,
    payload.full_address,
    payload.shipping_address,
    payload.location,
  ].find((v) => typeof v === 'string' && v.trim());
  if (direct) return direct.trim();
  let listLike = payload.addresses_json || payload.address_json || payload.addresses;
  if (typeof listLike === 'string') {
    try {
      const parsed = JSON.parse(listLike);
      if (Array.isArray(parsed)) listLike = parsed;
    } catch {
      // keep as-is
    }
  }
  if (Array.isArray(listLike)) {
    const firstText = listLike.find((v) => typeof v === 'string' && v.trim());
    if (firstText) return firstText.trim();
    const firstObj = listLike.find((v) => v && typeof v === 'object');
    if (firstObj) {
      const parts = [firstObj.line1, firstObj.line2, firstObj.city, firstObj.state, firstObj.country]
        .filter((v) => typeof v === 'string' && v.trim());
      if (parts.length) return parts.join(', ');
    }
  }
  if (payload.address && typeof payload.address === 'object') {
    const obj = payload.address;
    const parts = [obj.line1, obj.line2, obj.city, obj.state, obj.country].filter((v) => typeof v === 'string' && v.trim());
    if (parts.length) return parts.join(', ');
  }
  return '';
}

function loadSavedLeadPipelineMeta(sellerKey = '') {
  try {
    const key = sellerKey ? `${LEAD_PIPELINE_META_STORAGE_KEY}_${sellerKey}` : LEAD_PIPELINE_META_STORAGE_KEY;
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function LeadPipeline() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark: isDarkTheme } = useThemeContext();
  const isSellerUser = user?.role?.id === 3;
  const isTeamPanelUser = user?.role?.id === 4 || user?.role?.id === 5;

  // Advanced Send WhatsApp Drawer State & Handlers
  const [whatsAppDrawerOpen, setWhatsAppDrawerOpen] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [useTemplate, setUseTemplate] = useState(true);
  const [languageCode, setLanguageCode] = useState('en_US');
  const [customText, setCustomText] = useState('Hello! 👋 This is a test message from Syntrrix chatbot integration.');
  const [sendOption, setSendOption] = useState('now');
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [templateList, setTemplateList] = useState([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState('order_confirmation');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [channelsList] = useState(['WhatsApp']);
  const [businessNumbersList, setBusinessNumbersList] = useState(['Syntrrix Main · +919000012345', 'Syntrrix Support · +919876543210']);
  const [selectedBusinessNumber, setSelectedBusinessNumber] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('All categories');
  const [templateLanguageFilter, setTemplateLanguageFilter] = useState('All languages');
  const [previewLeadIndex, setPreviewLeadIndex] = useState(0);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [varMappings, setVarMappings] = useState({
    'customer_name': { type: 'field', value: 'name' },
    'order_id': { type: 'field', value: 'order_number' },
    'amount': { type: 'field', value: 'amount' },
  });

  const defaultTemplates = useMemo(() => [
    {
      name: 'order_confirmation',
      header_text: 'Order Confirmation',
      category: 'UTILITY',
      language: 'English',
      status: 'Approved',
      date: 'Jul 28, 2026',
      body: 'Hello This is {{customer_name}} from {{company_name}}\nYour order {{order_id}} is confirmed.\nAmount {{amount}}\nThank You',
      buttons: [{ type: 'url', label: 'Track Order' }, { type: 'phone', label: 'Call Support' }]
    },
    {
      name: 'welcome_user',
      header_text: 'Welcome User',
      category: 'UTILITY',
      language: 'English',
      status: 'Approved',
      date: 'Jul 22, 2026',
      body: 'Hello {{customer_name}}, welcome to Syntrrix Business Platform! We are excited to have you on board.',
      buttons: []
    },
    {
      name: 'payment_reminder',
      header_text: 'Payment Reminder',
      category: 'UTILITY',
      language: 'English',
      status: 'Approved',
      date: 'Jul 19, 2026',
      body: 'Hi {{customer_name}}, gentle reminder regarding your pending invoice payment of {{amount}}.',
      buttons: []
    },
    {
      name: 'appointment_reminder',
      header_text: 'Appointment Reminder',
      category: 'UTILITY',
      language: 'English',
      status: 'Approved',
      date: 'Jul 15, 2026',
      body: 'Hello {{customer_name}}, your scheduled appointment is confirmed for {{order_id}}.',
      buttons: []
    },
    {
      name: 'promotional_offer',
      header_text: 'Promotional Offer',
      category: 'MARKETING',
      language: 'English',
      status: 'Approved',
      date: 'Jul 10, 2026',
      body: 'Exciting news {{customer_name}}! Get 20% off on your next order {{order_id}}.',
      buttons: []
    }
  ], []);

  useEffect(() => {
    if (whatsAppDrawerOpen) {
      fetchWhatsAppConfig()
        .then((res) => {
          if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
            const numbers = res.data.map((c) => `${c.channel_name || 'Syntrrix Main'} · ${c.phone_number || '+919000012345'}`);
            setBusinessNumbersList(numbers);
          }
        })
        .catch(() => { });

      fetchWhatsAppTemplates()
        .then((res) => {
          if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
            setTemplateList(res.data);
            if (!res.data.some((t) => t.name === selectedTemplateName)) {
              setSelectedTemplateName(res.data[0].name);
            }
          }
        })
        .catch(() => { });
    }
  }, [whatsAppDrawerOpen]);

  const filteredTemplatesList = useMemo(() => {
    const list = templateList.length > 0 ? templateList : defaultTemplates;
    return list.filter((t) => {
      // 1. Approval Status Check (Supports APPROVED, Approved, or seller templates)
      const statusUpper = String(t.status || 'APPROVED').toUpperCase();
      if (statusUpper !== 'APPROVED' && statusUpper !== 'PENDING' && statusUpper !== 'APPROVED_META') {
        return false;
      }

      // 2. Selected Business Number Matching Check:
      // Match phone digits or channel name, or pass if no specific channel attached to template
      if (selectedBusinessNumber && (t.phone_number || t.business_number || t.channel_name)) {
        const templatePhone = String(t.phone_number || t.business_number || '').replace(/\D+/g, '');
        const selectedPhone = String(selectedBusinessNumber).replace(/\D+/g, '');
        const templateChannel = String(t.channel_name || '').toLowerCase();
        const selectedChannelLower = String(selectedBusinessNumber).toLowerCase();

        if (templatePhone && selectedPhone) {
          if (!selectedBusinessNumber.includes(templatePhone) && !selectedPhone.includes(templatePhone)) {
            if (!templateChannel || !selectedChannelLower.includes(templateChannel)) {
              return false;
            }
          }
        }
      }

      // 3. Search Query Filter
      if (templateSearch.trim()) {
        const q = templateSearch.trim().toLowerCase();
        const block = `${t.header_text || ''} ${t.name || ''} ${t.category || ''}`.toLowerCase();
        if (!block.includes(q)) return false;
      }

      // 4. Category Filter
      if (templateCategoryFilter !== 'All categories') {
        if ((t.category || '').toUpperCase() !== templateCategoryFilter.toUpperCase()) return false;
      }

      // 5. Language Filter
      if (templateLanguageFilter !== 'All languages') {
        if ((t.language || '').toLowerCase() !== templateLanguageFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [templateList, defaultTemplates, selectedBusinessNumber, templateSearch, templateCategoryFilter, templateLanguageFilter]);

  // Keep selectedTemplateName synced with available approved templates
  useEffect(() => {
    if (filteredTemplatesList.length > 0) {
      if (!filteredTemplatesList.some((t) => t.name === selectedTemplateName)) {
        setSelectedTemplateName(filteredTemplatesList[0].name);
      }
    }
  }, [filteredTemplatesList, selectedTemplateName]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatSessions, setChatSessions] = useState([]);
  const [sellerAgents, setSellerAgents] = useState([]);
  const [sellerTeams, setSellerTeams] = useState([]);
  const [agentsByTeam, setAgentsByTeam] = useState({});
  const [teamPickerRows, setTeamPickerRows] = useState([]);
  const [agentsByTeamUserRows, setAgentsByTeamUserRows] = useState({});
  const [activeTab, setActiveTab] = useState('All Leads');
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState('All Agents');
  const [sourceFilter, setSourceFilter] = useState('All Sources');
  const [dateFilter, setDateFilter] = useState('');
  const sellerKey = user?.id || user?.user_id || user?.email || 'guest';
  const [selectedIds, setSelectedIds] = useState([]);
  const [metaBySession, setMetaBySession] = useState(() => loadSavedLeadPipelineMeta(sellerKey));
  const [bulkAgent, setBulkAgent] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [isDetailEditMode, setIsDetailEditMode] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addTabModalOpen, setAddTabModalOpen] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [addTabError, setAddTabError] = useState('');
  const [customPipelineTabs, setCustomPipelineTabs] = useState(() => loadCustomPipelineTabs(sellerKey));
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setPage(0);
  }, [activeTab, search, agentFilter, sourceFilter, dateFilter]);
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    source: 'Manual lead',
    team: '',
    agent: '',
    status: 'New Leads',
  });
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  const loadSessions = async () => {
    setLoading(true);
    setError('');
    try {
      const sessionsResp = await fetchSellerLiveChatSupportSessions({ forLeadPipeline: true });
      if (sessionsResp?.success && Array.isArray(sessionsResp.data)) {
        setChatSessions(dedupeSessionsByPhoneEmail(sessionsResp.data));
      } else {
        setChatSessions([]);
      }

      if (isSellerUser || isTeamPanelUser) {
        const membersResp = await fetchTeamMembers();
        const members = Array.isArray(membersResp?.data) ? membersResp.data : [];
        const managers = members.filter((m) => m?.member_type === 'team_manager');
        const managerLabelByUserId = managers.reduce((acc, manager) => {
          const managerUserId = Number(manager?.user_id);
          const label = String(manager?.full_name || '').trim();
          if (managerUserId && label) {
            acc[managerUserId] = label;
          }
          return acc;
        }, {});
        const teamNames = Object.values(managerLabelByUserId).filter(Boolean);

        const agents = members.filter((m) => m?.member_type === 'agent');
        const agentNames = agents
          .map((m) => String(m?.full_name || '').trim())
          .filter(Boolean);

        const groupedAgents = {};
        teamNames.forEach((tName) => {
          groupedAgents[tName] = [];
        });

        agents.forEach((agent) => {
          const agentName = String(agent?.full_name || '').trim();
          const managerId = Number(agent?.assigned_team_manager?.id);
          const teamLabel = managerLabelByUserId[managerId] || String(agent?.assigned_team_manager?.name || '').trim();
          if (!agentName || !teamLabel) return;
          if (!groupedAgents[teamLabel]) groupedAgents[teamLabel] = [];
          groupedAgents[teamLabel].push(agentName);
        });
        Object.keys(groupedAgents).forEach((team) => {
          groupedAgents[team] = Array.from(new Set(groupedAgents[team]));
        });

        setSellerAgents(Array.from(new Set(agentNames)));
        setSellerTeams(Array.from(new Set(teamNames)));
        setAgentsByTeam(groupedAgents);

        const teamRows = managers
          .map((m) => ({
            label: String(m?.full_name || '').trim(),
            userId: Number(m?.user_id),
          }))
          .filter((r) => r.label && Number.isFinite(r.userId));
        setTeamPickerRows(teamRows);

        const atUsers = {};
        Object.keys(groupedAgents).forEach((teamLabel) => {
          const names = groupedAgents[teamLabel] || [];
          atUsers[teamLabel] = names
            .map((agentName) => {
              const row = agents.find((a) => {
                const mId = Number(a?.assigned_team_manager?.id);
                const tLab =
                  managerLabelByUserId[mId] || String(a?.assigned_team_manager?.name || '').trim();
                return String(a?.full_name || '').trim() === agentName && tLab === teamLabel;
              });
              const uid = row ? Number(row.user_id) : NaN;
              return Number.isFinite(uid) ? { label: agentName, userId: uid } : null;
            })
            .filter(Boolean);
        });
        setAgentsByTeamUserRows(atUsers);
      } else {
        const sessions = Array.isArray(sessionsResp?.data) ? sessionsResp.data : [];
        const teamNames = sessions
          .map((s) => String(s?.assigned_team_manager_name || '').trim())
          .filter(Boolean);
        const agentNames = sessions
          .map((s) => String(s?.assigned_agent_name || '').trim())
          .filter(Boolean);
        const groupedAgents = sessions.reduce((acc, s) => {
          const teamLabel = String(s?.assigned_team_manager_name || '').trim();
          const agentName = String(s?.assigned_agent_name || '').trim();
          if (!teamLabel || !agentName) return acc;
          if (!acc[teamLabel]) acc[teamLabel] = [];
          acc[teamLabel].push(agentName);
          return acc;
        }, {});
        Object.keys(groupedAgents).forEach((team) => {
          groupedAgents[team] = Array.from(new Set(groupedAgents[team]));
        });
        setSellerAgents(Array.from(new Set(agentNames)));
        setSellerTeams(Array.from(new Set(teamNames)));
        setAgentsByTeam(groupedAgents);
        setTeamPickerRows([]);
        setAgentsByTeamUserRows({});
      }
    } catch (e) {
      setError(e?.message || 'Failed to load lead pipeline.');
      setChatSessions([]);
      setSellerAgents([]);
      setSellerTeams([]);
      setAgentsByTeam({});
      setTeamPickerRows([]);
      setAgentsByTeamUserRows({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  useEffect(() => {
    if (sellerKey) {
      setCustomPipelineTabs(loadCustomPipelineTabs(sellerKey));
      setMetaBySession(loadSavedLeadPipelineMeta(sellerKey));
    }
  }, [sellerKey]);

  useEffect(() => {
    try {
      const key = sellerKey ? `${LEAD_PIPELINE_META_STORAGE_KEY}_${sellerKey}` : LEAD_PIPELINE_META_STORAGE_KEY;
      localStorage.setItem(key, JSON.stringify(metaBySession));
    } catch {
      // Ignore storage write failures.
    }
  }, [metaBySession, sellerKey]);

  useEffect(() => {
    try {
      const key = sellerKey ? `${LEAD_PIPELINE_CUSTOM_TABS_STORAGE_KEY}_${sellerKey}` : LEAD_PIPELINE_CUSTOM_TABS_STORAGE_KEY;
      localStorage.setItem(key, JSON.stringify(customPipelineTabs));
    } catch {
      // Ignore storage write failures.
    }
  }, [customPipelineTabs, sellerKey]);

  const mergeSessionFromApiRow = (row) => {
    if (!row || row.session_id == null) return;
    const sid = String(row.session_id);
    setChatSessions((prev) => {
      const idx = prev.findIndex((s) => String(s.session_id) === sid);
      const merged = idx >= 0 ? { ...prev[idx], ...row } : row;
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = merged;
        return next;
      }
      return [...prev, merged];
    });
    setMetaBySession((prev) => {
      const ent = { ...(prev[sid] || {}) };
      delete ent.team;
      delete ent.agent;
      return { ...prev, [sid]: ent };
    });
  };

  const persistPipelineStatusForSession = async (sessionId, newStatus) => {
    try {
      const resp = await patchLiveChatSupportSession(sessionId, { lead_pipeline_status: newStatus });
      if (!resp?.success) throw new Error(resp?.message || 'Failed to save pipeline status.');
      mergeSessionFromApiRow(resp.data);
      const sidKey = String(sessionId);
      setMetaBySession((prev) => {
        const nextEntry = { ...(prev[sidKey] || {}) };
        delete nextEntry.status;
        return { ...prev, [sidKey]: nextEntry };
      });
    } catch (e) {
      const msg =
        typeof e?.response?.data?.message === 'string' ? e.response.data.message : null;
      setError(msg || e?.message || 'Failed to save pipeline status.');
    }
  };

  const agentOptions = useMemo(() => sellerAgents, [sellerAgents]);
  const teamOptions = useMemo(() => sellerTeams, [sellerTeams]);
  const getAgentsForTeam = (team) => {
    const label = String(team || '').trim();
    if (!label) return agentOptions;
    return agentsByTeam[label] || [];
  };
  const getAgentRowsForTeam = (teamLabel) => {
    const label = String(teamLabel || '').trim();
    if (!label) return sellerAgents.map((name) => ({ label: name, userId: null }));
    const rows = agentsByTeamUserRows[label];
    if (Array.isArray(rows)) return rows;
    return (agentsByTeam[label] || []).map((name) => ({ label: name, userId: null }));
  };
  const teamSelectValue = (lead) => {
    if (lead.assigned_team_manager_id) return String(lead.assigned_team_manager_id);
    const match = teamPickerRows.find((t) => t.label === lead.team);
    return match ? String(match.userId) : lead.team || '';
  };
  const agentSelectValue = (lead) => {
    const rows = getAgentRowsForTeam(lead.team);
    if (lead.assigned_agent_id) {
      const hit = rows.find((r) => Number(r.userId) === Number(lead.assigned_agent_id));
      if (hit?.userId) return String(hit.userId);
    }
    const byName = rows.find((r) => r.label === lead.agent);
    if (byName?.userId) return String(byName.userId);
    return lead.agent || '';
  };

  const confirmTeamOrAgentChange = async (kind) => {
    const res = await Swal.fire({
      title: kind === 'team' ? 'Change team?' : 'Change agent?',
      text:
        kind === 'team'
          ? 'Are you sure you want to change the team? The agent may be updated to match.'
          : 'Are you sure you want to change the assigned agent?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'OK',
      cancelButtonText: 'Cancel',
      confirmButtonColor: isDarkTheme ? '#0ea5e9' : '#4f46e5',
    });
    return Boolean(res.isConfirmed);
  };

  const handleLeadTeamChange = async (lead, e) => {
    setError('');
    if (!isSellerUser) {
      setError('Only sellers can change the Team Manager.');
      return;
    }
    const v = e.target.value;
    if (String(v) === String(teamSelectValue(lead))) return;
    if (!(await confirmTeamOrAgentChange('team'))) return;
    try {
      if (teamPickerRows.length) {
        if (!v) {
          const resp = await patchLiveChatSupportSession(lead.session_id, {
            assigned_team_manager_user_id: null,
            assigned_agent_user_id: null,
          });
          if (!resp?.success) throw new Error(resp?.message || 'Failed to update team.');
          mergeSessionFromApiRow(resp.data);
          return;
        }
        const tmId = Number(v);
        const row = teamPickerRows.find((t) => String(t.userId) === v);
        const teamLabel = row?.label || '';
        const scoped = getAgentRowsForTeam(teamLabel);
        const withUid = scoped.filter((x) => x.userId);
        const keep = withUid.find((x) => Number(x.userId) === Number(lead.assigned_agent_id));
        const agentId = keep?.userId ?? withUid[0]?.userId ?? null;
        const resp = await patchLiveChatSupportSession(lead.session_id, {
          assigned_team_manager_user_id: tmId,
          assigned_agent_user_id: agentId,
        });
        if (!resp?.success) throw new Error(resp?.message || 'Failed to update team.');
        mergeSessionFromApiRow(resp.data);
      } else {
        if (!v) {
          const resp = await patchLiveChatSupportSession(lead.session_id, {
            assigned_team_manager_name: '',
            assigned_agent_name: '',
          });
          if (!resp?.success) throw new Error(resp?.message || 'Failed to update team.');
          mergeSessionFromApiRow(resp.data);
          return;
        }
        const scopedNames = getAgentsForTeam(v);
        const nextAgent = scopedNames.includes(lead.agent) ? lead.agent : scopedNames[0] || '';
        const resp = await patchLiveChatSupportSession(lead.session_id, {
          assigned_team_manager_name: v,
          assigned_agent_name: nextAgent,
        });
        if (!resp?.success) throw new Error(resp?.message || 'Failed to update team.');
        mergeSessionFromApiRow(resp.data);
      }
    } catch (err) {
      const msg =
        typeof err?.response?.data?.message === 'string' ? err.response.data.message : null;
      setError(msg || err?.message || 'Failed to update team.');
    }
  };

  const handleLeadAgentChange = async (lead, e) => {
    setError('');
    if (!isSellerUser) {
      setError('Only sellers can change the assigned Agent.');
      return;
    }
    const v = e.target.value;
    if (String(v) === String(agentSelectValue(lead))) return;
    if (!(await confirmTeamOrAgentChange('agent'))) return;
    try {
      if (!v) {
        let resp;
        if (teamPickerRows.length) {
          const tmUid = lead.assigned_team_manager_id;
          resp = await patchLiveChatSupportSession(lead.session_id, {
            assigned_agent_user_id: null,
            ...(tmUid ? { assigned_team_manager_user_id: tmUid } : {}),
          });
        } else {
          resp = await patchLiveChatSupportSession(lead.session_id, {
            assigned_team_manager_name: lead.team || '',
            assigned_agent_name: '',
          });
        }
        if (!resp?.success) throw new Error(resp?.message || 'Failed to update agent.');
        mergeSessionFromApiRow(resp.data);
        window.location.reload();
        return;
      }
      if (teamPickerRows.length && /^\d+$/.test(String(v))) {
        const resp = await patchLiveChatSupportSession(lead.session_id, {
          assigned_agent_user_id: Number(v),
        });
        if (!resp?.success) throw new Error(resp?.message || 'Failed to update agent.');
        mergeSessionFromApiRow(resp.data);
        window.location.reload();
        return;
      }
      const resp = await patchLiveChatSupportSession(lead.session_id, {
        assigned_team_manager_name: lead.team || '',
        assigned_agent_name: v,
      });
      if (!resp?.success) throw new Error(resp?.message || 'Failed to update agent.');
      mergeSessionFromApiRow(resp.data);
      window.location.reload();
    } catch (err) {
      const msg =
        typeof err?.response?.data?.message === 'string' ? err.response.data.message : null;
      setError(msg || err?.message || 'Failed to update agent.');
    }
  };
  const defaultAgentName = agentOptions[0] || '';
  const defaultTeamName = teamOptions[0] || '';

  const bulkAgentOptions = useMemo(() => {
    const out = [];
    const seenValue = new Set();
    const seenLabel = new Set();

    const push = (val, label) => {
      const vStr = String(val || '').trim();
      const lStr = String(label || '').trim();
      if (!vStr || !lStr) return;
      if (seenValue.has(vStr) || seenLabel.has(lStr.toLowerCase())) return;
      seenValue.add(vStr);
      seenLabel.add(lStr.toLowerCase());
      out.push({ value: vStr, label: lStr });
    };

    Object.values(agentsByTeamUserRows)
      .flat()
      .forEach((r) => {
        if (r?.userId && r?.label) {
          push(String(r.userId), r.label);
        }
      });

    agentOptions.forEach((a) => {
      push(a, a);
    });

    return out;
  }, [agentsByTeamUserRows, agentOptions]);

  const pipelineTabs = useMemo(
    () => [...DEFAULT_PIPELINE_TABS, ...customPipelineTabs.filter((t) => !DEFAULT_PIPELINE_TAB_SET.has(t))],
    [customPipelineTabs],
  );

  const statusOptions = useMemo(
    () => [...DEFAULT_STATUS_OPTIONS, ...customPipelineTabs.filter((t) => !DEFAULT_STATUS_OPTION_SET.has(t))],
    [customPipelineTabs],
  );

  const pipelineLeads = useMemo(() => {
    return chatSessions.map((session) => {
      const sessionId = String(session.session_id);
      const local = metaBySession[sessionId] || {};
      const payload = session.bot_payload && typeof session.bot_payload === 'object' ? session.bot_payload : {};
      return {
        session_id: session.session_id,
        customer_id: session.customer_id,
        id: `LC-${String(session.session_id).padStart(6, '0')}`,
        createdAt: formatCreated(session.created_at),
        createdDateOnly: session.created_at ? new Date(session.created_at).toISOString().slice(0, 10) : '',
        name: (() => {
          const n = local.name || session.customer_name || '';
          if (n === 'Customer' || n.startsWith('WA Customer')) return '';
          return n;
        })(),
        phone: local.phone || session.mobile_number || '',
        email: (() => {
          const e = local.email || session.email || '';
          return e.includes('@whatsapp.agrobridge') ? '' : e;
        })(),
        address: local.address || getAddressFromSession(session),
        team: local.team || session.assigned_team_manager_name || '',
        agent: local.agent || session.assigned_agent_name || '',
        status: resolveLeadPipelineStatus(session, local, statusOptions),
        source: (() => {
          if (session.is_manual_pipeline_lead) return 'Manual lead';
          if (typeof payload.lead_source === 'string' && payload.lead_source.trim()) {
            return payload.lead_source.trim();
          }
          if (session.whatsapp_number || session.session_id_whatsapp || String(session.session_id || '').toLowerCase().includes('wa')) {
            return 'WhatsApp';
          }
          return 'Website';
        })(),
        company: local.company || (payload.company || payload.business || ''),
        cityState: local.cityState || (payload.city_state || payload.city || ''),
        country: local.country || (payload.country || ''),
        assigned_team_manager_id: session.assigned_team_manager_id ?? null,
        assigned_agent_id: session.assigned_agent_id ?? null,
      };
    });
  }, [chatSessions, metaBySession, statusOptions]);

  const selectedLeadsList = useMemo(() => {
    return pipelineLeads.filter((l) => selectedIds.includes(l.id));
  }, [pipelineLeads, selectedIds]);

  const activeTemplateObj = useMemo(() => {
    return templateList.find((t) => t.name === selectedTemplateName) || {
      name: 'order_confirmation',
      header_text: 'Order Confirmed',
      body: 'Hello This is {{customer_name}} from {{company_name}}\nYour order {{order_id}} is confirmed.\nAmount {{amount}}\nThank You',
      buttons: [{ type: 'url', label: 'Track Order' }, { type: 'phone', label: 'Call Support' }]
    };
  }, [templateList, selectedTemplateName]);

  const extractedVariables = useMemo(() => {
    const text = activeTemplateObj?.body || '';
    const matches = text.match(/\{\{([^}]+)\}\}/g) || [];
    return Array.from(new Set(matches));
  }, [activeTemplateObj]);

  const currentPreviewLead = useMemo(() => {
    if (selectedLeadsList.length > 0 && previewLeadIndex < selectedLeadsList.length) {
      return selectedLeadsList[previewLeadIndex];
    }
    return {
      name: 'Swati from Khyatishield Ventures Pvt Ltd',
      phone: '919220142277',
      order_number: 'ORD-70091',
      amount: '12,499',
      company_name: 'Khyatishield Ventures Pvt Ltd',
      email: 'swati@khyatishield.com',
    };
  }, [selectedLeadsList, previewLeadIndex]);

  const renderedBubbleBody = useMemo(() => {
    let raw = activeTemplateObj?.body || 'Hello {{customer_name}}, your order {{order_id}} is confirmed.';
    extractedVariables.forEach((varKey) => {
      const cleanKey = varKey.replace(/[\{\}]/g, '').trim();
      const mapping = varMappings[cleanKey] || varMappings[varKey] || { type: 'field', value: 'name' };

      let replacedVal = '';
      if (mapping.type === 'custom') {
        replacedVal = mapping.value || '';
      } else {
        const fieldKey = mapping.value || 'name';
        if (fieldKey === 'name') replacedVal = currentPreviewLead.name || '';
        else if (fieldKey === 'phone') replacedVal = currentPreviewLead.phone || '';
        else if (fieldKey === 'email') replacedVal = currentPreviewLead.email || '';
        else if (fieldKey === 'address') replacedVal = currentPreviewLead.address || '';
        else if (fieldKey === 'team') replacedVal = currentPreviewLead.team || '';
        else if (fieldKey === 'agent') replacedVal = currentPreviewLead.agent || '';
        else if (fieldKey === 'status') replacedVal = currentPreviewLead.status || '';
        else if (fieldKey === 'source') replacedVal = currentPreviewLead.source || '';
        else if (fieldKey === 'company') replacedVal = currentPreviewLead.company || '';
        else if (fieldKey === 'cityState') replacedVal = currentPreviewLead.cityState || '';
        else if (fieldKey === 'country') replacedVal = currentPreviewLead.country || '';
        else if (fieldKey === 'id') replacedVal = currentPreviewLead.id || '';
        else if (fieldKey === 'createdAt') replacedVal = currentPreviewLead.createdAt || '';
        else replacedVal = currentPreviewLead[fieldKey] || `[${cleanKey}]`;
      }
      raw = raw.replace(new RegExp(varKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacedVal);
    });
    return raw;
  }, [activeTemplateObj, extractedVariables, varMappings, currentPreviewLead]);

  const handleVarMappingChange = (varKey, aspect, value) => {
    const cleanKey = varKey.replace(/[\{\}]/g, '').trim();
    setVarMappings((prev) => ({
      ...prev,
      [cleanKey]: {
        ...prev[cleanKey],
        [aspect]: value,
      },
    }));
  };

  const triggerBulkWhatsAppCampaign = async () => {
    const selectedLeads = pipelineLeads.filter((lead) => selectedIds.includes(lead.id));
    if (!selectedLeads.length) {
      void Swal.fire({ icon: 'warning', title: 'No leads selected', confirmButtonColor: isDarkTheme ? '#0ea5e9' : '#4f46e5' });
      return;
    }

    if (!campaignName.trim()) {
      void Swal.fire({
        icon: 'warning',
        title: 'Campaign Name Required',
        text: 'Please enter a Campaign Name before sending.',
        confirmButtonColor: isDarkTheme ? '#0ea5e9' : '#4f46e5',
      });
      return;
    }

    if (sendOption === 'schedule') {
      if (!scheduledDateTime) {
        void Swal.fire({
          icon: 'warning',
          title: 'Scheduled Date & Time Required',
          text: 'Please select a Date and Time for the scheduled campaign.',
          confirmButtonColor: isDarkTheme ? '#0ea5e9' : '#4f46e5',
        });
        return;
      }
      const selectedTimeMs = new Date(scheduledDateTime).getTime();
      if (Number.isNaN(selectedTimeMs) || selectedTimeMs <= Date.now()) {
        void Swal.fire({
          icon: 'warning',
          title: 'Invalid Date & Time',
          text: 'Scheduled Date & Time must be in the future.',
          confirmButtonColor: isDarkTheme ? '#0ea5e9' : '#4f46e5',
        });
        return;
      }
    }

    const isScheduled = sendOption === 'schedule' && scheduledDateTime;
    const formattedScheduledTime = isScheduled
      ? new Date(scheduledDateTime).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
      : '';

    const actualTemplateName = activeTemplateObj?.name || selectedTemplateName;
    const actualLangCode = activeTemplateObj?.language || languageCode || 'en_US';

    // Format varMappings dictionary: { "1": "name", "2": "email" } or { "1": "Custom Value" }
    const formattedVarMapping = {};
    if (varMappings && typeof varMappings === 'object') {
      Object.entries(varMappings).forEach(([vk, mapping]) => {
        const cleanKey = vk.replace(/[\{\}]/g, '').trim();
        if (mapping && typeof mapping === 'object') {
          if (mapping.type === 'custom') {
            formattedVarMapping[cleanKey] = mapping.value || `Sample ${cleanKey}`;
          } else {
            formattedVarMapping[cleanKey] = mapping.value || 'name';
          }
        } else if (typeof mapping === 'string') {
          formattedVarMapping[cleanKey] = mapping;
        }
      });
    }

    const recipientsPayload = selectedLeads.map((l) => ({
      phone: String(l.phone || '').replace(/\D+/g, ''),
      name: l.name || 'Recipient',
      email: l.email || '',
      address: l.address || '',
      status: l.status || '',
      agent: l.agent || '',
      team: l.team || '',
      source: l.source || '',
      company: l.company || '',
      cityState: l.cityState || '',
      country: l.country || '',
      id: String(l.id || ''),
      createdAt: l.createdAt || '',
    }));

    const targetLeadCount = recipientsPayload.length;
    const dispatchedTitle = campaignName.trim();

    // Close drawer immediately without buffering!
    setIsSendingWhatsApp(false);
    setWhatsAppDrawerOpen(false);
    setSelectedIds([]);

    if (isScheduled) {
      Swal.fire({
        icon: 'success',
        title: 'Campaign Scheduled Successfully!',
        text: `Campaign "${dispatchedTitle}" is scheduled for ${formattedScheduledTime} for ${targetLeadCount} leads.`,
        timer: 4000,
        showConfirmButton: false,
        background: '#090d16',
        color: '#ffffff',
      });
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Campaign Bulk Dispatch Started!',
        text: `Campaign "${dispatchedTitle}" initiated for ${targetLeadCount} leads. Status: Running in background.`,
        timer: 3500,
        showConfirmButton: false,
        background: '#090d16',
        color: '#ffffff',
      });
    }

    const resolvedConfigId = activeTemplateObj?.whatsapp_config_id || activeTemplateObj?.config_id || null;

    // Fire backend API asynchronously
    try {
      await sendBulkWhatsAppTemplate({
        campaign_title: dispatchedTitle,
        title: dispatchedTitle,
        subtitle: `Lead Pipeline · ${actualTemplateName}`,
        author: 'By you (Lead Pipeline)',
        template_name: actualTemplateName,
        language_code: actualLangCode,
        use_template: useTemplate,
        custom_text: customText,
        var_mapping: formattedVarMapping,
        recipients: recipientsPayload,
        business_number: selectedBusinessNumber || '',
        channel_name: selectedChannel || '',
        config_id: resolvedConfigId,
        whatsapp_config_id: resolvedConfigId,
        send_option: sendOption,
        scheduled_at: isScheduled ? scheduledDateTime : null,
      });
    } catch (apiErr) {
      console.error('Failed to trigger background campaign dispatch:', apiErr);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const filteredLeads = useMemo(() => {
    return pipelineLeads.filter((lead) => {
      if (activeTab !== 'All Leads' && lead.status !== activeTab) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const block = `${lead.id} ${lead.name} ${lead.phone} ${lead.email} ${lead.address}`.toLowerCase();
        if (!block.includes(q)) return false;
      }
      if (agentFilter !== 'All Agents' && lead.agent !== agentFilter) return false;
      if (sourceFilter !== 'All Sources' && lead.source !== sourceFilter) return false;
      if (dateFilter && lead.createdDateOnly !== dateFilter) return false;
      return true;
    });
  }, [activeTab, agentFilter, dateFilter, pipelineLeads, search, sourceFilter]);

  const counts = useMemo(() => {
    return pipelineTabs.reduce((acc, tab) => {
      acc[tab] = tab === 'All Leads' ? pipelineLeads.length : pipelineLeads.filter((lead) => lead.status === tab).length;
      return acc;
    }, {});
  }, [pipelineLeads, pipelineTabs]);

  const toggleSelectRow = (rowId, checked) => {
    setSelectedIds((prev) => (checked ? Array.from(new Set([...prev, rowId])) : prev.filter((id) => id !== rowId)));
  };

  const paginatedLeads = useMemo(() => {
    return filteredLeads.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredLeads, page, rowsPerPage]);

  const allSelected = filteredLeads.length > 0 && filteredLeads.every((r) => selectedIds.includes(r.id));
  const isSomeSelected = filteredLeads.some((r) => selectedIds.includes(r.id)) && !allSelected;

  const applyBulkAgent = async () => {
    if (!isSellerUser) {
      setError('Only sellers can change the assigned Agent.');
      return;
    }
    if (!bulkAgent || selectedIds.length === 0) return;
    setError('');
    const hits = pipelineLeads.filter((lead) => selectedIds.includes(lead.id));
    const raw = bulkAgent;
    const isUid = /^\d+$/.test(String(raw));
    try {
      for (const lead of hits) {
        let resp;
        if (isUid && isSellerUser) {
          resp = await patchLiveChatSupportSession(lead.session_id, { assigned_agent_user_id: Number(raw) });
        } else {
          resp = await patchLiveChatSupportSession(lead.session_id, {
            assigned_team_manager_name: lead.team || '',
            assigned_agent_name: raw,
          });
        }
        if (!resp?.success) throw new Error(resp?.message || 'Bulk assign failed.');
        mergeSessionFromApiRow(resp.data);
      }
      setBulkAgent('');
    } catch (e) {
      setError(e?.message || 'Bulk assign failed.');
    }
  };

  const applyBulkStatus = async () => {
    if (!bulkStatus || selectedIds.length === 0) return;
    const statusToApply = bulkStatus;
    setBulkStatus('');
    const hits = pipelineLeads.filter((lead) => selectedIds.includes(lead.id));
    try {
      for (const lead of hits) {
        const r = await patchLiveChatSupportSession(lead.session_id, { lead_pipeline_status: statusToApply });
        if (!r?.success) throw new Error(r?.message || 'Bulk status save failed.');
        mergeSessionFromApiRow(r.data);
      }
      setMetaBySession((prev) => {
        let next = { ...prev };
        hits.forEach((lead) => {
          const sid = String(lead.session_id);
          const ent = { ...(next[sid] || {}) };
          delete ent.status;
          next[sid] = ent;
        });
        return next;
      });
    } catch (e) {
      const msg =
        typeof e?.response?.data?.message === 'string' ? e.response.data.message : null;
      setError(msg || e?.message || 'Bulk status save failed.');
    }
  };

  const deleteLeadBySessionId = async (sessionId) => {
    const sid = String(sessionId);
    const rowId = `LC-${sid.padStart(6, '0')}`;
    const resp = await deleteLiveChatSupportSession(sid);
    if (!resp?.success) throw new Error(resp?.message || 'Delete failed');
    setChatSessions((prev) => prev.filter((s) => String(s.session_id) !== sid));
    setMetaBySession((prev) => {
      if (!(sid in prev)) return prev;
      const next = { ...prev };
      delete next[sid];
      return next;
    });
    setSelectedIds((prev) => prev.filter((id) => id !== rowId));
    setSelectedLeadId((cur) => (cur === rowId ? '' : cur));
  };

  const confirmDeleteOneLead = async (lead) => {
    setError('');
    const res = await Swal.fire({
      title: 'Delete this lead?',
      text: 'The live chat session will be removed from the pipeline. This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
    });
    if (!res.isConfirmed) return;
    try {
      await deleteLeadBySessionId(lead.session_id);
      await Swal.fire({
        icon: 'success',
        title: 'Lead deleted',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (e) {
      setError(e?.message || 'Failed to delete lead.');
    }
  };

  const confirmDeleteBulkLeads = async () => {
    if (selectedIds.length === 0) return;
    setError('');
    const hits = pipelineLeads.filter((lead) => selectedIds.includes(lead.id));
    if (hits.length === 0) return;
    const res = await Swal.fire({
      title: `Delete ${hits.length} lead(s)?`,
      text: 'Selected live chat sessions will be removed. This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete all',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
    });
    if (!res.isConfirmed) return;
    try {
      await hits.reduce(
        (p, lead) => p.then(() => deleteLeadBySessionId(lead.session_id)),
        Promise.resolve(),
      );
      setSelectedIds([]);
      await Swal.fire({
        icon: 'success',
        title: 'Leads deleted',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (e) {
      setError(e?.message || 'Bulk delete failed.');
    }
  };

  const selectedLead = useMemo(() => filteredLeads.find((lead) => lead.id === selectedLeadId) || null, [filteredLeads, selectedLeadId]);

  const updateLeadField = (lead, key, value) => {
    const sid = String(lead.session_id);
    setMetaBySession((prev) => ({
      ...prev,
      [sid]: {
        ...(prev[sid] || {}),
        [key]: value,
      },
    }));
  };

  const handleAddLeadSubmit = async () => {
    const name = newLead.name.trim();
    const phone = newLead.phone.trim();
    if (!name || !phone) {
      setError('Name and phone are required.');
      return;
    }
    setError('');
    setIsSubmittingLead(true);
    try {
      const resp = await createManualPipelineLead({
        name,
        phone,
        email: newLead.email.trim(),
        address: newLead.address.trim(),
        source: newLead.source,
        team: newLead.team,
        agent: newLead.agent,
        status: newLead.status,
      });
      if (!resp?.success) throw new Error(resp?.message || 'Failed to create lead');
      setAddOpen(false);
      setNewLead({
        name: '',
        phone: '',
        email: '',
        address: '',
        source: 'Manual lead',
        team: '',
        agent: '',
        status: 'New Leads',
      });
      await loadSessions();
      await Swal.fire({
        icon: 'success',
        title: 'Lead created',
        timer: 1800,
        showConfirmButton: false,
        confirmButtonColor: isDarkTheme ? '#0ea5e9' : '#4f46e5',
      });
    } catch (e) {
      setError(e?.message || 'Failed to create lead.');
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const handleSaveNewTab = async () => {
    const name = newTabName.trim();
    if (!name) {
      setAddTabError('Tab name is required.');
      return;
    }
    if (name.length > MAX_PIPELINE_TAB_NAME_LEN) {
      setAddTabError(`Tab name must be at most ${MAX_PIPELINE_TAB_NAME_LEN} characters.`);
      return;
    }
    const tabSet = new Set(pipelineTabs);
    if (tabSet.has(name)) {
      setAddTabError('This tab name already exists.');
      return;
    }
    setCustomPipelineTabs((prev) => [...prev, name]);
    setAddTabModalOpen(false);
    setNewTabName('');
    setAddTabError('');
    setActiveTab(name);
    await Swal.fire({
      icon: 'success',
      title: 'Tab added successfully',
      confirmButtonColor: isDarkTheme ? '#0ea5e9' : '#4f46e5',
    });
  };

  const confirmDeleteTab = async (tabToDelete) => {
    if (!tabToDelete || !customPipelineTabs.includes(tabToDelete)) return;

    const res = await Swal.fire({
      title: 'Delete tab?',
      text: `Are you sure you want to delete '${tabToDelete}' tab? All leads in this tab will be moved to 'New Leads'.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      background: isDarkTheme ? '#090d16' : '#ffffff',
      color: isDarkTheme ? '#f8fafc' : '#111827',
    });

    if (!res.isConfirmed) return;

    try {
      const affectedSessions = chatSessions.filter(
        (s) =>
          String(s.lead_pipeline_status || '').trim() === tabToDelete ||
          String(metaBySession[String(s.session_id)]?.status || '').trim() === tabToDelete
      );

      for (const s of affectedSessions) {
        try {
          await patchLiveChatSupportSession(s.session_id, { lead_pipeline_status: 'New Leads' });
          updateLeadField({ session_id: s.session_id }, 'status', 'New Leads');
        } catch (e) {
          console.error('Failed to update session status on tab delete:', e);
        }
      }

      setCustomPipelineTabs((prev) => prev.filter((t) => t !== tabToDelete));

      if (activeTab === tabToDelete) {
        setActiveTab('New Leads');
      }

      await loadSessions();

      Swal.fire({
        icon: 'success',
        title: 'Tab Deleted',
        text: `Tab '${tabToDelete}' deleted successfully. Leads moved to 'New Leads'.`,
        timer: 2000,
        showConfirmButton: false,
        background: isDarkTheme ? '#090d16' : '#ffffff',
        color: isDarkTheme ? '#f8fafc' : '#111827',
      });
    } catch (err) {
      console.error('Error deleting tab:', err);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete') {
        const activeEl = document.activeElement;
        const isInput =
          activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.isContentEditable);
        if (!isInput && customPipelineTabs.includes(activeTab)) {
          e.preventDefault();
          void confirmDeleteTab(activeTab);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, customPipelineTabs, isDarkTheme, chatSessions, metaBySession]);

  const loadSheetJSLibrary = () => {
    return new Promise((resolve) => {
      if (window.XLSX) return resolve(window.XLSX);
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.onload = () => resolve(window.XLSX);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  };

  const handleExportExcel = async () => {
    const targetLeads = selectedIds.length > 0
      ? pipelineLeads.filter((lead) => selectedIds.includes(lead.id))
      : filteredLeads;

    if (!targetLeads || targetLeads.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Leads to Export',
        text: 'There are no leads available to export.',
        background: isDarkTheme ? '#090d16' : '#ffffff',
        color: isDarkTheme ? '#f8fafc' : '#111827',
      });
      return;
    }

    try {
      const XLSX = await loadSheetJSLibrary();
      const rowsToExport = targetLeads.map((lead) => ({
        'Lead ID': lead.id || '',
        'Created Date': lead.createdAt || '',
        'Name': lead.name || '',
        'Phone': lead.phone || '',
        'Email': lead.email || '',
        'Address': lead.address || '',
        'Team': lead.team || '',
        'Agent': lead.agent || '',
        'Status': lead.status || '',
        'Source': lead.source || '',
        'Company': lead.company || '',
        'City / State': lead.cityState || '',
        'Country': lead.country || '',
      }));

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `lead_pipeline_export_${dateStr}.xlsx`;

      if (XLSX) {
        const worksheet = XLSX.utils.json_to_sheet(rowsToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Lead Pipeline');
        XLSX.writeFile(workbook, fileName);
      } else {
        const headers = Object.keys(rowsToExport[0]);
        const csvRows = [headers.join(',')];
        rowsToExport.forEach((row) => {
          const values = headers.map((h) => {
            const val = String(row[h] || '').replace(/"/g, '""');
            return `"${val}"`;
          });
          csvRows.push(values.join(','));
        });
        const csvContent = '\uFEFF' + csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `lead_pipeline_export_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      Swal.fire({
        icon: 'success',
        title: 'Excel Export Completed!',
        text: `Exported ${targetLeads.length} leads successfully with exact character encoding.`,
        timer: 2200,
        showConfirmButton: false,
        background: isDarkTheme ? '#090d16' : '#ffffff',
        color: isDarkTheme ? '#f8fafc' : '#111827',
      });
    } catch (err) {
      console.error('Export excel error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Export Failed',
        text: 'Failed to export Excel file. Please try again.',
        background: isDarkTheme ? '#090d16' : '#ffffff',
        color: isDarkTheme ? '#f8fafc' : '#111827',
      });
    }
  };

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        bgcolor: isDarkTheme ? '#020617' : '#f3f4f6',
        p: { xs: 1.5, md: 2.5 },
      }}
    >
      <Paper
        sx={{
          borderRadius: 3,
          p: { xs: 1.2, md: 2 },
          border: isDarkTheme ? '1px solid rgba(148,163,184,0.25)' : '1px solid #e5e7eb',
          boxShadow: isDarkTheme ? 'none' : '0 8px 25px rgba(15,23,42,0.05)',
          bgcolor: isDarkTheme ? '#0f172a' : '#ffffff',
          ...(isDarkTheme
            ? {
              color: '#e5e7eb',
              '& .MuiTypography-root': { color: '#e5e7eb' },
              '& .MuiTableCell-root': { color: '#e5e7eb', borderColor: 'rgba(148,163,184,0.22)' },
              '& .MuiInputBase-input': { color: '#e5e7eb' },
              '& .MuiInputLabel-root': { color: '#cbd5e1' },
              '& .MuiSvgIcon-root': { color: '#cbd5e1' },
              '& .MuiSelect-select': { color: '#e5e7eb' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.35)' },
              '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.5)' },
              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#38bdf8' },
            }
            : {}),
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: isDarkTheme ? '#e5e7eb' : '#111827' }}>Lead Pipeline</Typography>
            <Typography sx={{ fontSize: 12, color: isDarkTheme ? '#94a3b8' : '#6b7280' }}>
              Live chat sessions and leads you add with &quot;Add Lead&quot; appear here. Manual-only leads stay off the Live Chat inbox list.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setAddOpen(true)} variant="contained" startIcon={<AddIcon />} sx={{ textTransform: 'none', bgcolor: isDarkTheme ? '#0ea5e9' : '#4f46e5', borderRadius: 999, px: 2.2 }}>
              Add Lead
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mb: 1.6, flexWrap: 'wrap' }}>
          {pipelineTabs.map((tab) => {
            const active = tab === activeTab;
            return (
              <Button
                key={tab}
                size="small"
                onClick={() => setActiveTab(tab)}
                sx={{
                  textTransform: 'none',
                  borderRadius: 999,
                  px: 1.4,
                  border: isDarkTheme ? '1px solid rgba(148,163,184,0.25)' : '1px solid #e5e7eb',
                  bgcolor: active ? (isDarkTheme ? '#0ea5e9' : '#4f46e5') : (isDarkTheme ? '#0f172a' : '#ffffff'),
                  color: active ? '#ffffff' : (isDarkTheme ? '#e5e7eb' : '#111827'),
                  fontWeight: 600,
                }}
              >
                {tab}
                <Box component="span" sx={{ ml: 0.7, px: 0.75, borderRadius: 999, fontSize: 11, bgcolor: active ? 'rgba(255,255,255,0.18)' : (isDarkTheme ? 'rgba(148,163,184,0.2)' : '#f3f4f6') }}>
                  {counts[tab]}
                </Box>
                {customPipelineTabs.includes(tab) ? (
                  <Box
                    component="span"
                    role="button"
                    title={`Delete ${tab} tab`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void confirmDeleteTab(tab);
                    }}
                    sx={{
                      ml: 0.8,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      fontSize: 12,
                      fontWeight: 700,
                      lineHeight: 1,
                      color: active ? '#ffffff' : (isDarkTheme ? '#fca5a5' : '#ef4444'),
                      bgcolor: active ? 'rgba(255,255,255,0.25)' : (isDarkTheme ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'),
                      '&:hover': {
                        bgcolor: '#ef4444',
                        color: '#ffffff',
                      },
                    }}
                  >
                    ×
                  </Box>
                ) : null}
              </Button>
            );
          })}
          <Button
            size="small"
            onClick={() => {
              setNewTabName('');
              setAddTabError('');
              setAddTabModalOpen(true);
            }}
            sx={{ textTransform: 'none', borderRadius: 999, border: isDarkTheme ? '1px dashed rgba(148,163,184,0.45)' : '1px dashed #d1d5db', color: isDarkTheme ? '#94a3b8' : '#6b7280', px: 1.6 }}
          >
            + Add Tab
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: '#9ca3af' }} />
                </InputAdornment>
              ),
            }}
          />
          <Select size="small" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="All Agents">All Agents</MenuItem>
            {agentOptions.map((agent) => (
              <MenuItem key={agent} value={agent}>{agent}</MenuItem>
            ))}
          </Select>
          <Select size="small" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="All Sources">All Sources</MenuItem>
            {SOURCE_OPTIONS.map((source) => (
              <MenuItem key={source} value={source}>{source}</MenuItem>
            ))}
          </Select>
          <TextField
            size="small"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            sx={{ minWidth: 150 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CalendarTodayIcon sx={{ fontSize: 15, color: '#9ca3af' }} />
                </InputAdornment>
              ),
            }}
          />
        </Stack>

        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography sx={{ color: isDarkTheme ? '#38bdf8' : '#4f46e5', fontSize: 13, fontWeight: 600 }}>{selectedIds.length} selected</Typography>
          <Stack direction="row" spacing={0.8}>
            <Button
              size="small"
              variant="contained"
              startIcon={<WhatsAppIcon />}
              onClick={() => setWhatsAppDrawerOpen(true)}
              disabled={selectedIds.length === 0}
              sx={{
                textTransform: 'none',
                bgcolor: '#25d366',
                color: '#ffffff',
                '&:hover': {
                  bgcolor: '#128c7e',
                },
                '&.Mui-disabled': {
                  bgcolor: 'rgba(37, 211, 102, 0.3)',
                  color: 'rgba(255, 255, 255, 0.7)'
                }
              }}
            >
              Send WhatsApp
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => void handleExportExcel()}
              sx={{
                textTransform: 'none',
                bgcolor: '#10b981',
                color: '#ffffff',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                '&:hover': {
                  bgcolor: '#059669',
                },
              }}
            >
              Download Excel
            </Button>
            <Select size="small" value={bulkAgent} displayEmpty onChange={(e) => setBulkAgent(e.target.value)} sx={{ minWidth: 150 }}>
              <MenuItem value="">Assign Agent...</MenuItem>
              {bulkAgentOptions.map((opt) => (
                <MenuItem key={`${opt.value}-${opt.label}`} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
            <Button size="small" variant="outlined" sx={{ textTransform: 'none' }} onClick={applyBulkAgent}>Apply</Button>
            <Select size="small" value={bulkStatus} displayEmpty onChange={(e) => setBulkStatus(e.target.value)} sx={{ minWidth: 145 }}>
              <MenuItem value="">Change Status...</MenuItem>
              {statusOptions.map((status) => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </Select>
            <Button size="small" variant="outlined" sx={{ textTransform: 'none' }} onClick={applyBulkStatus}>Apply</Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DeleteOutlineIcon />}
              color="error"
              sx={{ textTransform: 'none' }}
              onClick={() => void confirmDeleteBulkLeads()}
            >
              Delete
            </Button>
          </Stack>
        </Stack>
        {error ? <Alert severity="warning" sx={{ mb: 1 }}>{error}</Alert> : null}

        <TableContainer
          sx={{
            border: isDarkTheme ? '1px solid rgba(148,163,184,0.25)' : '1px solid #e5e7eb',
            borderRadius: 2,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: isDarkTheme ? '#1e293b' : '#fafafa' }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={allSelected}
                    indeterminate={isSomeSelected}
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked
                          ? Array.from(new Set([...selectedIds, ...filteredLeads.map((r) => r.id)]))
                          : selectedIds.filter((id) => !filteredLeads.map((r) => r.id).includes(id))
                      )
                    }
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Lead ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Address</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Team</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Agent</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Source</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : null}
              {paginatedLeads.map((lead) => (
                <TableRow key={lead.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox size="small" checked={selectedIds.includes(lead.id)} onChange={(e) => toggleSelectRow(lead.id, e.target.checked)} />
                  </TableCell>
                  <TableCell sx={{ color: '#6b7280', fontSize: 12 }}>{lead.id}</TableCell>
                  <TableCell sx={{ color: '#6b7280', fontSize: 12 }}>{lead.createdAt}</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#111827' }}>{lead.name}</TableCell>
                  <TableCell>{lead.phone}</TableCell>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{lead.address}</TableCell>
                  <TableCell>
                    {!isSellerUser && user?.role?.id !== 4 && user?.role?.id !== 5 ? (
                      <Typography sx={{ fontSize: 13, color: isDarkTheme ? '#e5e7eb' : '#111827' }}>
                        {lead.team || '—'}
                      </Typography>
                    ) : (
                      <Select
                        size="small"
                        value={teamSelectValue(lead)}
                        onChange={(e) => void handleLeadTeamChange(lead, e)}
                        disabled={!isSellerUser && user?.role?.id !== 4 && user?.role?.id !== 5}
                      >
                        <MenuItem value="">{SELECT_TEAM_PLACEHOLDER}</MenuItem>
                        {teamPickerRows.length
                          ? teamPickerRows.map((t) => (
                            <MenuItem key={t.userId} value={String(t.userId)}>
                              {t.label}
                            </MenuItem>
                          ))
                          : teamOptions.map((team) => (
                            <MenuItem key={team} value={team}>
                              {team}
                            </MenuItem>
                          ))}
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {!isSellerUser && user?.role?.id !== 4 && user?.role?.id !== 5 ? (
                      <Typography sx={{ fontSize: 13, color: isDarkTheme ? '#e5e7eb' : '#111827' }}>
                        {lead.agent || '—'}
                      </Typography>
                    ) : (
                      <Select
                        size="small"
                        value={agentSelectValue(lead)}
                        onChange={(e) => void handleLeadAgentChange(lead, e)}
                        disabled={!isSellerUser && user?.role?.id !== 4 && user?.role?.id !== 5}
                      >
                        <MenuItem value="">{SELECT_AGENT_PLACEHOLDER}</MenuItem>
                        {getAgentRowsForTeam(lead.team).map((r) => (
                          <MenuItem key={r.userId || r.label} value={r.userId ? String(r.userId) : r.label}>
                            {r.label}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      value={lead.status}
                      onChange={(e) => {
                        void persistPipelineStatusForSession(lead.session_id, e.target.value);
                      }}
                    >
                      {statusOptions.map((status) => (
                        <MenuItem key={status} value={status}>{status}</MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={lead.source || 'Website'}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.74rem',
                        height: 24,
                        bgcolor:
                          lead.source === 'WhatsApp'
                            ? 'rgba(37, 211, 102, 0.15)'
                            : lead.source === 'Website'
                              ? 'rgba(56, 189, 248, 0.15)'
                              : lead.source === 'Manual lead'
                                ? 'rgba(168, 85, 247, 0.15)'
                                : 'rgba(148, 163, 184, 0.15)',
                        color:
                          lead.source === 'WhatsApp'
                            ? '#25d366'
                            : lead.source === 'Website'
                              ? '#38bdf8'
                              : lead.source === 'Manual lead'
                                ? '#c084fc'
                                : '#94a3b8',
                        border: '1px solid currentColor',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.8}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedLeadId(lead.id);
                          setIsDetailEditMode(false);
                        }}
                        title="View lead details"
                      >
                        <VisibilityOutlinedIcon fontSize="inherit" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (lead.customer_id) {
                            navigate(`/seller/live-chat/${lead.customer_id}`);
                          }
                        }}
                        title={lead.customer_id ? 'Open in live chat' : 'Customer id not available'}
                      >
                        <OpenInNewIcon fontSize="inherit" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        title="Delete lead"
                        onClick={() => void confirmDeleteOneLead(lead)}
                      >
                        <DeleteOutlineIcon fontSize="inherit" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 5, color: '#6b7280' }}>No leads yet. Use Add Lead or connect live chat.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredLeads.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          sx={{
            borderTop: isDarkTheme ? '1px solid rgba(148,163,184,0.25)' : '1px solid #e5e7eb',
            color: isDarkTheme ? '#e5e7eb' : 'inherit',
          }}
        />
      </Paper>
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 32, fontWeight: 700 }}>Add New Lead</Typography>
          <IconButton onClick={() => setAddOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.2 }}>
          <Stack spacing={1.4}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
              <TextField fullWidth label="Name *" value={newLead.name} onChange={(e) => setNewLead((p) => ({ ...p, name: e.target.value }))} />
              <TextField fullWidth label="Phone *" value={newLead.phone} onChange={(e) => setNewLead((p) => ({ ...p, phone: e.target.value }))} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
              <TextField fullWidth label="Email" value={newLead.email} onChange={(e) => setNewLead((p) => ({ ...p, email: e.target.value }))} />
              <TextField fullWidth label="Address" value={newLead.address} onChange={(e) => setNewLead((p) => ({ ...p, address: e.target.value }))} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
              <TextField select fullWidth label="Lead Source" value={newLead.source} onChange={(e) => setNewLead((p) => ({ ...p, source: e.target.value }))}>
                {SOURCE_OPTIONS.map((source) => (
                  <MenuItem key={source} value={source}>{source}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                label="Assign Team"
                value={newLead.team}
                disabled={!isSellerUser}
                onChange={(e) => {
                  const selectedTeam = e.target.value;
                  const scopedAgents = getAgentsForTeam(selectedTeam);
                  setNewLead((p) => ({
                    ...p,
                    team: selectedTeam,
                    agent: scopedAgents.includes(p.agent) ? p.agent : '',
                  }));
                }}
              >
                <MenuItem value="">{SELECT_TEAM_PLACEHOLDER}</MenuItem>
                {teamOptions.map((team) => (
                  <MenuItem key={team} value={team}>{team}</MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
              <TextField select fullWidth label="Assign Agent" value={newLead.agent} disabled={!isSellerUser} onChange={(e) => setNewLead((p) => ({ ...p, agent: e.target.value }))}>
                <MenuItem value="">{SELECT_AGENT_PLACEHOLDER}</MenuItem>
                {getAgentsForTeam(newLead.team).map((agent) => (
                  <MenuItem key={agent} value={agent}>{agent}</MenuItem>
                ))}
              </TextField>
              <TextField select fullWidth label="Status" value={newLead.status} onChange={(e) => setNewLead((p) => ({ ...p, status: e.target.value }))}>
                {statusOptions.map((status) => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button variant="outlined" onClick={() => setAddOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
              <Button
                variant="contained"
                disabled={isSubmittingLead}
                onClick={() => void handleAddLeadSubmit()}
                sx={{ textTransform: 'none', bgcolor: '#4f46e5' }}
              >
                {isSubmittingLead ? 'Saving…' : 'Create Lead'}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addTabModalOpen}
        onClose={() => setAddTabModalOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            bgcolor: isDarkTheme ? '#0f172a' : '#ffffff',
            color: isDarkTheme ? '#e5e7eb' : undefined,
            border: isDarkTheme ? '1px solid rgba(148,163,184,0.25)' : undefined,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 18, color: isDarkTheme ? '#e5e7eb' : '#111827' }}>Add tab</Typography>
          <IconButton onClick={() => setAddTabModalOpen(false)} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="Tab name"
            value={newTabName}
            onChange={(e) => {
              setNewTabName(e.target.value);
              setAddTabError('');
            }}
            error={Boolean(addTabError)}
            helperText={addTabError || `Maximum ${MAX_PIPELINE_TAB_NAME_LEN} characters`}
            inputProps={{ maxLength: MAX_PIPELINE_TAB_NAME_LEN }}
            sx={{
              '& .MuiOutlinedInput-root': isDarkTheme ? { color: '#e5e7eb' } : undefined,
              '& .MuiInputLabel-root': isDarkTheme ? { color: '#94a3b8' } : undefined,
              '& .MuiFormHelperText-root': isDarkTheme ? { color: addTabError ? '#fca5a5' : '#94a3b8' } : undefined,
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSaveNewTab();
              }
            }}
          />
          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => setAddTabModalOpen(false)} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleSaveNewTab()}
              sx={{ textTransform: 'none', bgcolor: isDarkTheme ? '#0ea5e9' : '#4f46e5' }}
            >
              Save
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedLead)}
        onClose={() => setSelectedLeadId('')}
        fullScreen
        sx={{ '& .MuiDialog-paper': { bgcolor: 'transparent', boxShadow: 'none', m: 0 } }}
      >
        <Box sx={{ width: '100%', height: '100%', bgcolor: 'rgba(15,23,42,0.22)', display: 'flex', justifyContent: 'flex-end' }}>
          <Paper sx={{ width: { xs: '100%', sm: 430 }, height: '100%', borderRadius: 0, p: 2, overflowY: 'auto' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography sx={{ fontSize: 11, color: '#9ca3af' }}>{selectedLead?.id}</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 22 }}>{selectedLead?.name}</Typography>
              </Box>
              <Stack direction="row" spacing={0.5}>
                <IconButton
                  onClick={() => setIsDetailEditMode((v) => !v)}
                  title={isDetailEditMode ? 'Done editing' : 'Edit information'}
                >
                  <EditOutlinedIcon />
                </IconButton>
                <IconButton onClick={() => setSelectedLeadId('')}><CloseIcon /></IconButton>
              </Stack>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 1.1, mb: 2, flexWrap: 'wrap' }}>
              <Button size="small" variant="outlined" sx={{ textTransform: 'none' }}>Call</Button>
              <Button size="small" variant="outlined" sx={{ textTransform: 'none' }}>WhatsApp</Button>
              <Button size="small" variant="outlined" sx={{ textTransform: 'none' }}>Email</Button>
              <Button size="small" variant="outlined" sx={{ textTransform: 'none' }}>Convert to Customer</Button>
            </Stack>
            <Typography sx={{ fontSize: 12, color: '#6b7280', fontWeight: 700, mb: 1 }}>LEAD INFORMATION</Typography>
            <Stack spacing={1.1}>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  label="Phone"
                  value={selectedLead?.phone || ''}
                  disabled={!isDetailEditMode}
                  onChange={(e) => selectedLead && updateLeadField(selectedLead, 'phone', e.target.value)}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Email"
                  value={selectedLead?.email || ''}
                  disabled={!isDetailEditMode}
                  onChange={(e) => selectedLead && updateLeadField(selectedLead, 'email', e.target.value)}
                  fullWidth
                />
              </Stack>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  label="Name"
                  value={selectedLead?.name || ''}
                  disabled={!isDetailEditMode}
                  onChange={(e) => selectedLead && updateLeadField(selectedLead, 'name', e.target.value)}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Company"
                  value={selectedLead?.company || ''}
                  disabled={!isDetailEditMode}
                  onChange={(e) => selectedLead && updateLeadField(selectedLead, 'company', e.target.value)}
                  fullWidth
                />
              </Stack>
              <TextField
                size="small"
                label="Address"
                value={selectedLead?.address || ''}
                disabled={!isDetailEditMode}
                onChange={(e) => selectedLead && updateLeadField(selectedLead, 'address', e.target.value)}
                fullWidth
              />
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  label="City / State"
                  value={selectedLead?.cityState || ''}
                  disabled={!isDetailEditMode}
                  onChange={(e) => selectedLead && updateLeadField(selectedLead, 'cityState', e.target.value)}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Country"
                  value={selectedLead?.country || ''}
                  disabled={!isDetailEditMode}
                  onChange={(e) => selectedLead && updateLeadField(selectedLead, 'country', e.target.value)}
                  fullWidth
                />
              </Stack>
              <Stack direction="row" spacing={1}>
                <TextField
                  select
                  size="small"
                  label="Status"
                  value={selectedLead?.status || statusOptions[0]}
                  disabled={!selectedLead?.session_id}
                  onChange={(e) =>
                    selectedLead?.session_id && void persistPipelineStatusForSession(selectedLead.session_id, e.target.value)}
                  fullWidth
                >
                  {statusOptions.map((status) => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  label="Source"
                  value={selectedLead?.source || ''}
                  disabled={true}
                  fullWidth
                />
              </Stack>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontSize: 12, color: '#6b7280', fontWeight: 700, mb: 1 }}>CONVERSATION HISTORY</Typography>
            <Typography sx={{ fontSize: 13, color: '#111827' }}>Lead created</Typography>
            <Typography sx={{ fontSize: 11, color: '#9ca3af' }}>{selectedLead?.createdAt}</Typography>
            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontSize: 12, color: '#6b7280', fontWeight: 700, mb: 1 }}>NOTES</Typography>
            <TextField multiline minRows={3} fullWidth placeholder="Add a note..." />
            <Button sx={{ mt: 1.2, textTransform: 'none', bgcolor: '#4f46e5' }} variant="contained">Save Note</Button>
            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontSize: 12, color: '#6b7280', fontWeight: 700, mb: 1 }}>TASKS</Typography>
            <Stack direction="row" spacing={1}>
              <TextField size="small" placeholder="Title" fullWidth />
              <TextField size="small" type="date" sx={{ minWidth: 120 }} />
              <TextField size="small" select defaultValue={defaultAgentName} sx={{ minWidth: 130 }}>
                {agentOptions.map((agent) => (
                  <MenuItem key={agent} value={agent}>{agent}</MenuItem>
                ))}
              </TextField>
            </Stack>
            <Button sx={{ mt: 1.2, textTransform: 'none', bgcolor: '#4f46e5' }} variant="contained">Create Task</Button>
          </Paper>
        </Box>
      </Dialog>

      {/* ==================== ADVANCED CUT-TO-CUT MATCHING SEND WHATSAPP MESSAGE DRAWER ==================== */}
      <Drawer
        anchor="right"
        open={whatsAppDrawerOpen}
        onClose={() => setWhatsAppDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 540, md: 580 },
            backgroundColor: '#090d16',
            color: '#f8fafc',
            borderLeft: '1px solid rgba(148, 163, 184, 0.2)',
            boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.95)',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Drawer Header */}
        <Box
          sx={{
            py: 2.2,
            px: 3,
            backgroundColor: '#0b1329',
            borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '1.15rem', lineHeight: 1.2 }}>
              Send WhatsApp Message
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.82rem', mt: 0.3, display: 'block' }}>
              {selectedLeadsList.length || selectedIds.length} Leads Selected
            </Typography>
          </Box>
          <IconButton
            onClick={() => setWhatsAppDrawerOpen(false)}
            size="small"
            sx={{
              color: '#94a3b8',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '10px',
              p: 0.8,
              '&:hover': { color: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.12)' },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Scrollable Content Body */}
        <Box
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            '&::-webkit-scrollbar': { width: '6px' },
            '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(148, 163, 184, 0.2)', borderRadius: '3px' },
          }}
        >
          {/* Top Row: Channel & Business Number Dropdowns with Placeholders */}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 0.8, fontSize: '0.82rem', fontWeight: 700 }}>
                Channel *
              </Typography>
              <Select
                fullWidth
                size="small"
                displayEmpty
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                sx={{
                  backgroundColor: '#020617',
                  color: selectedChannel ? '#ffffff' : '#94a3b8',
                  borderRadius: '10px',
                  height: 42,
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#38bdf8' },
                }}
              >
                <MenuItem value="" disabled sx={{ color: '#94a3b8' }}>
                  Please select channel
                </MenuItem>
                {channelsList.map((ch) => (
                  <MenuItem key={ch} value={ch}>{ch}</MenuItem>
                ))}
              </Select>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 0.8, fontSize: '0.82rem', fontWeight: 700 }}>
                Business Number *
              </Typography>
              <Select
                fullWidth
                size="small"
                displayEmpty
                value={selectedBusinessNumber}
                onChange={(e) => setSelectedBusinessNumber(e.target.value)}
                sx={{
                  backgroundColor: '#020617',
                  color: selectedBusinessNumber ? '#ffffff' : '#94a3b8',
                  borderRadius: '10px',
                  height: 42,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#38bdf8' },
                }}
              >
                <MenuItem value="" disabled sx={{ color: '#94a3b8' }}>
                  Please select business number
                </MenuItem>
                {businessNumbersList.map((num) => (
                  <MenuItem key={num} value={num}>{num}</MenuItem>
                ))}
              </Select>
            </Grid>
          </Grid>

          {/* Campaign Name Field */}
          <Box>
            <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 0.8, fontSize: '0.82rem', fontWeight: 700 }}>
              Campaign Name *
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="e.g. August Lead Pipeline Campaign"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              InputProps={{
                sx: {
                  color: '#ffffff',
                  backgroundColor: '#020617',
                  borderRadius: '10px',
                  height: 42,
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#38bdf8' },
                },
              }}
            />
          </Box>

          {/* APPROVED TEMPLATES Container Box */}
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.8px' }}>
                APPROVED TEMPLATES
              </Typography>
              {selectedChannel && selectedBusinessNumber && (
                <Chip
                  label={`${filteredTemplatesList.length} available`}
                  size="small"
                  sx={{
                    backgroundColor: '#0f172a',
                    color: '#38bdf8',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    height: 22,
                  }}
                />
              )}
            </Stack>

            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: '14px',
                backgroundColor: '#020617',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              {!selectedChannel || !selectedBusinessNumber ? (
                <Box sx={{ py: 3, px: 2, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
                    👈 Please select Channel and Business Number above to view approved Meta templates.
                  </Typography>
                </Box>
              ) : (
                <>
                  {/* Search Bar Input */}
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search template..."
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: '#64748b', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                      sx: {
                        color: '#ffffff',
                        backgroundColor: '#090d16',
                        borderRadius: '8px',
                        height: 38,
                        fontSize: '0.85rem',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.2)' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#38bdf8' },
                      },
                    }}
                  />

                  {/* Category Filter */}
                  <Box sx={{ width: '100%' }}>
                    <Select
                      fullWidth
                      size="small"
                      value={templateCategoryFilter}
                      onChange={(e) => setTemplateCategoryFilter(e.target.value)}
                      sx={{
                        backgroundColor: '#090d16',
                        color: '#ffffff',
                        borderRadius: '8px',
                        height: 36,
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.2)' },
                      }}
                    >
                      <MenuItem value="All categories">All categories</MenuItem>
                      <MenuItem value="UTILITY">UTILITY</MenuItem>
                      <MenuItem value="MARKETING">MARKETING</MenuItem>
                      <MenuItem value="AUTHENTICATION">AUTHENTICATION</MenuItem>
                    </Select>
                  </Box>

                  {/* Scrollable Templates Cards List */}
                  <Box
                    sx={{
                      maxHeight: 220,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.2,
                      pr: 0.5,
                      '&::-webkit-scrollbar': { width: '5px' },
                      '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(148, 163, 184, 0.3)', borderRadius: '3px' },
                    }}
                  >
                    {filteredTemplatesList.length > 0 ? (
                      filteredTemplatesList.map((tpl) => {
                        const isSelected = tpl.name === selectedTemplateName;
                        return (
                          <Paper
                            key={tpl.name}
                            elevation={0}
                            onClick={() => setSelectedTemplateName(tpl.name)}
                            sx={{
                              p: 1.5,
                              borderRadius: '10px',
                              cursor: 'pointer',
                              backgroundColor: isSelected ? '#0b1e2d' : '#090d16',
                              border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.15)',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                borderColor: '#38bdf8',
                                backgroundColor: isSelected ? '#0b1e2d' : '#0f172a',
                              },
                            }}
                          >
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.4 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '0.88rem' }}>
                                {tpl.header_text || tpl.name}
                              </Typography>
                              {isSelected && <CheckIcon sx={{ color: '#38bdf8', fontSize: 18 }} />}
                            </Stack>

                            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                              {tpl.category || 'MARKETING'} · Type: {getTemplateHeaderType(tpl)} · {tpl.language || 'en_US'} · {tpl.status || 'APPROVED'} · {tpl.date || 'Jul 28, 2026'}
                            </Typography>
                          </Paper>
                        );
                      })
                    ) : (
                      <Typography variant="caption" sx={{ color: '#64748b', textAlign: 'center', py: 2 }}>
                        No matching templates found for selected channel.
                      </Typography>
                    )}
                  </Box>
                </>
              )}
            </Paper>
          </Box>

          {/* 1. LIVE PREVIEW SECTION - ULTRA PREMIUM TALL SMARTPHONE MOCKUP */}
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.8px' }}>
                LIVE PREVIEW
              </Typography>

              {/* Preview Pagination Controls */}
              {selectedLeadsList.length > 0 && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                    Previewing {previewLeadIndex + 1} / {selectedLeadsList.length}
                  </Typography>
                  <IconButton
                    size="small"
                    disabled={previewLeadIndex === 0}
                    onClick={() => setPreviewLeadIndex((prev) => Math.max(0, prev - 1))}
                    sx={{ color: '#cbd5e1', p: 0.3, '&.Mui-disabled': { color: '#475569' } }}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={previewLeadIndex >= selectedLeadsList.length - 1}
                    onClick={() => setPreviewLeadIndex((prev) => Math.min(selectedLeadsList.length - 1, prev + 1))}
                    sx={{ color: '#cbd5e1', p: 0.3, '&.Mui-disabled': { color: '#475569' } }}
                  >
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                </Stack>
              )}
            </Stack>

            {/* Ultra Premium Smartphone Container with Tall Frame & Status Bar */}
            <Paper
              elevation={0}
              sx={{
                borderRadius: '24px',
                backgroundColor: '#0a0f1d',
                border: '2px solid rgba(148, 163, 184, 0.25)',
                overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
                minHeight: 380,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Top Smartphone Status Bar with Notch */}
              <Box
                sx={{
                  bgcolor: '#075e54',
                  px: 2.5,
                  pt: 0.8,
                  pb: 0.4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                }}
              >
                <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 800 }}>
                  10:24
                </Typography>
                <Box
                  sx={{
                    width: 50,
                    height: 12,
                    bgcolor: '#000000',
                    borderRadius: '10px',
                    margin: '0 auto',
                  }}
                />
                <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 800 }}>
                  📶 🔋 100%
                </Typography>
              </Box>

              {/* WhatsApp Business Channel Top Bar */}
              <Box
                sx={{
                  background: 'linear-gradient(90deg, #075e54 0%, #128c7e 100%)',
                  px: 2.2,
                  py: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  color: '#ffffff',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                }}
              >
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.9rem',
                    color: '#ffffff',
                    border: '2px solid rgba(255,255,255,0.4)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                >
                  SY
                </Box>
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.92rem', color: '#ffffff', lineHeight: 1.1 }}>
                    {selectedBusinessNumber || 'Syntrrix Business Main'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.82)', fontSize: '0.7rem', display: 'block', mt: 0.2 }}>
                    Official WhatsApp Business Account
                  </Typography>
                </Box>
              </Box>

              {/* WhatsApp Smartphone Wallpaper & Chat Canvas */}
              <Box
                sx={{
                  p: 2.5,
                  flexGrow: 1,
                  minHeight: 280,
                  bgcolor: '#0b141a',
                  backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
                  backgroundSize: '14px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ width: '100%' }}>
                  {/* WhatsApp Speech Bubble */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: '16px 16px 16px 3px',
                      backgroundColor: '#005c4b',
                      color: '#ffffff',
                      position: 'relative',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
                      wordBreak: 'break-word',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    {/* Dynamic Media Header Rendering (IMAGE, VIDEO, DOCUMENT, TEXT) */}
                    {(() => {
                      const headerType = getTemplateHeaderType(activeTemplateObj);
                      const mediaUrl = activeTemplateObj?.header_media || activeTemplateObj?.media_url || activeTemplateObj?.header_media_url || activeTemplateObj?.file || '';
                      const resolvedUrl = resolveMediaUrl(mediaUrl);

                      if (headerType === 'IMAGE') {
                        return (
                          <Box sx={{ width: '100%', mb: 1.2, borderRadius: '10px', overflow: 'hidden', bgcolor: '#020617' }}>
                            <img
                              src={resolvedUrl || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&fm=jpg&fit=crop&q=80'}
                              alt="Template Header Preview"
                              style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }}
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&fm=jpg&fit=crop&q=80';
                              }}
                            />
                          </Box>
                        );
                      }

                      if (headerType === 'VIDEO') {
                        return (
                          <Box sx={{ width: '100%', mb: 1.2, borderRadius: '10px', overflow: 'hidden', bgcolor: '#020617' }}>
                            <video
                              controls
                              src={resolvedUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'}
                              style={{ width: '100%', maxHeight: '190px', objectFit: 'cover', display: 'block' }}
                            />
                          </Box>
                        );
                      }

                      if (headerType === 'DOCUMENT') {
                        return (
                          <Paper
                            elevation={0}
                            sx={{
                              p: 1.5,
                              mb: 1.2,
                              borderRadius: '10px',
                              bgcolor: 'rgba(2, 6, 23, 0.6)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                            }}
                          >
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '8px',
                                bgcolor: 'rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <PictureAsPdfIcon sx={{ fontSize: 22 }} />
                            </Box>
                            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '0.85rem', noWrap: true }}>
                                {activeTemplateObj?.filename || activeTemplateObj?.document_name || 'Document.pdf'}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                                PDF Document · Tap to Preview
                              </Typography>
                            </Box>
                          </Paper>
                        );
                      }

                      if (activeTemplateObj?.header_text) {
                        return (
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#ffffff', mb: 1, fontSize: '0.95rem' }}>
                            {activeTemplateObj.header_text}
                          </Typography>
                        );
                      }

                      return null;
                    })()}

                    {/* Rendered Dynamic Body Text */}
                    <Typography variant="body2" sx={{ fontSize: '0.86rem', color: '#f1f5f9', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                      {renderedBubbleBody}
                    </Typography>

                    {/* Timestamp & Double Blue Checkmark */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, mt: 1 }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.64rem' }}>
                        10:24 AM
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#38bdf8', fontSize: '0.7rem', fontWeight: 800 }}>
                        ✓✓
                      </Typography>
                    </Box>
                  </Paper>

                  {/* Embedded Interactive Action Buttons Stack */}
                  {activeTemplateObj.buttons && activeTemplateObj.buttons.length > 0 && (
                    <Stack spacing={0.9} sx={{ mt: 1.2 }}>
                      {activeTemplateObj.buttons.map((btn, idx) => (
                        <Paper
                          key={idx}
                          elevation={0}
                          sx={{
                            py: 1.1,
                            px: 2,
                            borderRadius: '12px',
                            backgroundColor: '#111b21',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            color: '#38bdf8',
                            textAlign: 'center',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 0.8,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                            transition: 'all 0.2s ease',
                            '&:hover': { backgroundColor: '#18252d' },
                          }}
                        >
                          {btn.type === 'phone' ? <CallIcon sx={{ fontSize: 15 }} /> : <LaunchIcon sx={{ fontSize: 15 }} />}
                          {btn.label || 'Action Button'}
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Box>
            </Paper>

            {/* Recipient Target Text */}
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.78rem', mt: 1.2, display: 'block' }}>
              To <span style={{ color: '#ffffff', fontWeight: 700 }}>{currentPreviewLead.name || 'Swati'}</span> · {currentPreviewLead.phone || '919220142277'}
            </Typography>
          </Box>

          {/* 2. VARIABLES MAPPING SECTION (Matching Screenshot 1 & 3) */}
          <Paper
            elevation={0}
            sx={{
              p: 2.2,
              borderRadius: '14px',
              backgroundColor: '#020617',
              border: '1px solid rgba(148, 163, 184, 0.2)',
            }}
          >
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.8px', display: 'block', mb: 1.8 }}>
              VARIABLES MAPPING
            </Typography>

            {extractedVariables.length > 0 ? (
              <Stack spacing={2}>
                {extractedVariables.map((varKey) => {
                  const cleanKey = varKey.replace(/[\{\}]/g, '').trim();
                  const currentMapping = varMappings[cleanKey] || { type: 'field', value: 'name' };

                  return (
                    <Box key={varKey}>
                      <Typography variant="caption" sx={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem', display: 'block', mb: 0.8 }}>
                        {varKey}
                      </Typography>
                      <Grid container spacing={1.5}>
                        <Grid item xs={5}>
                          <Select
                            fullWidth
                            size="small"
                            value={currentMapping.type || 'field'}
                            onChange={(e) => handleVarMappingChange(cleanKey, 'type', e.target.value)}
                            sx={{
                              backgroundColor: '#090d16',
                              color: '#ffffff',
                              borderRadius: '8px',
                              height: 38,
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                            }}
                          >
                            <MenuItem value="field">Lead field</MenuItem>
                            <MenuItem value="custom">Custom text</MenuItem>
                          </Select>
                        </Grid>

                        <Grid item xs={7}>
                          {currentMapping.type === 'custom' ? (
                            <TextField
                              fullWidth
                              size="small"
                              value={currentMapping.value || ''}
                              onChange={(e) => handleVarMappingChange(cleanKey, 'value', e.target.value)}
                              placeholder="Enter custom value"
                              InputProps={{
                                sx: {
                                  color: '#ffffff',
                                  backgroundColor: '#090d16',
                                  borderRadius: '8px',
                                  height: 38,
                                  fontSize: '0.82rem',
                                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                                },
                              }}
                            />
                          ) : (
                            <Select
                              fullWidth
                              size="small"
                              value={currentMapping.value || 'name'}
                              onChange={(e) => handleVarMappingChange(cleanKey, 'value', e.target.value)}
                              sx={{
                                backgroundColor: '#090d16',
                                color: '#ffffff',
                                borderRadius: '8px',
                                height: 38,
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                              }}
                            >
                              <MenuItem value="name">Name</MenuItem>
                              <MenuItem value="phone">Phone</MenuItem>
                              <MenuItem value="email">Email</MenuItem>
                              <MenuItem value="address">Address</MenuItem>
                              <MenuItem value="team">Team</MenuItem>
                              <MenuItem value="agent">Agent</MenuItem>
                              <MenuItem value="status">Status</MenuItem>
                              <MenuItem value="source">Source</MenuItem>
                              <MenuItem value="company">Company</MenuItem>
                              <MenuItem value="cityState">City / State</MenuItem>
                              <MenuItem value="country">Country</MenuItem>
                              <MenuItem value="id">Lead ID</MenuItem>
                              <MenuItem value="createdAt">Created Date</MenuItem>
                            </Select>
                          )}
                        </Grid>
                      </Grid>
                    </Box>
                  );
                })}
              </Stack>
            ) : (
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.8rem' }}>
                No variable parameters required for this template.
              </Typography>
            )}
          </Paper>

          {/* 3. DELIVERY SECTION (Matching Screenshot 1 & 3) */}
          <Paper
            elevation={0}
            sx={{
              p: 2.2,
              borderRadius: '14px',
              backgroundColor: '#020617',
              border: '1px solid rgba(148, 163, 184, 0.2)',
            }}
          >
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.8px', display: 'block', mb: 1 }}>
              DELIVERY
            </Typography>

            <RadioGroup
              row
              value={sendOption}
              onChange={(e) => setSendOption(e.target.value)}
              sx={{ gap: 2 }}
            >
              <FormControlLabel
                value="now"
                control={<Radio size="small" sx={{ color: '#38bdf8', '&.Mui-checked': { color: '#38bdf8' } }} />}
                label={<Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>Send Now</Typography>}
              />
              <FormControlLabel
                value="schedule"
                control={<Radio size="small" sx={{ color: '#38bdf8', '&.Mui-checked': { color: '#38bdf8' } }} />}
                label={<Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>Schedule</Typography>}
              />
            </RadioGroup>

            {sendOption === 'schedule' && (
              <Box sx={{ mt: 1.5 }}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  size="small"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    sx: {
                      color: '#ffffff',
                      backgroundColor: '#090d16',
                      borderRadius: '8px',
                      height: 38,
                      fontSize: '0.82rem',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                    },
                  }}
                />
              </Box>
            )}
          </Paper>

          {/* 4. REVIEW SECTION (Matching Screenshot 1 & 3) */}
          <Paper
            elevation={0}
            sx={{
              p: 2.2,
              borderRadius: '14px',
              backgroundColor: '#020617',
              border: '1px solid rgba(148, 163, 184, 0.2)',
            }}
          >
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.8px', display: 'block', mb: 1.5 }}>
              REVIEW
            </Typography>

            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>Selected Leads</Typography>
                <Typography variant="caption" sx={{ color: '#ffffff', fontWeight: 700, fontSize: '0.85rem' }}>{selectedLeadsList.length || selectedIds.length}</Typography>
              </Stack>

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>Business Number</Typography>
                <Typography variant="caption" sx={{ color: '#ffffff', fontWeight: 700, fontSize: '0.85rem' }}>{selectedBusinessNumber}</Typography>
              </Stack>

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>Template</Typography>
                <Typography variant="caption" sx={{ color: '#ffffff', fontWeight: 700, fontSize: '0.85rem' }}>{activeTemplateObj.header_text || selectedTemplateName}</Typography>
              </Stack>

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>Variables</Typography>
                <Typography variant="caption" sx={{ color: '#ffffff', fontWeight: 700, fontSize: '0.85rem' }}>Mapped</Typography>
              </Stack>

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>Schedule</Typography>
                <Typography variant="caption" sx={{ color: '#ffffff', fontWeight: 700, fontSize: '0.85rem' }}>{sendOption === 'now' ? 'Send now' : scheduledDateTime || 'Scheduled'}</Typography>
              </Stack>
            </Stack>
          </Paper>
        </Box>

        {/* Sticky Drawer Action Footer Bar (Matching Bottom Bar in Screenshots) */}
        <Box
          sx={{
            py: 2,
            px: 3,
            backgroundColor: '#090d16',
            borderTop: '1px solid rgba(148, 163, 184, 0.12)',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            gap: 2,
            flexShrink: 0,
          }}
        >
          <Button
            variant="outlined"
            onClick={() => setWhatsAppDrawerOpen(false)}
            disabled={isSendingWhatsApp}
            sx={{
              textTransform: 'none',
              color: '#ffffff',
              borderColor: 'rgba(148, 163, 184, 0.3)',
              backgroundColor: '#020617',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.9rem',
              height: 42,
              px: 3,
              flexGrow: 1,
              '&:hover': { borderColor: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.05)' },
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={isSendingWhatsApp || (selectedIds.length === 0 && selectedLeadsList.length === 0)}
            onClick={triggerBulkWhatsAppCampaign}
            startIcon={isSendingWhatsApp ? <CircularProgress size={18} sx={{ color: '#ffffff' }} /> : <SendIcon sx={{ fontSize: 16 }} />}
            sx={{
              textTransform: 'none',
              backgroundColor: '#00b4d8',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.9rem',
              borderRadius: '10px',
              height: 42,
              px: 3.5,
              flexGrow: 1.5,
              boxShadow: '0 4px 14px rgba(0, 180, 216, 0.4)',
              '&:hover': { backgroundColor: '#0096c7' },
              '&.Mui-disabled': { backgroundColor: 'rgba(0, 180, 216, 0.4)', color: 'rgba(255, 255, 255, 0.6)' },
            }}
          >
            {isSendingWhatsApp ? 'Sending Campaign...' : 'Send Campaign'}
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
}

export default LeadPipeline;
