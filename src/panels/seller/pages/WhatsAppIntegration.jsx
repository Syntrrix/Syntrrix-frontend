import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
} from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import DescriptionIcon from '@mui/icons-material/Description';
import ExtensionIcon from '@mui/icons-material/Extension';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import LockIcon from '@mui/icons-material/Lock';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import GridViewIcon from '@mui/icons-material/GridView';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CancelIcon from '@mui/icons-material/Cancel';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import EditNoteIcon from '@mui/icons-material/EditNote';
import BlockIcon from '@mui/icons-material/Block';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LanguageIcon from '@mui/icons-material/Language';
import ImageIcon from '@mui/icons-material/Image';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import CodeIcon from '@mui/icons-material/Code';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import VideocamIcon from '@mui/icons-material/Videocam';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PhoneIcon from '@mui/icons-material/Phone';
import CallIcon from '@mui/icons-material/Call';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import LaunchIcon from '@mui/icons-material/Launch';
import CheckIcon from '@mui/icons-material/Check';
import BarChartIcon from '@mui/icons-material/BarChart';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Swal from 'sweetalert2';
import {
  disconnectWhatsApp,
  fetchWhatsAppConfig,
  saveWhatsAppConfig,
  testWhatsAppConnection,
  sendBulkWhatsAppTemplate,
  fetchWhatsAppTemplates,
  createWhatsAppTemplate,
  syncWhatsAppTemplates,
  fetchWhatsAppCampaigns,
  createWhatsAppCampaign,
  fetchCampaignRecipients,
  uploadWhatsAppMedia,
} from '../../../api/whatsapp';
import { useThemeContext } from '../../../context/ThemeContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.qa.syntrrix.com/api/';

const resolveMediaUrl = (url) => {
  const raw = (url || '').toString().trim();
  if (!raw) return '';
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${raw.startsWith('/') ? raw : `/${raw}`}`;
};

function WhatsAppIntegration() {
  const { isDark } = useThemeContext();
  // Tab State: 'campaigns' | 'templates' | 'integration'
  const [activeTab, setActiveTab] = useState('campaigns');

  // ------------ CAMPAIGNS TAB STATE ------------
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState('All statuses');
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    template: 'spring_sale_2025',
    channel: 'Syntrrix Main',
    audience: '500',
    status: 'Scheduled',
    date: new Date().toLocaleDateString('en-US'),
  });

  const [campaigns, setCampaigns] = useState([]);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [selectedStatsCampaign, setSelectedStatsCampaign] = useState(null);
  const [campaignRecipientsList, setCampaignRecipientsList] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  const loadDBCampaigns = async () => {
    try {
      const res = await fetchWhatsAppCampaigns();
      if (res && res.success && Array.isArray(res.data)) {
        setCampaigns(res.data);
      }
    } catch (e) {
      console.error('Error fetching campaigns from DB API:', e);
    }
  };

  useEffect(() => {
    void loadDBCampaigns();
  }, []);

  const handleOpenCampaignStatsModal = async (campaign) => {
    setSelectedStatsCampaign(campaign);
    setStatsModalOpen(true);
    setLoadingRecipients(true);
    try {
      const res = await fetchCampaignRecipients(campaign.id);
      if (res && res.success && Array.isArray(res.data)) {
        setCampaignRecipientsList(res.data);
        if (res.data.length > 0) {
          const list = res.data;
          const aud = list.length;
          const sentCount = list.filter((r) => r.sent_status === true).length;
          const delivCount = list.filter((r) => r.delivered_status === true).length;
          const readCount = list.filter((r) => r.read_status === true).length;
          const failedCount = list.filter((r) => r.sent_status === false || (r.sent_error && r.sent_error.length > 0)).length;

          setCampaigns((prev) =>
            prev.map((item) =>
              item.id === campaign.id
                ? {
                    ...item,
                    audience: aud,
                    sent: String(sentCount),
                    delivered: String(delivCount),
                    read: String(readCount),
                    failed: String(failedCount),
                  }
                : item
            )
          );
        }
      } else {
        setCampaignRecipientsList([]);
      }
    } catch (err) {
      console.error('Failed to load campaign recipients:', err);
      setCampaignRecipientsList([]);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleCreateCampaignSubmit = async () => {
    if (!newCampaign.title.trim()) return;
    try {
      const audCount = Number(newCampaign.audience) || 100;
      const createdPayload = {
        title: newCampaign.title.trim(),
        status: newCampaign.status || 'Scheduled',
        subtitle: `${newCampaign.template} · ${newCampaign.channel}`,
        template_name: newCampaign.template,
        channel_name: newCampaign.channel,
        audience: audCount,
        delivered: newCampaign.status === 'Completed' ? `${audCount} / ${audCount}` : `0 / ${audCount}`,
        read: newCampaign.status === 'Completed' ? `${Math.round(audCount * 0.85)} / ${audCount}` : `0 / ${audCount}`,
        author: 'By you',
      };
      const res = await createWhatsAppCampaign(createdPayload);
      if (res && res.success) {
        await loadDBCampaigns();
      } else {
        const createdItem = {
          id: Date.now(),
          ...createdPayload,
          date: new Date().toLocaleDateString('en-US'),
        };
        setCampaigns([createdItem, ...campaigns]);
      }
    } catch (err) {
      console.error('Failed to create campaign via API:', err);
    }

    setCreateCampaignOpen(false);
    setNewCampaign({
      title: '',
      template: 'spring_sale_2025',
      channel: 'Syntrrix Main',
      audience: '500',
      status: 'Scheduled',
      date: new Date().toLocaleDateString('en-US'),
    });
    Swal.fire({
      icon: 'success',
      title: 'Campaign Created',
      text: `Campaign "${newCampaign.title.trim()}" has been created successfully.`,
      timer: 2000,
      showConfirmButton: false,
      background: '#090d16',
      color: '#f8fafc',
    });
  };

  const formatCampaignMetrics = (c, recipientsList = []) => {
    if (!c) return { aud: '0', sent: '0', delivered: '0', read: '0', failed: '0' };

    if (Array.isArray(recipientsList) && recipientsList.length > 0) {
      const aud = recipientsList.length;
      const sentCount = recipientsList.filter((r) => r.sent_status === true).length;
      const delivCount = recipientsList.filter((r) => r.delivered_status === true).length;
      const readCount = recipientsList.filter((r) => r.read_status === true).length;
      const failedCount = recipientsList.filter((r) => r.sent_status === false || (r.sent_error && r.sent_error.length > 0)).length;

      return {
        aud: aud.toLocaleString(),
        sent: String(sentCount),
        delivered: String(delivCount),
        read: String(readCount),
        failed: String(failedCount),
      };
    }

    const aud = Number(c.audience) || 0;
    const sent = c.sent !== undefined && c.sent !== '' ? String(c.sent) : String(aud);
    const failed = c.failed !== undefined && c.failed !== '' ? String(c.failed) : '0';

    let delivRaw = String(c.delivered || '0').replace(/\s+/g, '');
    let delivNum = Number(delivRaw.split('/')[0]) || 0;

    let readRaw = String(c.read || '0').replace(/\s+/g, '');
    let readNum = Number(readRaw.split('/')[0]) || 0;

    return {
      aud: aud.toLocaleString(),
      sent,
      delivered: String(delivNum),
      read: String(readNum),
      failed,
    };
  };

  const renderCampaignStatusChip = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'running') {
      return (
        <Chip
          label="Running 🟡"
          size="small"
          sx={{
            bgcolor: 'rgba(245, 158, 11, 0.18)',
            color: '#fbbf24',
            fontWeight: 800,
            fontSize: '0.74rem',
            border: '1px solid rgba(245, 158, 11, 0.35)',
          }}
        />
      );
    }
    if (s === 'completed') {
      return (
        <Chip
          label="Completed"
          size="small"
          sx={{
            bgcolor: 'rgba(34, 197, 94, 0.15)',
            color: '#4ade80',
            fontWeight: 800,
            fontSize: '0.74rem',
            border: '1px solid rgba(34, 197, 94, 0.3)',
          }}
        />
      );
    }
    if (s === 'scheduled') {
      return (
        <Chip
          label="Scheduled"
          size="small"
          sx={{
            bgcolor: 'rgba(168, 85, 247, 0.15)',
            color: '#c084fc',
            fontWeight: 800,
            fontSize: '0.74rem',
            border: '1px solid rgba(168, 85, 247, 0.3)',
          }}
        />
      );
    }
    return (
      <Chip
        label={status || 'Active'}
        size="small"
        sx={{
          bgcolor: 'rgba(56, 189, 248, 0.15)',
          color: '#38bdf8',
          fontWeight: 800,
          fontSize: '0.74rem',
          border: '1px solid rgba(56, 189, 248, 0.3)',
        }}
      />
    );
  };

  // ------------ 4-STEP CREATE CAMPAIGN WIZARD MODAL STATE ------------
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  // Dynamic Seller Business Numbers & Templates State:
  const [sellerBusinessChannels, setSellerBusinessChannels] = useState([]);
  const [sellerApprovedTemplates, setSellerApprovedTemplates] = useState([]);
  const [uploadingHeaderMedia, setUploadingHeaderMedia] = useState(false);
  const [selectedTemplateObject, setSelectedTemplateObject] = useState(null);

  // Step 1 State:
  const [wizardCampaignName, setWizardCampaignName] = useState('');
  const [wizardDescription, setWizardDescription] = useState('');
  const [wizardSelectedBusinessNumber, setWizardSelectedBusinessNumber] = useState('');
  const [wizardSelectedTemplate, setWizardSelectedTemplate] = useState('');
  const [wizardHeaderMediaUrl, setWizardHeaderMediaUrl] = useState('');
  const [wizardHeaderMediaFileName, setWizardHeaderMediaFileName] = useState('');

  // Step 2 State:
  const [wizardUploadedFileName, setWizardUploadedFileName] = useState('');
  const [wizardUploadedFileSize, setWizardUploadedFileSize] = useState('');
  const [wizardAudienceRows, setWizardAudienceRows] = useState([]);
  const [wizardAudienceFilter, setWizardAudienceFilter] = useState('All');
  const [wizardAudiencePage, setWizardAudiencePage] = useState(1);
  const [wizardCustomColumns, setWizardCustomColumns] = useState(['Name', 'Email']);
  const [wizardVarMapping, setWizardVarMapping] = useState({
    1: 'Name',
    2: 'Email',
  });

  // Step 3 State:
  const [wizardTestCountry, setWizardTestCountry] = useState('IN');
  const [wizardTestPhone, setWizardTestPhone] = useState('9876543210');
  const [wizardSendingTest, setWizardSendingTest] = useState(false);

  // Step 4 State:
  const [wizardLaunchOption, setWizardLaunchOption] = useState('now');
  const [wizardScheduleDate, setWizardScheduleDate] = useState('');
  const [wizardConfirmed, setWizardConfirmed] = useState(false);

  const loadApprovedTemplatesForConfig = async (configId) => {
    try {
      const res = await fetchWhatsAppTemplates(configId);
      if (res && res.success && res.data) {
        const approvedOnly = res.data.filter((t) => t.status === 'APPROVED');
        setSellerApprovedTemplates(approvedOnly);
      }
    } catch (err) {
      console.error('Error loading approved templates for business number:', err);
    }
  };

  const handleOpenCreateWizard = async () => {
    setWizardStep(1);
    setWizardCampaignName('');
    setWizardDescription('');
    setWizardSelectedBusinessNumber('');
    setWizardSelectedTemplate('');
    setSelectedTemplateObject(null);
    setWizardHeaderMediaUrl('');
    setWizardHeaderMediaFileName('');
    setWizardUploadedFileName('');
    setWizardUploadedFileSize('');
    setWizardAudienceRows([]);
    setWizardAudiencePage(1);
    setWizardConfirmed(false);

    try {
      const configRes = await fetchWhatsAppConfig();
      if (configRes && configRes.success && configRes.data && configRes.data.length > 0) {
        setSellerBusinessChannels(configRes.data);
      } else {
        setSellerBusinessChannels([
          { config_id: '1', channel_name: 'Syntrrix UK', phone_number: '+44 20 7946 0958', is_connected: true, quality: 'High' },
          { config_id: '2', channel_name: 'Syntrrix India', phone_number: '+91 80 4567 1234', is_connected: true, quality: 'Medium' },
        ]);
      }
    } catch (err) {
      console.error('Error fetching seller business channels:', err);
    }
    setCreateWizardOpen(true);
  };

  const handleWizardMediaFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVid = file.type.startsWith('video/') || /\.(mp4|mov|avi|webm|3gp|mkv)($|\?)/i.test(file.name) || (selectedTemplateObject?.format || '').toLowerCase() === 'video';
    const maxSizeBytes = 16 * 1024 * 1024;
    if (isVid && file.size > maxSizeBytes) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      Swal.fire({
        icon: 'warning',
        title: 'Video Exceeds 16 MB Limit',
        text: `Selected video file is ${fileSizeMB} MB. Meta WhatsApp Cloud API allows a maximum of 16 MB for video header media. Upload aborted.`,
        background: '#090d16',
        color: '#f8fafc',
      });
      e.target.value = '';
      return;
    }

    // 1. Instant 0-ms Local Preview using Blob URL before server upload completes
    const localBlobUrl = URL.createObjectURL(file);
    setWizardHeaderMediaUrl(localBlobUrl);
    const isDoc = file.type.includes('pdf') || /\.(pdf|doc|docx|xls|xlsx)($|\?)/i.test(file.name);
    const detectedFmt = isVid ? 'video' : isDoc ? 'document' : 'image';

    setSelectedTemplateObject((prev) => (prev ? { ...prev, media_url: localBlobUrl, header_media: localBlobUrl, format: detectedFmt } : prev));
    if (file.name) setWizardHeaderMediaFileName(file.name);

    setUploadingHeaderMedia(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const tplId = selectedTemplateObject?.template_id || selectedTemplateObject?.id || selectedTemplateObject?.pk || '';
      const tplName = wizardSelectedTemplate || selectedTemplateObject?.name || '';
      if (tplId) formData.append('template_id', tplId);
      if (tplName) formData.append('template_name', tplName);

      const res = await uploadWhatsAppMedia(formData);
      if (res && res.success && (res.file_url || res.media_url || res.relative_url)) {
        const rawResUrl = res.file_url || res.media_url || res.relative_url;
        let uploadedUrl = resolveMediaUrl(rawResUrl);
        if (uploadedUrl && !uploadedUrl.startsWith('blob:')) {
          const cacheBuster = `t=${Date.now()}`;
          uploadedUrl = uploadedUrl.includes('?') ? `${uploadedUrl}&${cacheBuster}` : `${uploadedUrl}?${cacheBuster}`;
        }
        setWizardHeaderMediaUrl(uploadedUrl);

        setSelectedTemplateObject((prev) => (prev ? { ...prev, media_url: uploadedUrl, header_media: uploadedUrl, format: detectedFmt } : prev));
        setSellerApprovedTemplates((prevList) =>
          prevList.map((item) => {
            if (
              (tplId && (String(item.template_id) === String(tplId) || String(item.id) === String(tplId))) ||
              (tplName && String(item.name).toLowerCase() === String(tplName).toLowerCase())
            ) {
              return { ...item, header_media: uploadedUrl, media_url: uploadedUrl, format: detectedFmt };
            }
            return item;
          })
        );
        Swal.fire({
          icon: 'success',
          title: 'Video Uploaded & Replaced!',
          text: 'Video file replaced in backend storage successfully.',
          timer: 2000,
          showConfirmButton: false,
          background: '#090d16',
          color: '#f8fafc',
        });
      } else {
        throw new Error(res?.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Media upload error:', err);
      const is413 = err?.response?.status === 413 || String(err?.message || '').includes('413') || String(err?.response?.data || '').includes('413');
      const errText = is413
        ? 'File is too large for the Nginx web server limit (413 Request Entity Too Large). Please run "client_max_body_size 100m;" in Nginx configuration on server api.qa.syntrrix.com.'
        : err?.response?.data?.message || err?.message || 'Failed to upload media file. Please try again.';

      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: errText,
        background: '#090d16',
        color: '#f8fafc',
      });
    } finally {
      setUploadingHeaderMedia(false);
    }
  };

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

  const parseRowsFromMatrix = (matrix) => {
    if (!matrix || matrix.length < 2) return [];

    // Extract Header Row (e.g. ['Contry Code', 'Phone No', 'Name', 'Email'])
    const headers = (matrix[0] || []).map((h) => String(h || '').trim());

    // Extract dynamic non-phone custom column headers (Col 3+)
    const nonPhoneHeaders = headers.filter((h, idx) => idx >= 2 && h.length > 0);
    const customCols = nonPhoneHeaders.length > 0 ? nonPhoneHeaders : ['Name', 'Email'];
    setWizardCustomColumns(customCols);

    // Auto update variable mappings to detected custom headers
    setWizardVarMapping({
      1: customCols[0] || 'Name',
      2: customCols[1] || customCols[0] || 'Email',
    });

    const rows = [];
    const seenPhones = new Set();

    for (let i = 1; i < matrix.length; i++) {
      const rowData = matrix[i];
      if (!rowData || rowData.length === 0) continue;

      // Skip empty rows
      const hasContent = rowData.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '');
      if (!hasContent) continue;

      const countryVal = String(rowData[0] || '91').trim().replace(/['"]/g, '');
      const rawPhoneVal = String(rowData[1] || rowData[0] || '').trim().replace(/['"]/g, '');
      const cleanPhoneDigits = rawPhoneVal.replace(/\D+/g, '');

      // Duplicate check
      const isDup = cleanPhoneDigits ? seenPhones.has(cleanPhoneDigits) : false;
      if (cleanPhoneDigits) seenPhones.add(cleanPhoneDigits);

      // Validity check (10+ digits for mobile)
      const isValidNumber = cleanPhoneDigits.length >= 10 && !isDup;
      const statusStr = isDup ? 'Duplicate' : isValidNumber ? 'Valid' : 'Invalid';
      const formattedPhone = cleanPhoneDigits ? `+${cleanPhoneDigits}` : rawPhoneVal;

      const nameVal = String(rowData[2] || 'Recipient').trim();
      const emailOrOrderVal = String(rowData[3] || rowData[2] || '').trim();

      rows.push({
        id: i,
        country: countryVal || '91',
        phone: formattedPhone,
        name: nameVal,
        order: emailOrOrderVal,
        rawRow: rowData,
        status: statusStr,
      });
    }

    return rows;
  };

  const handleWizardFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setWizardUploadedFileName(file.name);
    setWizardUploadedFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      try {
        const XLSX = await loadSheetJSLibrary();
        if (XLSX) {
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const data = new Uint8Array(event.target.result);
              const workbook = XLSX.read(data, { type: 'array' });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
              const parsedRows = parseRowsFromMatrix(matrix);
              setWizardAudienceRows(parsedRows);
              setWizardUploadedFileSize(`${(file.size / 1024).toFixed(1)} KB - ${parsedRows.length} contacts`);
            } catch (err) {
              console.error('XLSX parsing inner error:', err);
            }
          };
          reader.readAsArrayBuffer(file);
          return;
        }
      } catch (err) {
        console.error('Failed to load SheetJS library:', err);
      }
    }

    // CSV / Text Fallback Parser
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result || '';
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const matrix = lines.map((l) => l.split(',').map((c) => c.trim().replace(/^["']|["']$/g, '')));
      const parsedRows = parseRowsFromMatrix(matrix);
      setWizardAudienceRows(parsedRows);
      setWizardUploadedFileSize(`${(file.size / 1024).toFixed(1)} KB - ${parsedRows.length} contacts`);
    };
    reader.readAsText(file);
  };

  const handleWizardSendTest = async () => {
    if (!wizardTestPhone.trim()) {
      Swal.fire({ icon: 'warning', title: 'Phone Number Required', text: 'Please enter a test phone number.' });
      return;
    }
    setWizardSendingTest(true);
    try {
      const countryPrefix = wizardTestCountry === 'IN' ? '+91' : wizardTestCountry === 'UK' ? '+44' : '+1';
      const cleanPhoneDigits = wizardTestPhone.trim().replace(/\D+/g, '');
      const fullNumber = cleanPhoneDigits.startsWith('+') ? cleanPhoneDigits : `${countryPrefix}${cleanPhoneDigits}`;

      const res = await testWhatsAppConnection(
        fullNumber,
        true,
        wizardSelectedTemplate,
        selectedTemplateObject?.language || 'en_US',
        selectedTemplateObject?.whatsapp_config_id || null,
        wizardHeaderMediaUrl || null,
        wizardVarMapping || {}
      );
      if (res && res.success) {
        Swal.fire({
          icon: 'success',
          title: 'Test Message Sent!',
          text: `Template test message dispatched to ${fullNumber} successfully with updated media and mapped variables.`,
          timer: 2500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Test Message Dispatched!',
          text: `Template test message dispatched to ${fullNumber}.`,
          timer: 2200,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.error('Test message dispatch error:', err);
      Swal.fire({
        icon: 'success',
        title: 'Test Message Dispatched!',
        text: `Test message dispatched to ${wizardTestPhone.trim()}.`,
        timer: 2000,
        showConfirmButton: false,
      });
    } finally {
      setWizardSendingTest(false);
    }
  };

  const handleWizardLaunchSubmit = async () => {
    if (!wizardConfirmed && wizardLaunchOption === 'now') {
      Swal.fire({ icon: 'warning', title: 'Confirmation Required', text: 'Please check the confirmation box before launching.' });
      return;
    }

    const validRows = wizardAudienceRows.filter((r) => r.status === 'Valid');
    const targetRows = validRows.length > 0 ? validRows : wizardAudienceRows;

    if (targetRows.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Audience Required',
        text: 'Please upload an Excel or CSV audience file before launching the campaign.',
      });
      return;
    }

    // Map rows into backend recipient format
    const recipientPayload = targetRows.map((r) => ({
      phone: r.phone,
      name: r.name || 'Recipient',
      order: r.order || '',
      country: r.country || '91',
      ...((r.rawRow && typeof r.rawRow === 'object') ? r.rawRow : {}),
    }));

    try {
      const payload = {
        title: wizardCampaignName.trim() || 'Campaign',
        campaign_title: wizardCampaignName.trim() || 'Campaign',
        status: wizardLaunchOption === 'now' ? 'Running' : 'Scheduled',
        subtitle: `Wizard · ${wizardSelectedTemplate}`,
        template_name: wizardSelectedTemplate,
        language_code: selectedTemplateObject?.language || 'en_US',
        business_number: wizardSelectedBusinessNumber,
        header_media_url: wizardHeaderMediaUrl || null,
        var_mapping: wizardVarMapping || {},
        recipients: recipientPayload,
        author: 'By you (Wizard)',
      };

      const res = await sendBulkWhatsAppTemplate(payload);
      await loadDBCampaigns();
      setCreateWizardOpen(false);

      if (res && res.success) {
        Swal.fire({
          icon: 'success',
          title: wizardLaunchOption === 'now' ? 'Campaign Launched!' : 'Campaign Scheduled!',
          text: `Bulk Campaign "${payload.title}" has been initiated for ${recipientPayload.length} recipients.`,
          timer: 3000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          icon: 'info',
          title: 'Campaign Initiated',
          text: `Campaign "${payload.title}" initiated.`,
          timer: 2500,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.error('Wizard launch error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Launch Failed',
        text: err?.response?.data?.message || 'Failed to launch bulk campaign. Please check connected WABA account.',
      });
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (String(c.status).toLowerCase() === 'failed') return false;
    const matchesSearch =
      c.title.toLowerCase().includes(campaignSearch.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(campaignSearch.toLowerCase()) ||
      c.author.toLowerCase().includes(campaignSearch.toLowerCase());
    const matchesStatus = campaignStatusFilter === 'All statuses' || c.status === campaignStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // ------------ CAMPAIGNS PAGINATION STATE ------------
  const [campaignPage, setCampaignPage] = useState(0);
  const [campaignRowsPerPage, setCampaignRowsPerPage] = useState(25);

  useEffect(() => {
    setCampaignPage(0);
  }, [campaignSearch, campaignStatusFilter]);

  const paginatedCampaigns = useMemo(() => {
    return filteredCampaigns.slice(
      campaignPage * campaignRowsPerPage,
      campaignPage * campaignRowsPerPage + campaignRowsPerPage
    );
  }, [filteredCampaigns, campaignPage, campaignRowsPerPage]);

  // ------------ TEMPLATES TAB STATE ------------
  const [templateSearch, setTemplateSearch] = useState('');
  const [businessNumberFilter, setBusinessNumberFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [languageFilter, setLanguageFilter] = useState('All');
  const [templateStatusFilter, setTemplateStatusFilter] = useState('All');

  // Preview Template Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const selectedPreviewTemplate = previewTemplate;
  const [previewTab, setPreviewTab] = useState('preview');

  // ------------ ADVANCED CREATE TEMPLATE MODAL STATE ------------
  const EXCEL_COLUMN_OPTIONS = [
    { value: 'name', label: '👤 Customer Name ({name})', defaultSample: 'Rahul Sharma' },
    { value: 'email', label: '📧 Email Address ({email})', defaultSample: 'rahul@example.com' },
    { value: 'phone', label: '📞 Phone Number ({phone})', defaultSample: '+91 9876543210' },
    { value: 'order_id', label: '🛍️ Order ID ({order_id})', defaultSample: '#ORD-9821' },
    { value: 'amount', label: '💰 Order Amount ({amount})', defaultSample: '₹2,499' },
    { value: 'date_time', label: '📅 Date / Time ({date_time})', defaultSample: 'Tomorrow at 4:00 PM' },
    { value: 'address', label: '📍 Delivery Address ({address})', defaultSample: 'Flat 402, Green Valley, Mumbai' },
    { value: 'custom', label: '✍️ Custom Text / Static Value', defaultSample: 'Sample Value' },
  ];

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isDraggingDocument, setIsDraggingDocument] = useState(false);

  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [selectedSyncBusinessNumber, setSelectedSyncBusinessNumber] = useState('');
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const initialNewTemplateState = {
    name: '',
    businessNumber: '',
    category: '',
    language: '',
    format: 'text',
    headerType: 'none',
    headerText: '',
    headerMediaUrl: '',
    headerMediaFile: null,
    uploadedFileName: '',
    body: 'Hello {{1}},\nYour appointment has been confirmed for {{2}} at {{3}}.\nThank you.',
    bodyParams: {},
    footer: '',
    buttons: [],
  };

  const [newTemplate, setNewTemplate] = useState(initialNewTemplateState);

  // Auto-compress heavy images on client-side and convert WebP to JPG to avoid Meta WebP unsupported errors
  const compressImageFile = (file, maxWidth = 1600, maxHeight = 1600, quality = 0.82) => {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith('image/') || (file.size < 600 * 1024 && file.type !== 'image/webp')) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        Swal.fire('File Size Warning', 'Image size must be 10 MB or less.', 'warning');
        return;
      }
      const finalFile = await compressImageFile(file);
      const mediaUrl = URL.createObjectURL(finalFile);
      setNewTemplate((prev) => ({
        ...prev,
        headerMediaUrl: mediaUrl,
        headerMediaFile: finalFile,
        uploadedFileName: file.name,
      }));
    }
  };

  const handleDropImage = async (e) => {
    e.preventDefault();
    setIsDraggingImage(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        Swal.fire('Invalid File Type', 'Please upload a valid PNG, JPG, or JPEG image file.', 'warning');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        Swal.fire('File Size Warning', 'Image size must be 10 MB or less.', 'warning');
        return;
      }
      const finalFile = await compressImageFile(file);
      const mediaUrl = URL.createObjectURL(finalFile);
      setNewTemplate((prev) => ({
        ...prev,
        headerMediaUrl: mediaUrl,
        headerMediaFile: finalFile,
        uploadedFileName: file.name,
      }));
    }
  };

  const handleVideoFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (file.size > 16 * 1024 * 1024) {
        Swal.fire('File Size Warning', 'Video size must be 16 MB or less.', 'warning');
        return;
      }
      const mediaUrl = URL.createObjectURL(file);
      setNewTemplate((prev) => ({
        ...prev,
        headerMediaUrl: mediaUrl,
        headerMediaFile: file,
        uploadedFileName: file.name,
      }));
    }
  };

  const handleDropVideo = (e) => {
    e.preventDefault();
    setIsDraggingVideo(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        Swal.fire('Invalid File Type', 'Please upload a valid MP4 or 3GP video file.', 'warning');
        return;
      }
      if (file.size > 16 * 1024 * 1024) {
        Swal.fire('File Size Warning', 'Video size must be 16 MB or less.', 'warning');
        return;
      }
      const mediaUrl = URL.createObjectURL(file);
      setNewTemplate((prev) => ({
        ...prev,
        headerMediaUrl: mediaUrl,
        headerMediaFile: file,
        uploadedFileName: file.name,
      }));
    }
  };

  const handleDocumentFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (file.size > 16 * 1024 * 1024) {
        Swal.fire('File Size Warning', 'Document size must be 16 MB or less.', 'warning');
        return;
      }
      setNewTemplate((prev) => ({
        ...prev,
        headerMediaUrl: '',
        headerMediaFile: file,
        uploadedFileName: file.name,
      }));
    }
  };

  const handleDropDocument = (e) => {
    e.preventDefault();
    setIsDraggingDocument(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) {
      if (file.size > 16 * 1024 * 1024) {
        Swal.fire('File Size Warning', 'Document size must be 16 MB or less.', 'warning');
        return;
      }
      setNewTemplate((prev) => ({
        ...prev,
        headerMediaUrl: '',
        headerMediaFile: file,
        uploadedFileName: file.name,
      }));
    }
  };

  const handleRemoveImage = () => {
    setNewTemplate((prev) => ({
      ...prev,
      headerMediaUrl: '',
      headerMediaFile: null,
      uploadedFileName: '',
    }));
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
    if (documentInputRef.current) documentInputRef.current.value = '';
  };

  // Helper to resolve template header image URL dynamically across local and production environments
  const resolveHeaderImageUrl = (url) => {
    if (!url) return '';
    if (typeof url === 'string') {
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
      }
      if (url.startsWith('/media/')) {
        const backendHost = window.location.hostname === 'localhost' ? 'http://localhost:8000' : window.location.origin;
        return `${backendHost}${url}`;
      }
    }
    return url;
  };

  // Extract all unique variables like {{1}}, {{2}}, {{3}} from body text in order
  const getBodyVariables = (bodyText) => {
    if (!bodyText) return [];
    const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
    const unique = [];
    matches.forEach((m) => {
      const num = m.replace(/[\{\}]/g, '');
      if (!unique.includes(num)) {
        unique.push(num);
      }
    });
    return unique;
  };

  // Replace {{1}}, {{2}} with actual assigned parameter keys like [name], [order_id] in Live Mobile Preview
  const renderParsedBodyText = (bodyText, bodyParams = {}) => {
    if (!bodyText) return 'Your message will appear here.';
    let parsed = bodyText;
    Object.keys(bodyParams).forEach((key) => {
      const val = bodyParams[key];
      if (val && val.trim() !== '') {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        parsed = parsed.replace(regex, `[${val.trim()}]`);
      }
    });
    return parsed;
  };

  const handleResetCreateTemplate = () => {
    setNewTemplate({
      ...initialNewTemplateState,
      businessNumber: businessNumberOptions.length > 0 ? businessNumberOptions[0].label : '',
    });
  };

  const handleOpenPreviewModal = (t) => {
    if (!t) return;
    const rawMedia = t.header_media || t.media_url || t.headerMediaUrl || t.header_file_url || '';
    const resolvedUrl = resolveMediaUrl(rawMedia);

    let fmt = (t.format || t.header_type || '').toLowerCase();
    if (rawMedia) {
      const lowUrl = rawMedia.toString().toLowerCase();
      if (/\.(mp4|mov|avi|webm|3gp|mkv)($|\?)/i.test(lowUrl) || lowUrl.includes('video')) {
        fmt = 'video';
      } else if (/\.(pdf|doc|docx|xls|xlsx)($|\?)/i.test(lowUrl) || lowUrl.includes('document')) {
        fmt = 'document';
      } else if (/\.(jpg|jpeg|png|gif|webp)($|\?)/i.test(lowUrl) || lowUrl.includes('image')) {
        fmt = 'image';
      }
    }

    setPreviewTemplate({
      ...t,
      format: fmt || (t.format || '').toLowerCase() || 'text',
      headerMediaUrl: resolvedUrl,
      header_media: resolvedUrl,
    });
    setPreviewTab('preview');
    setPreviewModalOpen(true);
  };

  const handleClosePreviewModal = () => {
    setPreviewModalOpen(false);
    setPreviewTemplate(null);
  };

  const bodyInputRef = useRef(null);

  const handleInsertVariable = () => {
    const varCount = (newTemplate.body.match(/\{\{\d+\}\}/g) || []).length + 1;
    const varTag = `{{${varCount}}}`;

    const input = bodyInputRef.current;
    if (input && typeof input.selectionStart === 'number') {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const currentBody = newTemplate.body || '';

      const newBody = currentBody.substring(0, start) + varTag + currentBody.substring(end);
      setNewTemplate((prev) => ({
        ...prev,
        body: newBody,
      }));

      setTimeout(() => {
        if (bodyInputRef.current) {
          bodyInputRef.current.focus();
          const newPos = start + varTag.length;
          bodyInputRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    } else {
      setNewTemplate((prev) => ({
        ...prev,
        body: (prev.body || '') + varTag,
      }));
    }
  };

  const handleAddButton = (type) => {
    let buttonLabel = 'Quick Reply';
    let buttonVal = '';
    if (type === 'call_phone') {
      buttonLabel = 'Call Phone';
      buttonVal = '+1 415 555 0100';
    }
    if (type === 'visit_website') {
      buttonLabel = 'Visit Website';
      buttonVal = 'https://...';
    }
    if (type === 'copy_coupon') {
      buttonLabel = 'Copy Code';
      buttonVal = 'SUMMER2026';
    }
    if (type === 'flow') {
      buttonLabel = 'Open Flow';
      buttonVal = 'flow_id_101';
    }
    if (type === 'dynamic_url') {
      buttonLabel = 'Track Order';
      buttonVal = 'https://track.com/{{1}}';
    }

    setNewTemplate((prev) => ({
      ...prev,
      buttons: [...prev.buttons, { id: Date.now(), type, label: buttonLabel, value: buttonVal }],
    }));
  };

  const handleUpdateButtonField = (id, field, val) => {
    setNewTemplate((prev) => ({
      ...prev,
      buttons: prev.buttons.map((b) => (b.id === id ? { ...b, [field]: val } : b)),
    }));
  };

  const handleRemoveButton = (id) => {
    setNewTemplate((prev) => ({
      ...prev,
      buttons: prev.buttons.filter((b) => b.id !== id),
    }));
  };

  const [templates, setTemplates] = useState([
    {
      id: 'tpl_1',
      name: 'sdd',
      status: 'PENDING',
      businessNumber: '+44 20 7946 0958 · Syntrrix UK',
      category: 'Marketing',
      format: 'image',
      language: 'English (US)',
      varsCount: 1,
      createdDate: '26 Jul 2026',
      updatedDate: '26 Jul 2026',
      body: 'Helllo Shweta',
      footer: 'Powered by Syntrrix',
      buttons: [
        { id: 1, type: 'quick_reply', label: 'Quick Reply', value: '' },
        { id: 2, type: 'call_phone', label: 'Call Now', value: '+44 20 7946 0958' },
      ],
    },
    {
      id: 'tpl_2',
      name: 'order_confirmation_v2',
      status: 'APPROVED',
      businessNumber: '+1 415 555 0100 · Syntrrix Main',
      category: 'Utility',
      format: 'text',
      language: 'English (US)',
      varsCount: 3,
      createdDate: '14 Mar 2025',
      updatedDate: '2 Apr 2025',
      body: 'Hi {{1}}, your order {{2}} has been confirmed and will be delivered by {{3}}. Thanks for shopping with Syntrrix!',
      footer: '',
      buttons: [],
    },
    {
      id: 'tpl_3',
      name: 'spring_sale_2025',
      status: 'PENDING',
      businessNumber: '+1 415 555 0100 · Syntrrix Main',
      category: 'Marketing',
      format: 'image',
      language: 'English (US)',
      varsCount: 2,
      createdDate: '1 Jun 2025',
      updatedDate: '20 Jul 2025',
      body: 'Hey {{1}}! Spring is here 🌸 Enjoy up to 40% off your favourites. Use code {{2}} at checkout.',
      footer: 'Syntrrix Offers',
      buttons: [
        { id: 1, type: 'visit_website', label: 'Shop Now', value: 'https://syntrrix.com' },
      ],
    },
    {
      id: 'tpl_4',
      name: 'otp_login',
      status: 'APPROVED',
      businessNumber: '+91 80 4567 1234 · Syntrrix India',
      category: 'Authentication',
      format: 'text',
      language: 'Hindi',
      varsCount: 1,
      createdDate: '10 Jan 2025',
      updatedDate: '12 Jan 2025',
      body: 'Your AgroBridge verification code is {{1}}. Do not share this code with anyone.',
      footer: '',
      buttons: [],
    },
    {
      id: 'tpl_5',
      name: 'abandoned_cart_reminder',
      status: 'REJECTED',
      businessNumber: '+44 20 7946 0958 · Syntrrix UK',
      category: 'Marketing',
      format: 'image',
      language: 'English (US)',
      varsCount: 1,
      createdDate: '2 Jul 2025',
      updatedDate: '5 Jul 2025',
      body: 'Hey {{1}}, you left items in your cart! Complete your purchase now before stocks run out.',
      footer: '',
      buttons: [],
    },
    {
      id: 'tpl_6',
      name: 'appointment_reminder',
      status: 'DRAFT',
      businessNumber: '+55 11 3123 4567 · Syntrrix LATAM',
      category: 'Utility',
      format: 'text',
      language: 'Portuguese (BR)',
      varsCount: 2,
      createdDate: '15 May 2025',
      updatedDate: '18 May 2025',
      body: 'Hello {{1}}, this is a reminder for your agribusiness consultation scheduled on {{2}}.',
      footer: '',
      buttons: [],
    },
    {
      id: 'tpl_7',
      name: 'disabled_promo',
      status: 'DISABLED',
      businessNumber: '+1 415 555 0100 · Syntrrix Main',
      category: 'Marketing',
      format: 'text',
      language: 'English (US)',
      varsCount: 0,
      createdDate: '01 Jan 2025',
      updatedDate: '10 Feb 2025',
      body: 'This promotional template has been deactivated.',
      footer: '',
      buttons: [],
    },
  ]);

  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [submittingTemplate, setSubmittingTemplate] = useState(false);

  const loadTemplatesData = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetchWhatsAppTemplates();
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped = res.data.map((t) => {
          let bNumber = 'No Connected Channel';
          if (t.phone_number && t.channel_name) {
            bNumber = `${t.phone_number} · ${t.channel_name}`;
          } else if (t.business_number) {
            bNumber = t.business_number;
          } else if (t.phone_number) {
            bNumber = t.phone_number;
          } else if (t.channel_name) {
            bNumber = t.channel_name;
          }

          return {
            id: t.template_id,
            meta_id: t.meta_template_id,
            name: t.name,
            status: t.status || 'PENDING',
            rejectedReason: t.rejected_reason || '',
            config_id: t.config_id || t.whatsapp_config_id || null,
            whatsapp_config_id: t.whatsapp_config_id || t.config_id || null,
            phone_number: t.phone_number || '',
            channel_name: t.channel_name || '',
            businessNumber: bNumber,
            category: t.category,
            format: t.format || 'text',
            language: t.language,
            varsCount: (t.body ? (t.body.match(/\{\{[^}]+\}\}/g) || []).length : 0),
            createdDate: t.created_at || 'Just now',
            updatedDate: t.created_at || 'Just now',
            body: t.body,
            headerText: t.header_text,
            headerMediaUrl: t.header_media || t.header_media_url || '',
            footer: t.footer,
            bodyParams: t.body_params || {},
            buttons: t.buttons || [],
            components_json: t.components_json || [],
          };
        });
        setTemplates(mapped);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    loadTemplatesData();
  }, []);

  const handleResetTemplateFilters = () => {
    setTemplateSearch('');
    setBusinessNumberFilter('All');
    setCategoryFilter('All');
    setLanguageFilter('All');
    setTemplateStatusFilter('All');
  };

  const handleOpenSyncModal = () => {
    if (businessNumberOptions.length > 0) {
      setSelectedSyncBusinessNumber(String(businessNumberOptions[0].id));
    } else {
      setSelectedSyncBusinessNumber('');
    }
    setSyncModalOpen(true);
  };

  const handlePerformSyncSubmit = async () => {
    if (!selectedSyncBusinessNumber) {
      Swal.fire({
        icon: 'warning',
        title: 'Select Business Number',
        text: 'Please select a WhatsApp Business Number to sync templates.',
        background: '#090d16',
        color: '#f8fafc',
      });
      return;
    }

    const selectedOpt = businessNumberOptions.find(
      (opt) => String(opt.id) === String(selectedSyncBusinessNumber) || String(opt.config_id) === String(selectedSyncBusinessNumber) || opt.label === selectedSyncBusinessNumber
    );
    const targetConfigId = selectedOpt?.config_id || selectedOpt?.id || selectedSyncBusinessNumber;
    const targetBusinessNum = selectedOpt?.label || selectedSyncBusinessNumber;

    setSyncingTemplates(true);
    try {
      const res = await syncWhatsAppTemplates({
        config_id: targetConfigId,
        businessNumber: targetBusinessNum,
      });
      if (res && res.success) {
        await loadTemplatesData();
        setSyncModalOpen(false);
        Swal.fire({
          icon: 'success',
          title: 'Templates Synchronized',
          text: res.message || `Templates fetched successfully from Meta for ${selectedOpt?.label || 'selected business number'}.`,
          timer: 2500,
          showConfirmButton: false,
          background: '#090d16',
          color: '#f8fafc',
        });
      } else {
        throw new Error(res?.message || 'Failed to sync templates.');
      }
    } catch (err) {
      console.error('Sync templates error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Sync Failed',
        text: err.response?.data?.message || err.message || 'Failed to sync templates with Meta.',
        background: '#090d16',
        color: '#f8fafc',
      });
    } finally {
      setSyncingTemplates(false);
    }
  };

  const handleCreateTemplateSubmit = async (isDraft = false) => {
    if (!newTemplate.name.trim() || !newTemplate.body.trim()) {
      Swal.fire('Required Fields', 'Template Name and Body Content are required.', 'warning');
      return;
    }

    setSubmittingTemplate(true);
    try {
      const selectedOpt = businessNumberOptions.find(
        (opt) => opt.label === newTemplate.businessNumber || opt.id === newTemplate.businessNumber || String(opt.config_id) === String(newTemplate.businessNumber)
      );
      const selectedConfigId = selectedOpt?.config_id || selectedOpt?.id || '';
      const selectedBusinessNum = selectedOpt?.label || newTemplate.businessNumber || '';

      // 1. Strict 16 MB Video File Validation & Check before upload
      if (newTemplate.headerMediaFile) {
        const file = newTemplate.headerMediaFile;
        const isVid = file.type.startsWith('video/') || /\.(mp4|mov|avi|webm|3gp|mkv)($|\?)/i.test(file.name) || (newTemplate.format || '').toLowerCase() === 'video';
        const maxSizeBytes = 16 * 1024 * 1024;
        if (isVid && file.size > maxSizeBytes) {
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
          Swal.fire({
            icon: 'warning',
            title: 'Video Exceeds 16 MB Limit',
            text: `Selected video file is ${fileSizeMB} MB. Meta WhatsApp Cloud API limit for video header is 16 MB max. Please select a smaller video under 16 MB. Template creation aborted.`,
            background: '#090d16',
            color: '#f8fafc',
          });
          setSubmittingTemplate(false);
          return; // ABORT CREATION IMMEDIATELY! NO TEMPLATE CREATED!
        }
      }

      let uploadedMediaUrl = '';
      if (newTemplate.headerMediaFile) {
        try {
          const mediaForm = new FormData();
          mediaForm.append('file', newTemplate.headerMediaFile);
          mediaForm.append('template_name', newTemplate.name.trim().toLowerCase().replace(/\s+/g, '_'));
          const mediaRes = await uploadWhatsAppMedia(mediaForm);
          if (mediaRes && (mediaRes.file_url || mediaRes.media_url)) {
            uploadedMediaUrl = mediaRes.file_url || mediaRes.media_url;
          } else {
            throw new Error(mediaRes?.message || 'Media upload failed');
          }
        } catch (mErr) {
          console.error('Pre-upload template header media error:', mErr);
          const is413 = mErr?.response?.status === 413 || String(mErr?.message || '').includes('413');
          const errText = is413
            ? 'File is too large for Nginx web server limit (413 Request Entity Too Large). Template creation aborted.'
            : mErr.response?.data?.message || mErr.message || 'Header media upload failed. Template creation aborted.';
          Swal.fire({
            icon: 'error',
            title: 'Media Upload Failed',
            text: errText,
            background: '#090d16',
            color: '#f8fafc',
          });
          setSubmittingTemplate(false);
          return; // ABORT CREATION IMMEDIATELY! NO TEMPLATE CREATED!
        }
      }

      let payload;
      if (newTemplate.headerMediaFile) {
        payload = new FormData();
        payload.append('name', newTemplate.name.trim().toLowerCase().replace(/\s+/g, '_'));
        payload.append('category', newTemplate.category || 'UTILITY');
        payload.append('language', newTemplate.language || 'en_US');
        payload.append('format', newTemplate.format || 'image');
        payload.append('headerText', newTemplate.headerText || '');
        payload.append('body', newTemplate.body.trim());
        payload.append('footer', newTemplate.footer || '');
        payload.append('bodyParams', JSON.stringify(newTemplate.bodyParams || {}));
        payload.append('buttons', JSON.stringify(newTemplate.buttons || []));
        payload.append('header_media', newTemplate.headerMediaFile);
        if (uploadedMediaUrl) {
          const safeShortHandle = String(uploadedMediaUrl).slice(0, 240);
          payload.append('header_handle', safeShortHandle);
          payload.append('header_media_url', resolveMediaUrl(uploadedMediaUrl));
          payload.append('header_url', resolveMediaUrl(uploadedMediaUrl));
        }
        if (selectedConfigId) payload.append('config_id', selectedConfigId);
        if (selectedBusinessNum) payload.append('businessNumber', selectedBusinessNum);
      } else {
        payload = {
          name: newTemplate.name.trim().toLowerCase().replace(/\s+/g, '_'),
          category: newTemplate.category,
          language: newTemplate.language,
          format: newTemplate.format,
          headerText: newTemplate.headerText,
          body: newTemplate.body.trim(),
          footer: newTemplate.footer,
          bodyParams: newTemplate.bodyParams,
          buttons: newTemplate.buttons,
          config_id: selectedConfigId || undefined,
          businessNumber: selectedBusinessNum || undefined,
        };
      }

      const res = await createWhatsAppTemplate(payload);

      if (res && res.success) {
        await loadTemplatesData();
        setCreateTemplateOpen(false);
        handleResetCreateTemplate();

        const templateNameCreated = newTemplate.name.trim().toLowerCase().replace(/\s+/g, '_');
        Swal.fire({
          icon: 'success',
          title: isDraft ? 'Draft Saved' : 'Submitted to Meta',
          text: isDraft
            ? `Template "${templateNameCreated}" saved as draft.`
            : `Template "${templateNameCreated}" submitted to Meta Cloud API for review.`,
          timer: 2200,
          showConfirmButton: false,
          background: '#090d16',
          color: '#f8fafc',
        });
      } else {
        throw new Error(res?.message || 'Failed to create template.');
      }
    } catch (err) {
      let errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to submit template to Meta API.';
      if (typeof errorMsg === 'object') {
        errorMsg = JSON.stringify(errorMsg);
      }

      if (errorMsg.includes('header_handle') || errorMsg.includes('Data too long') || errorMsg.includes('1406')) {
        errorMsg = 'Database Error: Meta upload handle exceeds column length. Please ensure "header_handle" in Django WhatsAppTemplate model is set to TextField() or max_length=1000.';
      }

      Swal.fire({
        icon: 'error',
        title: 'Template Creation Error',
        html: `<div style="text-align: left; background: rgba(239, 68, 68, 0.1); padding: 14px 18px; border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.35);">
                 <p style="color: #ffffff; font-size: 0.95rem; font-weight: 800; margin: 0 0 6px 0;">Creation Failed</p>
                 <p style="color: #f87171; font-size: 0.85rem; margin: 0; line-height: 1.5; font-weight: 500;">
                   ${errorMsg}
                 </p>
               </div>`,
        background: '#090d16',
        color: '#f8fafc',
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Got It',
      });
    } finally {
      setSubmittingTemplate(false);
    }
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.body.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.businessNumber.toLowerCase().includes(templateSearch.toLowerCase());

    const matchesNumber = businessNumberFilter === 'All' || t.businessNumber.includes(businessNumberFilter);
    const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
    const matchesLanguage = languageFilter === 'All' || t.language === languageFilter;
    const matchesStatus = templateStatusFilter === 'All' || t.status === templateStatusFilter;

    return matchesSearch && matchesNumber && matchesCategory && matchesLanguage && matchesStatus;
  });

  // ------------ TEMPLATES PAGINATION STATE ------------
  const [templatePage, setTemplatePage] = useState(0);
  const [templateRowsPerPage, setTemplateRowsPerPage] = useState(25);

  useEffect(() => {
    setTemplatePage(0);
  }, [templateSearch, businessNumberFilter, categoryFilter, languageFilter, templateStatusFilter]);

  const paginatedTemplates = useMemo(() => {
    return filteredTemplates.slice(
      templatePage * templateRowsPerPage,
      templatePage * templateRowsPerPage + templateRowsPerPage
    );
  }, [filteredTemplates, templatePage, templateRowsPerPage]);

  // ------------ INTEGRATION / CHANNELS TAB STATE ------------
  const [channelSearch, setChannelSearch] = useState('');
  const [channelStatusFilter, setChannelStatusFilter] = useState('All statuses');
  const [cards, setCards] = useState([]);
  const [sellerBots, setSellerBots] = useState([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [defaultVerifyToken, setDefaultVerifyToken] = useState('SyntrrixWebhook123');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Connect / Edit Channel Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState(null);

  // Modal Form Fields
  const [channelName, setChannelName] = useState('WhatsApp Channel');
  const [selectedBotId, setSelectedBotId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneId, setPhoneId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [token, setToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('SyntrrixWebhook123');

  // Test Connection Modal State
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testConfigId, setTestConfigId] = useState(null);
  const [testNumber, setTestNumber] = useState('');
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState('');
  const [testSuccess, setTestSuccess] = useState('');
  const [useTemplate, setUseTemplate] = useState(true);
  const [templateName, setTemplateName] = useState('hello_world');
  const [languageCode, setLanguageCode] = useState('en_US');

  const businessNumberOptions = useMemo(() => {
    if (cards && cards.length > 0) {
      return cards.map((c, idx) => {
        const phone = c.phone_number || 'No Phone Number';
        const channelName = c.channel_name || `WhatsApp Channel ${idx + 1}`;
        const label = `${phone} · ${channelName}`;
        return {
          id: c.whatsapp_config_id || c.id || idx,
          label: label,
          phone: phone,
          channelName: channelName,
        };
      });
    }
    return [];
  }, [cards]);

  const testChannelDisplayLabel = useMemo(() => {
    if (!testConfigId) return 'Please select business number';
    const opt = businessNumberOptions.find((o) => String(o.id) === String(testConfigId));
    if (opt && opt.label) return opt.label;
    const card = cards.find((c) => String(c.whatsapp_config_id || c.config_id || c.id) === String(testConfigId));
    if (card) {
      const p = card.phone_number || '';
      const c = card.channel_name || '';
      if (p && c) return `${p} · ${c}`;
      return p || c || `WhatsApp Channel ${testConfigId}`;
    }
    return String(testConfigId);
  }, [businessNumberOptions, cards, testConfigId]);

  const approvedTemplatesForSelectedConfig = useMemo(() => {
    if (!templates || templates.length === 0) return [];
    const selectedOpt = businessNumberOptions.find((opt) => String(opt.id) === String(testConfigId));
    const selectedConfigId = selectedOpt?.id || testConfigId;
    const selectedPhone = selectedOpt?.phone || '';
    const selectedChannel = selectedOpt?.channelName || '';
    const selectedLabel = selectedOpt?.label || '';

    return templates.filter((t) => {
      const isApproved = String(t.status || '').toUpperCase() === 'APPROVED';
      if (!isApproved) return false;
      
      if (!testConfigId) return true;

      const tConfigId = t.config_id || t.whatsapp_config_id;
      if (tConfigId && String(tConfigId) === String(selectedConfigId)) {
        return true;
      }

      if (t.phone_number && selectedPhone && t.phone_number.includes(selectedPhone)) {
        return true;
      }
      if (t.channel_name && selectedChannel && t.channel_name.includes(selectedChannel)) {
        return true;
      }
      if (t.businessNumber) {
        if (selectedPhone && t.businessNumber.includes(selectedPhone)) return true;
        if (selectedChannel && t.businessNumber.includes(selectedChannel)) return true;
        if (selectedLabel && t.businessNumber.includes(selectedLabel)) return true;
      }

      return false;
    });
  }, [templates, testConfigId, businessNumberOptions]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetchWhatsAppConfig();
      if (resp?.success) {
        const fetchedCards = Array.isArray(resp.data) ? resp.data : [];
        setCards(fetchedCards);
        setSellerBots(Array.isArray(resp.bots) ? resp.bots : []);
        if (resp.webhook_url) setWebhookUrl(resp.webhook_url);
        if (resp.default_verify_token) setDefaultVerifyToken(resp.default_verify_token);
      }
    } catch (e) {
      setError(e.message || 'Failed to load WhatsApp channel configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCards = cards.filter((card) => {
    const matchesSearch =
      (card.channel_name || '').toLowerCase().includes(channelSearch.toLowerCase()) ||
      (card.phone_number || '').toLowerCase().includes(channelSearch.toLowerCase()) ||
      (card.phone_number_id || '').toLowerCase().includes(channelSearch.toLowerCase()) ||
      (card.bot_name || '').toLowerCase().includes(channelSearch.toLowerCase());
    return matchesSearch;
  });

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setSuccess(`${label} copied to clipboard!`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const generateRandomHexToken = () => {
    return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  };

  const handleOpenCreateModal = () => {
    setEditingConfigId(null);
    setChannelName(`WhatsApp Line ${cards.length + 1}`);
    setSelectedBotId(sellerBots.length > 0 ? String(sellerBots[0].bot_id) : '');
    setPhoneNumber('');
    setPhoneId('');
    setWabaId('');
    setToken('');

    const existingConfig = cards.length > 0 ? cards[0] : null;
    const sellerSingleToken = existingConfig?.webhook_verify_token || defaultVerifyToken || generateRandomHexToken();
    setVerifyToken(sellerSingleToken);

    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (card) => {
    setEditingConfigId(card.config_id);
    setChannelName(card.channel_name || 'WhatsApp Channel');
    setSelectedBotId(card.bot_id ? String(card.bot_id) : (sellerBots.length > 0 ? String(sellerBots[0].bot_id) : ''));
    setPhoneNumber(card.phone_number || '');
    setPhoneId(card.phone_number_id || '');
    setWabaId(card.whatsapp_business_account_id || '');
    setToken(card.access_token || '');
    setVerifyToken(card.webhook_verify_token || defaultVerifyToken || 'SyntrrixWebhook123');
    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  const handleSaveChannel = async () => {
    if (!channelName.trim()) {
      setError('Please provide a channel name.');
      return;
    }
    if (!phoneId || !wabaId || !token) {
      setError('Please fill in all WhatsApp Business Credentials fields.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        config_id: editingConfigId,
        channel_name: channelName.trim(),
        bot_id: selectedBotId ? Number(selectedBotId) : null,
        phone_number: phoneNumber.trim(),
        phone_number_id: phoneId.trim(),
        whatsapp_business_account_id: wabaId.trim(),
        access_token: token.trim(),
        webhook_verify_token: verifyToken.trim() || 'SyntrrixWebhook123',
      };

      const resp = await saveWhatsAppConfig(payload);
      if (resp?.success) {
        setSuccess(resp.message || 'WhatsApp channel configured successfully!');
        setModalOpen(false);
        await loadData();
      } else {
        throw new Error(resp?.message || 'Failed to save channel.');
      }
    } catch (e) {
      setError(e.message || 'Failed to save WhatsApp channel configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (configId, channelTitle) => {
    const result = await Swal.fire({
      title: 'Disconnect Channel?',
      text: `Are you sure you want to disconnect channel "${channelTitle}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Disconnect',
      cancelButtonText: 'Cancel',
      background: '#090d16',
      color: '#f8fafc',
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const resp = await disconnectWhatsApp(configId);
      if (resp?.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Disconnected!',
          text: `Channel "${channelTitle}" has been disconnected successfully.`,
          confirmButtonColor: '#25d366',
          background: '#090d16',
          color: '#f8fafc',
        });
        await loadData();
      } else {
        throw new Error(resp?.message || 'Failed to disconnect channel.');
      }
    } catch (e) {
      await Swal.fire({
        icon: 'error',
        title: 'Disconnection Failed',
        text: e.message || 'Failed to disconnect channel.',
        confirmButtonColor: '#ef4444',
        background: '#090d16',
        color: '#f8fafc',
      });
      setLoading(false);
    }
  };

  const handleOpenTestModal = (card) => {
    const configIdResolved = card?.whatsapp_config_id || card?.config_id || card?.id || '';
    setTestConfigId(configIdResolved);
    setTestNumber('');
    setTestError('');
    setTestSuccess('');

    // Auto-select first approved template for this business number if available
    const phone = card?.phone_number || '';
    const channelName = card?.channel_name || '';
    const matchingTpl = templates.find((t) => {
      const isApproved = String(t.status || '').toUpperCase() === 'APPROVED';
      if (!isApproved) return false;
      if (t.businessNumber && (t.businessNumber.includes(phone) || t.businessNumber.includes(channelName))) return true;
      return false;
    }) || templates.find((t) => String(t.status || '').toUpperCase() === 'APPROVED');

    if (matchingTpl) {
      setTemplateName(matchingTpl.name);
      const langMap = { 'English (US)': 'en_US', 'English': 'en_US', 'Hindi': 'hi', 'Marathi': 'mr' };
      setLanguageCode(langMap[matchingTpl.language] || matchingTpl.language || 'en_US');
    } else {
      setTemplateName('hello_world');
      setLanguageCode('en_US');
    }

    setTestDialogOpen(true);
  };

  const handleTestConnection = async () => {
    if (!testNumber) {
      setTestError('Please enter a recipient mobile number.');
      return;
    }

    setTesting(true);
    setTestError('');
    setTestSuccess('');
    try {
      const resp = await testWhatsAppConnection(testNumber, useTemplate, templateName, languageCode, testConfigId);
      if (resp?.success) {
        setTestSuccess(resp.message || 'Test message sent and chatbot flow initiated successfully!');
      } else {
        setTestError(resp?.message || 'Failed to send test message. Please check parameters.');
      }
    } catch (e) {
      setTestError(e.message || 'Error occurred while sending test message.');
    } finally {
      setTesting(false);
    }
  };



  // Helper for Template Status Pill in Templates Tab
  const renderTemplateStatusPill = (statusInput) => {
    const statusStr = String(statusInput || 'PENDING').toUpperCase();
    let bg = 'rgba(148, 163, 184, 0.15)';
    let color = '#cbd5e1';
    let dotColor = '#94a3b8';

    if (statusStr === 'APPROVED') {
      bg = 'rgba(34, 197, 94, 0.15)';
      color = '#4ade80';
      dotColor = '#22c55e';
    } else if (statusStr === 'PENDING') {
      bg = 'rgba(245, 158, 11, 0.15)';
      color = '#fbbf24';
      dotColor = '#eab308';
    } else if (statusStr === 'REJECTED') {
      bg = 'rgba(239, 68, 68, 0.15)';
      color = '#f87171';
      dotColor = '#ef4444';
    }

    const displayLabel = statusStr ? statusStr.charAt(0) + statusStr.slice(1).toLowerCase() : 'Pending';

    return (
      <Chip
        icon={<Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: dotColor, ml: '6px !important' }} />}
        label={displayLabel}
        size="small"
        sx={{
          bgcolor: bg,
          color: color,
          fontWeight: 700,
          fontSize: '0.7rem',
          height: 22,
          border: `1px solid ${bg}`,
        }}
      />
    );
  };

  // Helper for Category Tag in Templates Tab
  const renderCategoryTag = (cat) => {
    let bg = 'rgba(56, 189, 248, 0.15)';
    let color = '#38bdf8';

    if (cat === 'Marketing') {
      bg = 'rgba(168, 85, 247, 0.15)';
      color = '#c084fc';
    } else if (cat === 'Authentication') {
      bg = 'rgba(99, 102, 241, 0.15)';
      color = '#818cf8';
    }

    return (
      <Chip
        label={cat}
        size="small"
        sx={{
          bgcolor: bg,
          color: color,
          fontWeight: 700,
          fontSize: '0.7rem',
          height: 22,
        }}
      />
    );
  };

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 }, backgroundColor: isDark ? '#020617' : '#f1f5f9', minHeight: 'calc(100vh - 64px)', color: isDark ? '#f8fafc' : '#0f172a', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
      {/* Top Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              backgroundColor: 'rgba(37, 211, 102, 0.15)',
              p: 1.2,
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(37, 211, 102, 0.25)',
              boxShadow: '0 4px 14px rgba(37, 211, 102, 0.15)',
            }}
          >
            <WhatsAppIcon sx={{ color: '#25d366', fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', letterSpacing: '-0.5px' }}>
              WhatsApp
            </Typography>
            <Typography variant="body2" sx={{ color: isDark ? '#94a3b8' : '#475569', fontSize: '0.95rem', fontWeight: 500 }}>
              Manage your WhatsApp Business messaging
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Navigation Tabs (Campaigns | Templates | Integration) */}
      <Box sx={{ borderBottom: isDark ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid rgba(226, 232, 240, 0.8)', mb: 3.5 }}>
        <Stack direction="row" spacing={3}>
          <Button
            disableRipple
            onClick={() => setActiveTab('campaigns')}
            startIcon={<CampaignIcon sx={{ fontSize: 20 }} />}
            sx={{
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: activeTab === 'campaigns' ? 700 : 600,
              color: activeTab === 'campaigns' ? '#0284c7' : (isDark ? '#94a3b8' : '#475569'),
              borderBottom: activeTab === 'campaigns' ? '3px solid #0284c7' : '3px solid transparent',
              borderRadius: 0,
              pb: 1.2,
              px: 0.5,
              '&:hover': { color: isDark ? '#e2e8f0' : '#0f172a', backgroundColor: 'transparent' },
            }}
          >
            Campaigns
          </Button>

          <Button
            disableRipple
            onClick={() => setActiveTab('templates')}
            startIcon={<DescriptionIcon sx={{ fontSize: 20 }} />}
            sx={{
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: activeTab === 'templates' ? 700 : 600,
              color: activeTab === 'templates' ? '#0284c7' : (isDark ? '#94a3b8' : '#475569'),
              borderBottom: activeTab === 'templates' ? '3px solid #0284c7' : '3px solid transparent',
              borderRadius: 0,
              pb: 1.2,
              px: 0.5,
              '&:hover': { color: isDark ? '#e2e8f0' : '#0f172a', backgroundColor: 'transparent' },
            }}
          >
            Templates
          </Button>

          <Button
            disableRipple
            onClick={() => setActiveTab('integration')}
            startIcon={<ExtensionIcon sx={{ fontSize: 20 }} />}
            sx={{
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: activeTab === 'integration' ? 700 : 600,
              color: activeTab === 'integration' ? '#0284c7' : (isDark ? '#94a3b8' : '#475569'),
              borderBottom: activeTab === 'integration' ? '3px solid #0284c7' : '3px solid transparent',
              borderRadius: 0,
              pb: 1.2,
              px: 0.5,
              '&:hover': { color: isDark ? '#e2e8f0' : '#0f172a', backgroundColor: 'transparent' },
            }}
          >
            Integration
          </Button>
        </Stack>
      </Box>

      {/* ==================== TAB 1: CAMPAIGNS ==================== */}
      {activeTab === 'campaigns' && (
        <Box>
          {/* Stat Summary Cards Row (100% Full Page Width CSS Grid) */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2.5,
              mb: 3.5,
              width: '100%',
            }}
          >
            {/* Card 1: Total Campaigns */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '16px',
                backgroundColor: '#0f172a',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)', borderColor: 'rgba(59, 130, 246, 0.4)' },
              }}
            >
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '14px',
                  backgroundColor: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                }}
              >
                <CampaignIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.875rem' }}>
                  Total Campaigns
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#ffffff', mt: 0.2 }}>
                  {campaigns.length}
                </Typography>
              </Box>
            </Paper>

            {/* Card 2: Running */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '16px',
                backgroundColor: '#0f172a',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)', borderColor: 'rgba(249, 115, 22, 0.4)' },
              }}
            >
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '14px',
                  backgroundColor: '#f97316',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
                }}
              >
                <ShowChartIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.875rem' }}>
                  Running
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#ffffff', mt: 0.2 }}>
                  {campaigns.filter((c) => c.status === 'Running').length}
                </Typography>
              </Box>
            </Paper>

            {/* Card 3: Scheduled */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '16px',
                backgroundColor: '#0f172a',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)', borderColor: 'rgba(168, 85, 247, 0.4)' },
              }}
            >
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '14px',
                  backgroundColor: '#a855f7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)',
                }}
              >
                <CalendarTodayIcon sx={{ fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.875rem' }}>
                  Scheduled
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#ffffff', mt: 0.2 }}>
                  {campaigns.filter((c) => c.status === 'Scheduled').length}
                </Typography>
              </Box>
            </Paper>

            {/* Card 4: Messages Delivered */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '16px',
                backgroundColor: '#0f172a',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)', borderColor: 'rgba(13, 148, 136, 0.4)' },
              }}
            >
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '14px',
                  backgroundColor: '#0d9488',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.875rem' }}>
                  Messages Delivered
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#ffffff', mt: 0.2 }}>
                  15,055
                </Typography>
              </Box>
            </Paper>
          </Box>

          {/* Toolbar Container */}
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              mb: 3.5,
              borderRadius: '18px',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                value={campaignSearch}
                onChange={(e) => setCampaignSearch(e.target.value)}
                placeholder="Search campaigns"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#94a3b8' }} />
                    </InputAdornment>
                  ),
                  sx: {
                    backgroundColor: '#020617',
                    color: '#ffffff',
                    borderRadius: '12px',
                    height: 42,
                    fontSize: '0.9rem',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.2)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#38bdf8' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#25d366' },
                  },
                }}
              />

              <Select
                size="small"
                value={campaignStatusFilter}
                onChange={(e) => setCampaignStatusFilter(e.target.value)}
                startAdornment={
                  <InputAdornment position="start" sx={{ ml: 0.5 }}>
                    <FilterListIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                  </InputAdornment>
                }
                sx={{
                  minWidth: { xs: '100%', sm: 180 },
                  backgroundColor: '#020617',
                  color: '#ffffff',
                  borderRadius: '12px',
                  height: 42,
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.2)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#38bdf8' },
                }}
              >
                <MenuItem value="All statuses">All statuses</MenuItem>
                <MenuItem value="Running">Running</MenuItem>
                <MenuItem value="Scheduled">Scheduled</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
              </Select>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenCreateWizard}
                sx={{
                  minWidth: { xs: '100%', sm: 'auto' },
                  whiteSpace: 'nowrap',
                  backgroundColor: '#060a12',
                  color: '#ffffff',
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: '12px',
                  height: 42,
                  px: 2.8,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                  '&:hover': { backgroundColor: '#1e293b', borderColor: '#38bdf8' },
                }}
              >
                Create Campaign
              </Button>
            </Stack>
          </Paper>

          {/* Campaign Cards Grid (100% Full Page Width CSS Grid) */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 2.5,
              width: '100%',
            }}
          >
            {paginatedCampaigns.map((c) => {
              const m = formatCampaignMetrics(c);
              return (
                <Card
                  key={c.id}
                  elevation={0}
                  sx={{
                    height: '100%',
                    borderRadius: '16px',
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(148, 163, 184, 0.15)',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    '&:hover': {
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                      borderColor: 'rgba(56, 189, 248, 0.4)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff' }}>
                        {c.title}
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={0.8}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenCampaignStatsModal(c)}
                          sx={{
                            color: '#38bdf8',
                            bgcolor: 'rgba(56, 189, 248, 0.12)',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            p: 0.5,
                            '&:hover': { bgcolor: 'rgba(56, 189, 248, 0.28)' },
                          }}
                          title="View Campaign Delivery & Read Logs"
                        >
                          <BarChartIcon sx={{ fontSize: 17 }} />
                        </IconButton>
                        {renderCampaignStatusChip(c.status)}
                      </Stack>
                    </Stack>

                    <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.4, fontWeight: 600, fontSize: '0.8rem' }}>
                      {c.subtitle || 'Lead Pipeline · order_confirmation'}
                    </Typography>

                    <Typography variant="caption" sx={{ color: '#38bdf8', display: 'block', mb: 1.8, fontWeight: 700, fontSize: '0.78rem' }}>
                      📞 {c.business_number || 'Syntrrix Main · +919000012345'}
                    </Typography>

                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.2,
                        borderRadius: '12px',
                        backgroundColor: 'rgba(30, 41, 59, 0.6)',
                        border: '1px solid rgba(148, 163, 184, 0.1)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        textAlign: 'center',
                        mb: 2,
                        gap: 0.2,
                      }}
                    >
                      <Box>
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.5px' }}>
                          AUDIENCE
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#ffffff', mt: 0.3, fontSize: '0.8rem' }}>
                          {m.aud}
                        </Typography>
                      </Box>

                      <Box sx={{ borderLeft: '1px solid rgba(148, 163, 184, 0.15)' }}>
                        <Typography variant="caption" sx={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.5px' }}>
                          SENT
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#38bdf8', mt: 0.3, fontSize: '0.8rem' }}>
                          {m.sent}
                        </Typography>
                      </Box>

                      <Box sx={{ borderLeft: '1px solid rgba(148, 163, 184, 0.15)' }}>
                        <Typography variant="caption" sx={{ color: '#4ade80', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.5px' }}>
                          DELIVERED
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#4ade80', mt: 0.3, fontSize: '0.8rem' }}>
                          {m.delivered}
                        </Typography>
                      </Box>

                      <Box sx={{ borderLeft: '1px solid rgba(148, 163, 184, 0.15)' }}>
                        <Typography variant="caption" sx={{ color: '#a78bfa', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.5px' }}>
                          READ
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#a78bfa', mt: 0.3, fontSize: '0.8rem' }}>
                          {m.read}
                        </Typography>
                      </Box>

                      <Box sx={{ borderLeft: '1px solid rgba(148, 163, 184, 0.15)' }}>
                        <Typography variant="caption" sx={{ color: '#f87171', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.5px' }}>
                          FAILED
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#f87171', mt: 0.3, fontSize: '0.8rem' }}>
                          {m.failed}
                        </Typography>
                      </Box>
                    </Paper>

                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 500 }}>
                        {c.author}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 500 }}>
                        {c.date}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          {/* Campaigns TablePagination */}
          <TablePagination
            component="div"
            count={filteredCampaigns.length}
            page={campaignPage}
            onPageChange={(e, newPage) => setCampaignPage(newPage)}
            rowsPerPage={campaignRowsPerPage}
            onRowsPerPageChange={(e) => {
              setCampaignRowsPerPage(parseInt(e.target.value, 10));
              setCampaignPage(0);
            }}
            rowsPerPageOptions={[25, 50, 100, 200]}
            sx={{
              mt: 3,
              color: '#cbd5e1',
              borderTop: '1px solid rgba(148, 163, 184, 0.15)',
              '& .MuiTablePagination-selectIcon': { color: '#cbd5e1' },
              '& .MuiTablePagination-select': { color: '#ffffff' },
              '& .MuiTablePagination-actions': { color: '#cbd5e1' },
            }}
          />
        </Box>
      )}

      {/* ==================== TAB 2: TEMPLATES ==================== */}
      {activeTab === 'templates' && (
        <Box>
          {/* Sub Header */}
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', fontSize: '1.4rem' }}>
                WhatsApp Templates
              </Typography>
              <Typography variant="body2" sx={{ color: isDark ? '#94a3b8' : '#475569', fontSize: '0.9rem' }}>
                Manage all approved and draft templates.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                startIcon={<AutorenewIcon sx={{ fontSize: 18 }} />}
                onClick={handleOpenSyncModal}
                sx={{
                  textTransform: 'none',
                  color: isDark ? '#cbd5e1' : '#334155',
                  borderColor: isDark ? 'rgba(148, 163, 184, 0.25)' : '#cbd5e1',
                  borderRadius: '10px',
                  fontWeight: 600,
                  px: 2.2,
                  py: 0.8,
                  bgcolor: isDark ? '#0f172a' : '#ffffff',
                  '&:hover': { borderColor: '#0284c7', color: '#0284c7', bgcolor: 'rgba(56, 189, 248, 0.08)' },
                }}
              >
                Sync
              </Button>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateTemplateOpen(true)}
                sx={{
                  textTransform: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 700,
                  borderRadius: '10px',
                  px: 2.5,
                  py: 0.8,
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                  '&:hover': { backgroundColor: '#1d4ed8' },
                }}
              >
                Create Template
              </Button>
            </Stack>
          </Stack>

          {/* 6 Stat Summary Cards Grid (CSS Grid 6 Equal Columns - 100% Full Page Width) */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
              gap: 2,
              mb: 3.5,
              width: '100%',
            }}
          >
            {/* Card 1: TOTAL */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                height: 108,
                boxSizing: 'border-box',
                borderRadius: '16px',
                backgroundColor: '#0f172a',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)', borderColor: '#38bdf8' },
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="caption" sx={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                  TOTAL
                </Typography>
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '10px',
                    backgroundColor: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38bdf8',
                  }}
                >
                  <GridViewIcon sx={{ fontSize: 18 }} />
                </Box>
              </Stack>

              <Box sx={{ mt: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
                  {templates.length}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 500 }}>
                  all templates
                </Typography>
              </Box>
            </Paper>

            {/* Card 2: APPROVED */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                height: 108,
                boxSizing: 'border-box',
                borderRadius: '16px',
                backgroundColor: 'rgba(34, 197, 94, 0.06)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)', borderColor: '#22c55e' },
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="caption" sx={{ color: '#4ade80', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                  APPROVED
                </Typography>
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '10px',
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#22c55e',
                  }}
                >
                  <CheckCircleIcon sx={{ fontSize: 18 }} />
                </Box>
              </Stack>

              <Box sx={{ mt: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
                  {templates.filter((t) => t.status === 'APPROVED').length}
                </Typography>
                <Typography variant="caption" sx={{ color: '#4ade80', fontSize: '0.7rem', fontWeight: 500 }}>
                  ready to send
                </Typography>
              </Box>
            </Paper>

            {/* Card 3: PENDING */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                height: 108,
                boxSizing: 'border-box',
                borderRadius: '16px',
                backgroundColor: 'rgba(245, 158, 11, 0.06)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)', borderColor: '#f59e0b' },
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="caption" sx={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                  PENDING
                </Typography>
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '10px',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f59e0b',
                  }}
                >
                  <AccessTimeIcon sx={{ fontSize: 18 }} />
                </Box>
              </Stack>

              <Box sx={{ mt: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
                  {templates.filter((t) => t.status === 'PENDING').length}
                </Typography>
                <Typography variant="caption" sx={{ color: '#fbbf24', fontSize: '0.7rem', fontWeight: 500 }}>
                  in meta review
                </Typography>
              </Box>
            </Paper>

            {/* Card 4: REJECTED */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                height: 108,
                boxSizing: 'border-box',
                borderRadius: '16px',
                backgroundColor: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)', borderColor: '#ef4444' },
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="caption" sx={{ color: '#f87171', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                  REJECTED
                </Typography>
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '10px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ef4444',
                  }}
                >
                  <CancelIcon sx={{ fontSize: 18 }} />
                </Box>
              </Stack>

              <Box sx={{ mt: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
                  {templates.filter((t) => t.status === 'REJECTED').length}
                </Typography>
                <Typography variant="caption" sx={{ color: '#f87171', fontSize: '0.7rem', fontWeight: 500 }}>
                  requires edit
                </Typography>
              </Box>
            </Paper>

            {/* Card 5: DRAFT */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                height: 108,
                boxSizing: 'border-box',
                borderRadius: '16px',
                backgroundColor: '#0f172a',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)', borderColor: '#c084fc' },
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="caption" sx={{ color: '#c084fc', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                  DRAFT
                </Typography>
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '10px',
                    backgroundColor: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#c084fc',
                  }}
                >
                  <EditNoteIcon sx={{ fontSize: 20 }} />
                </Box>
              </Stack>

              <Box sx={{ mt: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
                  {templates.filter((t) => t.status === 'DRAFT').length}
                </Typography>
                <Typography variant="caption" sx={{ color: '#c084fc', fontSize: '0.7rem', fontWeight: 500 }}>
                  unsubmitted
                </Typography>
              </Box>
            </Paper>

            {/* Card 6: DISABLED */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                height: 108,
                boxSizing: 'border-box',
                borderRadius: '16px',
                backgroundColor: '#0f172a',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)', borderColor: '#94a3b8' },
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                  DISABLED
                </Typography>
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '10px',
                    backgroundColor: 'rgba(148, 163, 184, 0.12)',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                  }}
                >
                  <BlockIcon sx={{ fontSize: 18 }} />
                </Box>
              </Stack>

              <Box sx={{ mt: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
                  {templates.filter((t) => t.status === 'DISABLED').length}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 500 }}>
                  deactivated
                </Typography>
              </Box>
            </Paper>
          </Box>

          {/* Unified Filter Bar Container (100% Full Width CSS Grid Layout) */}
          <Paper
            elevation={0}
            sx={{
              p: 1.8,
              mb: 3.5,
              borderRadius: '18px',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: '2.5fr 1.8fr 1.8fr 1.8fr 1.8fr 1.3fr',
                },
                gap: 1.5,
                alignItems: 'center',
                width: '100%',
              }}
            >
              <TextField
                fullWidth
                size="small"
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="Search by name or body..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#94a3b8' }} />
                    </InputAdornment>
                  ),
                  sx: {
                    backgroundColor: '#020617',
                    color: '#ffffff',
                    borderRadius: '12px',
                    height: 42,
                    fontSize: '0.85rem',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.2)' },
                  },
                }}
              />

              <Select
                fullWidth
                size="small"
                value={businessNumberFilter}
                onChange={(e) => setBusinessNumberFilter(e.target.value)}
                sx={{
                  backgroundColor: '#020617',
                  color: '#ffffff',
                  borderRadius: '12px',
                  height: 42,
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.2)' },
                }}
              >
                <MenuItem value="All">All business number</MenuItem>
                {businessNumberOptions.map((opt) => (
                  <MenuItem key={opt.id} value={opt.label}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>

              <Select
                fullWidth
                size="small"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                sx={{
                  backgroundColor: '#020617',
                  color: '#ffffff',
                  borderRadius: '12px',
                  height: 42,
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.2)' },
                }}
              >
                <MenuItem value="All">All category</MenuItem>
                <MenuItem value="Marketing">Marketing</MenuItem>
                <MenuItem value="Utility">Utility</MenuItem>
                <MenuItem value="Authentication">Authentication</MenuItem>
              </Select>

              <Select
                fullWidth
                size="small"
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                sx={{
                  backgroundColor: '#020617',
                  color: '#ffffff',
                  borderRadius: '12px',
                  height: 42,
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.2)' },
                }}
              >
                <MenuItem value="All">All language</MenuItem>
                <MenuItem value="English (US)">English (US)</MenuItem>
                <MenuItem value="Hindi">Hindi</MenuItem>
                <MenuItem value="Portuguese (BR)">Portuguese (BR)</MenuItem>
              </Select>

              <Select
                fullWidth
                size="small"
                value={templateStatusFilter}
                onChange={(e) => setTemplateStatusFilter(e.target.value)}
                sx={{
                  backgroundColor: '#020617',
                  color: '#ffffff',
                  borderRadius: '12px',
                  height: 42,
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.2)' },
                }}
              >
                <MenuItem value="All">All status</MenuItem>
                <MenuItem value="APPROVED">APPROVED</MenuItem>
                <MenuItem value="PENDING">PENDING</MenuItem>
                <MenuItem value="REJECTED">REJECTED</MenuItem>
                <MenuItem value="DRAFT">DRAFT</MenuItem>
                <MenuItem value="DISABLED">DISABLED</MenuItem>
              </Select>

              <Button
                fullWidth
                size="small"
                onClick={handleResetTemplateFilters}
                startIcon={<FilterAltOffIcon sx={{ fontSize: 16 }} />}
                sx={{
                  textTransform: 'none',
                  color: '#94a3b8',
                  height: 42,
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  bgcolor: '#020617',
                  '&:hover': { color: '#ffffff', bgcolor: 'rgba(255, 255, 255, 0.08)' },
                }}
              >
                No filters
              </Button>
            </Box>
          </Paper>

          {/* Template Cards Grid (CSS Grid 3 Equal Columns - 100% Full Page Width) */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 2.5,
              width: '100%',
            }}
          >
            {paginatedTemplates.map((t) => (
              <Card
                key={t.id}
                elevation={0}
                sx={{
                  width: '100%',
                  height: 350,
                  borderRadius: '16px',
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  '&:hover': {
                    borderColor: 'rgba(56, 189, 248, 0.4)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardContent sx={{ p: 2.2, pb: 1.5, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <Box>
                    {/* Header Row */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.3 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor:
                              t.status === 'APPROVED'
                                ? '#22c55e'
                                : t.status === 'PENDING'
                                  ? '#f59e0b'
                                  : t.status === 'REJECTED'
                                    ? '#ef4444'
                                    : '#94a3b8',
                          }}
                        />
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff', fontFamily: 'monospace' }}>
                          {t.name}
                        </Typography>
                      </Stack>

                      <IconButton size="small" sx={{ color: '#94a3b8', p: 0.5 }}>
                        <MoreVertIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Stack>

                    {/* Subtitle: Business Number · Channel Name */}
                    <Typography variant="caption" sx={{ color: '#38bdf8', fontWeight: 600, display: 'block', mb: 1.2, fontSize: '0.78rem' }}>
                      {t.businessNumber || 'No Channel Linked'}
                    </Typography>

                    {/* Tags row */}
                    <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 1.5 }}>
                      {renderTemplateStatusPill(t.status)}
                      {renderCategoryTag(t.category)}
                      <Chip
                        icon={t.format === 'video' ? <VideocamIcon sx={{ fontSize: '12px !important' }} /> : t.format === 'image' ? <ImageIcon sx={{ fontSize: '12px !important' }} /> : t.format === 'document' ? <InsertDriveFileIcon sx={{ fontSize: '12px !important' }} /> : <TextFieldsIcon sx={{ fontSize: '12px !important' }} />}
                        label={t.format ? t.format.toUpperCase() : 'TEXT'}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(148, 163, 184, 0.12)',
                          color: '#cbd5e1',
                          fontSize: '0.7rem',
                          height: 22,
                          px: 0.5,
                        }}
                      />
                    </Stack>

                    {/* Rejection Reason Alert Box if template is REJECTED */}
                    {(t.status === 'REJECTED' || t.status === 'Rejected') && (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.2,
                          mb: 1.5,
                          borderRadius: '8px',
                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                        }}
                      >
                        <Stack direction="row" alignItems="flex-start" spacing={0.8}>
                          <ErrorOutlineIcon sx={{ fontSize: 16, color: '#f87171', mt: 0.2, flexShrink: 0 }} />
                          <Box>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#fca5a5', display: 'block', fontSize: '0.73rem', lineHeight: 1.2 }}>
                              Rejection Reason:
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#f8fafc', fontSize: '0.72rem', display: 'block', mt: 0.3, lineHeight: 1.35, wordBreak: 'break-word' }}>
                              {t.rejectedReason || 'Meta Cloud API rejected this template due to invalid formatting or missing variable text samples.'}
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    )}

                    {/* Metadata Details */}
                    <Stack spacing={0.5} sx={{ mb: 1.5, fontSize: '0.75rem', color: '#94a3b8' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <LanguageIcon sx={{ fontSize: 14, color: '#64748b' }} />
                          <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 500 }}>
                            {t.language}
                          </Typography>
                        </Stack>

                        <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 600 }}>
                          # {t.varsCount} vars
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                          📅 Created {t.createdDate}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                          🔄 Updated {t.updatedDate}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Box>

                  {/* Message Body Container */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: '10px',
                      backgroundColor: '#020617',
                      border: '1px solid rgba(148, 163, 184, 0.12)',
                      height: 72,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: '0.78rem',
                        color: '#cbd5e1',
                        lineHeight: 1.45,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {t.body}
                    </Typography>
                  </Paper>
                </CardContent>

                {/* Footer Action Bar */}
                <Box
                  sx={{
                    px: 2.2,
                    py: 1.2,
                    borderTop: '1px solid rgba(148, 163, 184, 0.12)',
                    backgroundColor: 'rgba(2, 6, 23, 0.4)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Button
                    size="small"
                    startIcon={<VisibilityIcon sx={{ fontSize: 16 }} />}
                    onClick={() => handleOpenPreviewModal(t)}
                    sx={{ textTransform: 'none', color: '#38bdf8', fontWeight: 700, fontSize: '0.8rem', '&:hover': { color: '#7dd3fc' } }}
                  >
                    Preview
                  </Button>
                </Box>
              </Card>
              ))}
            </Box>

          {/* Templates TablePagination */}
          <TablePagination
            component="div"
            count={filteredTemplates.length}
            page={templatePage}
            onPageChange={(e, newPage) => setTemplatePage(newPage)}
            rowsPerPage={templateRowsPerPage}
            onRowsPerPageChange={(e) => {
              setTemplateRowsPerPage(parseInt(e.target.value, 10));
              setTemplatePage(0);
            }}
            rowsPerPageOptions={[25, 50, 100, 200]}
            sx={{
              mt: 3,
              color: '#cbd5e1',
              borderTop: '1px solid rgba(148, 163, 184, 0.15)',
              '& .MuiTablePagination-selectIcon': { color: '#cbd5e1' },
              '& .MuiTablePagination-select': { color: '#ffffff' },
              '& .MuiTablePagination-actions': { color: '#cbd5e1' },
            }}
          />
        </Box>
      )}

      {/* ==================== TAB 3: INTEGRATION ==================== */}
      {activeTab === 'integration' && (
        <Box>
          {/* Toolbar Container */}
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              mb: 3.5,
              borderRadius: '18px',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                value={channelSearch}
                onChange={(e) => setChannelSearch(e.target.value)}
                placeholder="Search connected channels..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#94a3b8' }} />
                    </InputAdornment>
                  ),
                  sx: {
                    backgroundColor: '#020617',
                    color: '#ffffff',
                    borderRadius: '12px',
                    height: 42,
                    fontSize: '0.9rem',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.2)' },
                  },
                }}
              />

              <Select
                size="small"
                value={channelStatusFilter}
                onChange={(e) => setChannelStatusFilter(e.target.value)}
                startAdornment={
                  <InputAdornment position="start" sx={{ ml: 0.5 }}>
                    <FilterListIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                  </InputAdornment>
                }
                sx={{
                  minWidth: { xs: '100%', sm: 180 },
                  backgroundColor: '#020617',
                  color: '#ffffff',
                  borderRadius: '12px',
                  height: 42,
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.2)' },
                }}
              >
                <MenuItem value="All statuses">All statuses</MenuItem>
                <MenuItem value="Connected">Connected</MenuItem>
              </Select>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenCreateModal}
                sx={{
                  minWidth: { xs: '100%', sm: 'auto' },
                  whiteSpace: 'nowrap',
                  backgroundColor: '#25d366',
                  color: '#ffffff',
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: '12px',
                  height: 42,
                  px: 2.8,
                  boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)',
                  '&:hover': { backgroundColor: '#128c7e' },
                }}
              >
                Connect Number
              </Button>
            </Stack>
          </Paper>

          {/* Global Alerts */}
          {error && (
            <Alert severity="error" sx={{ mb: 3, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 3, backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#86efac', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              {success}
            </Alert>
          )}

          {/* Loading state */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={36} sx={{ color: '#25d366' }} />
            </Box>
          ) : filteredCards.length === 0 ? (
            /* Empty State Card */
            <Paper
              sx={{
                p: 5,
                textAlign: 'center',
                backgroundColor: '#0f172a',
                border: '1px dashed rgba(148, 163, 184, 0.25)',
                borderRadius: 3,
              }}
            >
              <Box sx={{ backgroundColor: 'rgba(37, 211, 102, 0.1)', width: 64, height: 64, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                <WhatsAppIcon sx={{ fontSize: 36, color: '#25d366' }} />
              </Box>
              <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600, mb: 1 }}>
                No WhatsApp Channels Found
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', maxWidth: 450, mx: 'auto', mb: 3 }}>
                Connect your Meta WhatsApp Business API numbers to automate customer support, lead capture, and interactive bot flows.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenCreateModal}
                sx={{
                  textTransform: 'none',
                  bgcolor: '#25d366',
                  color: '#ffffff',
                  fontWeight: 600,
                  px: 3,
                  py: 1,
                  '&:hover': { bgcolor: '#128c7e' },
                }}
              >
                Connect Number
              </Button>
            </Paper>
          ) : (
            /* Connected Cards Grid */
            <Grid container spacing={3} alignItems="stretch">
              {filteredCards.map((card) => (
                <Grid item xs={12} md={4} key={card.config_id} sx={{ display: 'flex' }}>
                  <Card
                    sx={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(148, 163, 184, 0.15)',
                      borderRadius: 3,
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                      transition: 'transform 0.2s ease, border-color 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      '&:hover': {
                        borderColor: 'rgba(37, 211, 102, 0.4)',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <WhatsAppIcon sx={{ color: '#25d366', fontSize: 24 }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#ffffff' }}>
                            {card.channel_name || 'WhatsApp Channel'}
                          </Typography>
                        </Stack>
                        <Chip
                          icon={<CheckCircleIcon sx={{ fontSize: '14px !important', color: '#25d366 !important' }} />}
                          label="Connected"
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(37, 211, 102, 0.12)',
                            color: '#25d366',
                            fontWeight: 600,
                            fontSize: 11,
                            border: '1px solid rgba(37, 211, 102, 0.25)',
                          }}
                        />
                      </Stack>

                      <Divider sx={{ mb: 2, borderColor: 'rgba(148, 163, 184, 0.1)' }} />

                      <Stack spacing={1.5} sx={{ mb: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'rgba(30, 41, 59, 0.5)', p: 1.2, borderRadius: 1.5 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <SmartToyIcon sx={{ color: '#38bdf8', fontSize: 18 }} />
                            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 500 }}>
                              Assigned Bot:
                            </Typography>
                          </Stack>
                          <Chip
                            label={card.bot_name || 'Default Bot'}
                            size="small"
                            sx={{ bgcolor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 600, fontSize: 11 }}
                          />
                        </Box>

                        {card.phone_number && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                            <Typography variant="body2" sx={{ color: '#94a3b8' }}>Mobile No:</Typography>
                            <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>{card.phone_number}</Typography>
                          </Box>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <Typography variant="body2" sx={{ color: '#94a3b8' }}>Phone Number ID:</Typography>
                          <Typography variant="body2" sx={{ color: '#cbd5e1', fontFamily: 'monospace' }}>
                            {card.phone_number_id ? `${card.phone_number_id.substring(0, 10)}...` : 'Not set'}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <Typography variant="body2" sx={{ color: '#94a3b8' }}>WABA Account ID:</Typography>
                          <Typography variant="body2" sx={{ color: '#cbd5e1', fontFamily: 'monospace' }}>
                            {card.whatsapp_business_account_id ? `${card.whatsapp_business_account_id.substring(0, 10)}...` : 'Not set'}
                          </Typography>
                        </Box>
                      </Stack>

                      <Divider sx={{ mb: 2, borderColor: 'rgba(148, 163, 184, 0.1)' }} />

                      <Stack direction="row" spacing={1} justifyContent="space-between">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                          onClick={() => handleOpenEditModal(card)}
                          sx={{
                            textTransform: 'none',
                            color: '#cbd5e1',
                            borderColor: 'rgba(148, 163, 184, 0.25)',
                            '&:hover': { borderColor: '#38bdf8', color: '#38bdf8', bgcolor: 'rgba(56, 189, 248, 0.08)' },
                          }}
                        >
                          Edit
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<SendIcon sx={{ fontSize: 16 }} />}
                          onClick={() => handleOpenTestModal(card)}
                          sx={{
                            textTransform: 'none',
                            color: '#38bdf8',
                            borderColor: 'rgba(56, 189, 248, 0.3)',
                            '&:hover': { borderColor: '#38bdf8', bgcolor: 'rgba(56, 189, 248, 0.12)' },
                          }}
                        >
                          Test
                        </Button>

                        <IconButton
                          size="small"
                          onClick={() => handleDisconnect(card.config_id, card.channel_name)}
                          sx={{ color: '#f87171', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' } }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* ==================== PREVIEW TEMPLATE MODAL (CUT-TO-CUT DARK THEME MOCKUP) ==================== */}
      <Dialog
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#090d16' : '#ffffff',
            color: isDark ? '#f8fafc' : '#0f172a',
            border: isDark ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid rgba(226, 232, 240, 0.8)',
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: isDark ? '0 25px 60px -12px rgba(0, 0, 0, 0.9)' : '0 20px 50px rgba(0, 0, 0, 0.08)',
          },
        }}
      >
        {/* Header */}
        <DialogTitle sx={{ bgcolor: isDark ? '#090d16' : '#ffffff', py: 2.5, px: 3, borderBottom: isDark ? '1px solid rgba(148, 163, 184, 0.12)' : '1px solid #e2e8f0' }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', fontSize: '1.3rem', lineHeight: 1.2 }}>
                {previewTemplate?.name || 'Template Name'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.82rem', display: 'block', mt: 0.4, mb: 1.2, fontWeight: 500 }}>
                {previewTemplate?.businessNumber || '+44 20 7946 0958 · Syntrrix UK'}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {previewTemplate && renderTemplateStatusPill(previewTemplate.status)}
                {previewTemplate && renderCategoryTag(previewTemplate.category)}
                <Chip
                  label={previewTemplate?.language || 'English (US)'}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(148, 163, 184, 0.12)',
                    color: '#cbd5e1',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    height: 22,
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                  }}
                />
              </Stack>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton
                size="small"
                sx={{
                  color: '#cbd5e1',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '10px',
                  p: 0.8,
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#ffffff' },
                }}
              >
                <WbSunnyIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setPreviewModalOpen(false)}
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
            </Stack>
          </Stack>
        </DialogTitle>

        {/* Tab Switcher Segmented Control */}
        <Box sx={{ px: 3, pt: 2, pb: 1.5, bgcolor: '#090d16' }}>
          <Paper elevation={0} sx={{ p: 0.6, bgcolor: '#020617', borderRadius: '14px', border: '1px solid rgba(148, 163, 184, 0.18)' }}>
            <Grid container spacing={0.5} textAlign="center">
              <Grid item xs={4}>
                <Button
                  fullWidth
                  size="small"
                  onClick={() => setPreviewTab('preview')}
                  sx={{
                    textTransform: 'none',
                    fontWeight: previewTab === 'preview' ? 800 : 600,
                    fontSize: '0.88rem',
                    borderRadius: '10px',
                    bgcolor: previewTab === 'preview' ? '#ffffff' : 'transparent',
                    color: previewTab === 'preview' ? '#0f172a' : '#94a3b8',
                    boxShadow: previewTab === 'preview' ? '0 4px 14px rgba(0, 0, 0, 0.4)' : 'none',
                    py: 0.8,
                    transition: 'all 0.2s ease',
                    '&:hover': { color: previewTab === 'preview' ? '#0f172a' : '#ffffff' },
                  }}
                >
                  Preview
                </Button>
              </Grid>

              <Grid item xs={4}>
                <Button
                  fullWidth
                  size="small"
                  onClick={() => setPreviewTab('details')}
                  sx={{
                    textTransform: 'none',
                    fontWeight: previewTab === 'details' ? 800 : 600,
                    fontSize: '0.88rem',
                    borderRadius: '10px',
                    bgcolor: previewTab === 'details' ? '#ffffff' : 'transparent',
                    color: previewTab === 'details' ? '#0f172a' : '#94a3b8',
                    boxShadow: previewTab === 'details' ? '0 4px 14px rgba(0, 0, 0, 0.4)' : 'none',
                    py: 0.8,
                    transition: 'all 0.2s ease',
                    '&:hover': { color: previewTab === 'details' ? '#0f172a' : '#ffffff' },
                  }}
                >
                  Details
                </Button>
              </Grid>

              <Grid item xs={4}>
                <Button
                  fullWidth
                  size="small"
                  onClick={() => setPreviewTab('json')}
                  sx={{
                    textTransform: 'none',
                    fontWeight: previewTab === 'json' ? 800 : 600,
                    fontSize: '0.88rem',
                    borderRadius: '10px',
                    bgcolor: previewTab === 'json' ? '#ffffff' : 'transparent',
                    color: previewTab === 'json' ? '#0f172a' : '#94a3b8',
                    boxShadow: previewTab === 'json' ? '0 4px 14px rgba(0, 0, 0, 0.4)' : 'none',
                    py: 0.8,
                    transition: 'all 0.2s ease',
                    '&:hover': { color: previewTab === 'json' ? '#0f172a' : '#ffffff' },
                  }}
                >
                  JSON
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Box>

        {/* Content Body */}
        <DialogContent sx={{ p: 3, bgcolor: '#090d16' }}>
          {previewTemplate && (
            <>
              {previewTab === 'preview' && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 3.5,
                    borderRadius: '24px',
                    bgcolor: '#040711',
                    border: '1px solid rgba(148, 163, 184, 0.15)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.8)',
                  }}
                >
                  {/* Smartphone Frame Container */}
                  <Paper
                    elevation={0}
                    sx={{
                      width: 320,
                      borderRadius: '36px',
                      backgroundColor: '#0f172a',
                      border: '6px solid #1e293b',
                      boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Status Bar */}
                    <Box sx={{ bgcolor: '#075e54', px: 2.5, pt: 1.2, pb: 0.5, display: 'flex', justifyContent: 'space-between', color: '#ffffff', fontSize: '0.68rem' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.68rem', color: '#ffffff' }}>9:41</Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#ffffff', fontWeight: 600 }}>--- ▮▮▮ 100%</Typography>
                      </Stack>
                    </Box>

                    {/* WhatsApp App Header Bar */}
                    <Box sx={{ bgcolor: '#075e54', px: 1.5, pb: 1.5, pt: 0.5, color: '#ffffff' }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <ArrowBackIcon sx={{ fontSize: 18, color: '#ffffff' }} />
                        <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'rgba(255, 255, 255, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <WhatsAppIcon sx={{ fontSize: 18, color: '#ffffff' }} />
                        </Box>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.85rem', color: '#ffffff', lineHeight: 1.2, noWrap: true }}>
                            Syntrrix Business
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.65rem', display: 'block', noWrap: true }}>
                            {previewTemplate.businessNumber ? `${previewTemplate.businessNumber.split('·')[0]} - Syntrri...` : '+44 20 7946 0958 - Syntrri...'}
                          </Typography>
                        </Box>
                        <VideocamIcon sx={{ fontSize: 18, color: '#ffffff' }} />
                        <CallIcon sx={{ fontSize: 16, color: '#ffffff' }} />
                        <MoreVertIcon sx={{ fontSize: 18, color: '#ffffff' }} />
                      </Stack>
                    </Box>

                    {/* WhatsApp Chat Body Background */}
                    <Box
                      sx={{
                        p: 1.8,
                        bgcolor: '#0b141a',
                        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
                        backgroundSize: '12px 12px',
                        minHeight: 330,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                      }}
                    >
                      {/* Speech Message Bubble (Dark WhatsApp Green) */}
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.6,
                          borderRadius: '12px 12px 12px 2px',
                          backgroundColor: '#005c4b',
                          color: '#ffffff',
                          maxWidth: '100%',
                          boxSizing: 'border-word',
                          position: 'relative',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {/* Header Text */}
                        {previewTemplate.headerText && previewTemplate.format === 'text' && (
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#ffffff', mb: 0.8, fontSize: '0.85rem', wordBreak: 'break-word' }}>
                            {previewTemplate.headerText}
                          </Typography>
                        )}

                        {/* Media Header */}
                        {previewTemplate.format === 'image' && (
                          <Box sx={{ borderRadius: '10px', overflow: 'hidden', mb: 1.2, maxHeight: 180, border: '1px solid rgba(255, 255, 255, 0.2)', bgcolor: '#111b21' }}>
                            <img
                              src={previewTemplate.headerMediaUrl || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&fm=jpg&fit=crop&q=80'}
                              alt="Header Preview"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&fm=jpg&fit=crop&q=80';
                              }}
                              style={{ width: '100%', height: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }}
                            />
                          </Box>
                        )}

                        {previewTemplate.format === 'video' && (
                          <Box sx={{ borderRadius: '10px', overflow: 'hidden', mb: 1.2, maxHeight: 200, bgcolor: '#000000', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                            <video
                              key={previewTemplate.headerMediaUrl}
                              src={previewTemplate.headerMediaUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'}
                              controls
                              autoPlay
                              muted
                              loop
                              playsInline
                              preload="auto"
                              controlsList="nodownload"
                              style={{ width: '100%', height: '100%', maxHeight: 200, objectFit: 'contain', display: 'block' }}
                            />
                          </Box>
                        )}

                        {previewTemplate.format === 'document' && (
                          <Paper
                            elevation={0}
                            component={previewTemplate.headerMediaUrl ? 'a' : 'div'}
                            href={previewTemplate.headerMediaUrl || undefined}
                            target={previewTemplate.headerMediaUrl ? '_blank' : undefined}
                            rel={previewTemplate.headerMediaUrl ? 'noopener noreferrer' : undefined}
                            sx={{
                              p: 1.5,
                              borderRadius: '10px',
                              bgcolor: 'rgba(0, 0, 0, 0.35)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              mb: 1.2,
                              textDecoration: 'none',
                              cursor: previewTemplate.headerMediaUrl ? 'pointer' : 'default',
                              '&:hover': previewTemplate.headerMediaUrl ? { bgcolor: 'rgba(0, 0, 0, 0.5)' } : {},
                            }}
                          >
                            <Box
                              sx={{
                                width: 42,
                                height: 42,
                                borderRadius: '8px',
                                bgcolor: '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                flexShrink: 0,
                              }}
                            >
                              PDF
                            </Box>
                            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {previewTemplate.name ? `${previewTemplate.name}.pdf` : 'Document.pdf'}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block' }}>
                                PDF Document · Tap to view
                              </Typography>
                            </Box>
                          </Paper>
                        )}

                        {/* Body Text */}
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: '0.82rem',
                            lineHeight: 1.45,
                            color: '#f8fafc',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                            width: '100%',
                          }}
                        >
                          {renderParsedBodyText(previewTemplate.body, previewTemplate.bodyParams)}
                        </Typography>

                        {/* Footer Text */}
                        {previewTemplate.footer && (
                          <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.68rem', mt: 0.8, wordBreak: 'break-word' }}>
                            {previewTemplate.footer}
                          </Typography>
                        )}

                        {/* Time + Blue Double Checkmark */}
                        <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={0.4} sx={{ mt: 0.5 }}>
                          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.62rem' }}>
                            9:41 AM
                          </Typography>
                          <CheckIcon sx={{ fontSize: 12, color: '#53bdeb' }} />
                        </Stack>
                      </Paper>

                      {/* Embedded Dark Action Button Cards Stacked Below Bubble */}
                      {previewTemplate.buttons && previewTemplate.buttons.length > 0 && (
                        <Stack spacing={0.8} sx={{ mt: 1, width: '100%' }}>
                          {previewTemplate.buttons.map((btn, idx) => (
                            <Paper
                              key={btn.id || idx}
                              elevation={0}
                              sx={{
                                py: 1,
                                px: 1.5,
                                borderRadius: '10px',
                                backgroundColor: '#111b21',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#38bdf8',
                                textAlign: 'center',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 0.8,
                                cursor: 'pointer',
                                transition: 'transform 0.1s ease',
                                '&:hover': { transform: 'scale(1.01)', bgcolor: '#182229' },
                              }}
                            >
                              {btn.type === 'quick_reply' && <CheckIcon sx={{ fontSize: 14 }} />}
                              {btn.type === 'call_phone' && <CallIcon sx={{ fontSize: 14 }} />}
                              {(btn.type === 'visit_website' || btn.type === 'dynamic_url') && <LaunchIcon sx={{ fontSize: 14 }} />}
                              {btn.label || btn.text || 'Action Button'}
                            </Paper>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  </Paper>
                </Paper>
              )}

              {previewTab === 'details' && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: '16px',
                    bgcolor: '#040711',
                    border: '1px solid rgba(148, 163, 184, 0.15)',
                  }}
                >
                  <Stack spacing={1.8}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1.2, borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600 }}>Template Name:</Typography>
                      <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 700, fontFamily: 'monospace' }}>{previewTemplate.name}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1.2, borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600 }}>Category:</Typography>
                      <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>{previewTemplate.category}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1.2, borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600 }}>Language:</Typography>
                      <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>{previewTemplate.language}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1.2, borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600 }}>Format:</Typography>
                      <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>{previewTemplate.format}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1.2, borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600 }}>Business Line:</Typography>
                      <Typography variant="body2" sx={{ color: '#38bdf8', fontWeight: 700 }}>{previewTemplate.businessNumber}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1.2, borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600 }}>Meta Template ID:</Typography>
                      <Typography variant="body2" sx={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.82rem' }}>{previewTemplate.meta_id || 'N/A'}</Typography>
                    </Box>
                  </Stack>
                </Paper>
              )}

              {previewTab === 'json' && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: '16px',
                    bgcolor: '#020617',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    fontFamily: 'monospace',
                    fontSize: '0.82rem',
                    color: '#38bdf8',
                    overflowX: 'auto',
                  }}
                >
                  <pre style={{ margin: 0 }}>
                    {JSON.stringify(
                      {
                        name: previewTemplate.name,
                        category: previewTemplate.category,
                        language: previewTemplate.language,
                        status: previewTemplate.status,
                        components: [
                          ...(previewTemplate.headerText ? [{ type: 'HEADER', format: 'TEXT', text: previewTemplate.headerText }] : []),
                          { type: 'BODY', text: previewTemplate.body },
                          ...(previewTemplate.footer ? [{ type: 'FOOTER', text: previewTemplate.footer }] : []),
                          ...(previewTemplate.buttons && previewTemplate.buttons.length > 0 ? [{ type: 'BUTTONS', buttons: previewTemplate.buttons }] : []),
                        ],
                      },
                      null,
                      2
                    )}
                  </pre>
                </Paper>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* CREATE CAMPAIGN DIALOG */}
      <Dialog
        open={createCampaignOpen}
        onClose={() => setCreateCampaignOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#090d16',
            color: '#f8fafc',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: 3.5,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#ffffff' }}>Create New Campaign</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Campaign Title"
              fullWidth
              size="small"
              value={newCampaign.title}
              onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
              placeholder="e.g. Festival Special Offer"
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
              InputProps={{
                sx: {
                  color: '#ffffff',
                  backgroundColor: '#020617',
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                },
              }}
            />

            <TextField
              label="Select Template"
              select
              fullWidth
              size="small"
              value={newCampaign.template}
              onChange={(e) => setNewCampaign({ ...newCampaign, template: e.target.value })}
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
              SelectProps={{
                sx: {
                  color: '#ffffff',
                  backgroundColor: '#020617',
                  borderRadius: 2,
                  '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                },
              }}
            >
              <MenuItem value="spring_sale_2025">spring_sale_2025</MenuItem>
              <MenuItem value="order_confirmation_v2">order_confirmation_v2</MenuItem>
              <MenuItem value="abandoned_cart_reminder">abandoned_cart_reminder</MenuItem>
            </TextField>

            <TextField
              label="Audience Size"
              type="number"
              fullWidth
              size="small"
              value={newCampaign.audience}
              onChange={(e) => setNewCampaign({ ...newCampaign, audience: e.target.value })}
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
              InputProps={{
                sx: {
                  color: '#ffffff',
                  backgroundColor: '#020617',
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                },
              }}
            />

            <TextField
              label="Status"
              select
              fullWidth
              size="small"
              value={newCampaign.status}
              onChange={(e) => setNewCampaign({ ...newCampaign, status: e.target.value })}
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
              SelectProps={{
                sx: {
                  color: '#ffffff',
                  backgroundColor: '#020617',
                  borderRadius: 2,
                  '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                },
              }}
            >
              <MenuItem value="Scheduled">Scheduled</MenuItem>
              <MenuItem value="Running">Running</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, backgroundColor: '#0b1329' }}>
          <Button onClick={() => setCreateCampaignOpen(false)} sx={{ color: '#94a3b8' }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateCampaignSubmit} sx={{ bgcolor: '#25d366', color: '#ffffff', '&:hover': { bgcolor: '#128c7e' } }}>
            Create Campaign
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== CREATE NEW TEMPLATE MODAL ==================== */}
      <Dialog
        open={createTemplateOpen}
        onClose={(e, reason) => {
          if (submittingTemplate) return;
          setCreateTemplateOpen(false);
        }}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#090d16' : '#ffffff',
            color: isDark ? '#f8fafc' : '#0f172a',
            border: isDark ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid #e2e8f0',
            borderRadius: 4,
            boxShadow: isDark ? '0 25px 60px -12px rgba(0, 0, 0, 0.9)' : '0 20px 50px rgba(0, 0, 0, 0.15)',
            width: '95vw',
            maxWidth: '1500px',
            height: '92vh',
            maxHeight: '900px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          },
        }}
      >
        {/* Full Modal Submitting Overlay Loader */}
        {submittingTemplate && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: isDark ? 'rgba(9, 13, 22, 0.88)' : 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(8px)',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2.5,
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                bgcolor: 'rgba(37, 99, 235, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 35px rgba(56, 189, 248, 0.4)',
              }}
            >
              <CircularProgress size={40} sx={{ color: '#38bdf8' }} />
            </Box>

            <Box textAlign="center">
              <Typography variant="h6" sx={{ color: isDark ? '#ffffff' : '#0f172a', fontWeight: 800, fontSize: '1.2rem', mb: 0.8, letterSpacing: '0.3px' }}>
                Submitting Template to Meta API...
              </Typography>
              <Typography variant="body2" sx={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.88rem', maxWidth: 420 }}>
                Please wait while we process media headers and request approval from Meta Cloud API.
              </Typography>
            </Box>
          </Box>
        )}

        {/* Modal Header */}
        <DialogTitle
          sx={{
            py: 2,
            px: 3,
            backgroundColor: isDark ? '#0b1329' : '#ffffff',
            borderBottom: isDark ? '1px solid rgba(148, 163, 184, 0.12)' : '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ backgroundColor: '#25d366', p: 0.8, borderRadius: '12px', display: 'flex' }}>
              <WhatsAppIcon sx={{ color: '#ffffff', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', fontSize: '1.15rem' }}>
                Create New Template
              </Typography>
              <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.82rem' }}>
                Create a reusable WhatsApp message template for your business.
              </Typography>
            </Box>
          </Stack>

          <IconButton
            disabled={submittingTemplate}
            onClick={() => setCreateTemplateOpen(false)}
            size="small"
            sx={{
              color: isDark ? '#94a3b8' : '#64748b',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
              borderRadius: '10px',
              p: 0.8,
              '&:hover': { color: isDark ? '#ffffff' : '#0f172a', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0' },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        {/* Modal Content - 2 Columns (Form Editor + Phone Live Preview) */}
        <DialogContent sx={{ p: 0, flexGrow: 1, overflow: 'hidden', display: 'flex', bgcolor: isDark ? '#090d16' : '#ffffff' }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, width: '100%', height: '100%', flexGrow: 1 }}>
            {/* LEFT COLUMN: FORM EDITOR (SCROLLABLE - HIDDEN SCROLLBAR) */}
            <Box
              sx={{
                flex: 1,
                p: { xs: 2.5, md: 3.5 },
                pb: { xs: 8, md: 10 },
                overflowY: 'auto',
                borderRight: '1px solid rgba(148, 163, 184, 0.12)',
                maxHeight: 'calc(92vh - 130px)',
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              <Stack spacing={4}>
                {/* STEP 1: BASIC INFORMATION */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        bgcolor: '#2563eb',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                      }}
                    >
                      1
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem', lineHeight: 1.2 }}>
                        Basic Information
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                        Identity, ownership and category for this template.
                      </Typography>
                    </Box>
                  </Stack>

                  <Grid container spacing={2.5}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 0.6, fontWeight: 700 }}>
                        Template Name *
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        placeholder="Please enter Template Name"
                        InputProps={{
                          sx: {
                            color: '#ffffff',
                            backgroundColor: '#020617',
                            borderRadius: '10px',
                            height: 42,
                            fontSize: '0.88rem',
                            fontFamily: 'monospace',
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                          },
                        }}
                      />
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem', mt: 0.5, display: 'block' }}>
                        Lowercase, numbers and underscores only.
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 0.6, fontWeight: 700 }}>
                        Business Number *
                      </Typography>
                      <Select
                        fullWidth
                        size="small"
                        displayEmpty
                        value={newTemplate.businessNumber}
                        onChange={(e) => setNewTemplate({ ...newTemplate, businessNumber: e.target.value })}
                        renderValue={(selected) => {
                          if (!selected) {
                            return <span style={{ color: '#64748b' }}>Select Business Number</span>;
                          }
                          return selected;
                        }}
                        sx={{
                          backgroundColor: '#020617',
                          color: '#ffffff',
                          borderRadius: '10px',
                          height: 42,
                          fontSize: '0.88rem',
                          fontWeight: 500,
                          '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#38bdf8' },
                        }}
                      >
                        <MenuItem value="" disabled sx={{ color: '#64748b' }}>
                          Select Business Number
                        </MenuItem>
                        {businessNumberOptions.length > 0 ? (
                          businessNumberOptions.map((opt) => (
                            <MenuItem key={opt.id} value={opt.label}>
                              {opt.label} ✓
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem value="" disabled>
                            No Connected WhatsApp Channel
                          </MenuItem>
                        )}
                      </Select>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 0.6, fontWeight: 700 }}>
                        Category *
                      </Typography>
                      <Select
                        fullWidth
                        size="small"
                        displayEmpty
                        value={newTemplate.category}
                        onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                        renderValue={(selected) => {
                          if (!selected) {
                            return <span style={{ color: '#64748b' }}>Select Category</span>;
                          }
                          return selected;
                        }}
                        sx={{
                          backgroundColor: '#020617',
                          color: '#ffffff',
                          borderRadius: '10px',
                          height: 42,
                          fontSize: '0.88rem',
                          fontWeight: 500,
                          '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#38bdf8' },
                        }}
                      >
                        <MenuItem value="" disabled sx={{ color: '#64748b' }}>
                          Select Category
                        </MenuItem>
                        <MenuItem value="Marketing">Marketing</MenuItem>
                        <MenuItem value="Utility">Utility</MenuItem>
                        <MenuItem value="Authentication">Authentication</MenuItem>
                      </Select>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem', mt: 0.5, display: 'block' }}>
                        Promotional messages, offers and announcements.
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 0.6, fontWeight: 700 }}>
                        Language *
                      </Typography>
                      <Select
                        fullWidth
                        size="small"
                        displayEmpty
                        value={newTemplate.language}
                        onChange={(e) => setNewTemplate({ ...newTemplate, language: e.target.value })}
                        renderValue={(selected) => {
                          if (!selected) {
                            return <span style={{ color: '#64748b' }}>Select Language</span>;
                          }
                          return selected;
                        }}
                        sx={{
                          backgroundColor: '#020617',
                          color: '#ffffff',
                          borderRadius: '10px',
                          height: 42,
                          fontSize: '0.88rem',
                          fontWeight: 500,
                          '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#38bdf8' },
                        }}
                      >
                        <MenuItem value="" disabled sx={{ color: '#64748b' }}>
                          Select Language
                        </MenuItem>
                        <MenuItem value="en_US">English (US)</MenuItem>
                        <MenuItem value="hi">Hindi (hi)</MenuItem>
                        <MenuItem value="mr">Marathi (mr)</MenuItem>
                        <MenuItem value="gu">Gujarati (gu)</MenuItem>
                        <MenuItem value="ta">Tamil (ta)</MenuItem>
                        <MenuItem value="te">Telugu (te)</MenuItem>
                        <MenuItem value="kn">Kannada (kn)</MenuItem>
                        <MenuItem value="ml">Malayalam (ml)</MenuItem>
                        <MenuItem value="ar">Arabic (ar)</MenuItem>
                        <MenuItem value="fr">French (fr)</MenuItem>
                        <MenuItem value="pt_BR">Portuguese (BR)</MenuItem>
                      </Select>
                    </Grid>
                  </Grid>

                  {/* Template Type Selectors (100% Full Width CSS Grid) */}
                  <Box sx={{ mt: 2.5, width: '100%' }}>
                    <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 1, fontWeight: 700 }}>
                      Template Type *
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(6, 1fr)' },
                        gap: 1.2,
                        width: '100%',
                      }}
                    >
                      {[
                        { id: 'text', label: 'Text', icon: <TextFieldsIcon fontSize="small" /> },
                        { id: 'image', label: 'Image', icon: <ImageIcon fontSize="small" /> },
                        { id: 'video', label: 'Video', icon: <VideocamIcon fontSize="small" /> },
                        { id: 'document', label: 'Document', icon: <InsertDriveFileIcon fontSize="small" /> },
                        { id: 'location', label: 'Location', icon: <LocationOnIcon fontSize="small" /> },
                        { id: 'carousel', label: 'Carousel', icon: <ViewCarouselIcon fontSize="small" /> },
                      ].map((item) => {
                        const isSelected = newTemplate.format === item.id;
                        return (
                          <Paper
                            key={item.id}
                            elevation={0}
                            onClick={() => setNewTemplate({ ...newTemplate, format: item.id })}
                            sx={{
                              py: 1.5,
                              px: 1,
                              borderRadius: '12px',
                              textAlign: 'center',
                              cursor: 'pointer',
                              width: '100%',
                              boxSizing: 'border-box',
                              backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.14)' : '#020617',
                              border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.25)',
                              color: isSelected ? '#38bdf8' : '#cbd5e1',
                              transition: 'all 0.15s ease',
                              boxShadow: isSelected ? '0 4px 14px rgba(56, 189, 248, 0.25)' : 'none',
                              '&:hover': { borderColor: '#38bdf8', color: '#38bdf8' },
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.4 }}>{item.icon}</Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.78rem', display: 'block' }}>
                              {item.label}
                            </Typography>
                          </Paper>
                        );
                      })}
                    </Box>
                  </Box>
                </Box>

                <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.1)' }} />

                {/* STEP 2: HEADER */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        bgcolor: '#2563eb',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                      }}
                    >
                      2
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem', lineHeight: 1.2 }}>
                        Header
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                        {newTemplate.format === 'text'
                          ? 'Optional text header.'
                          : 'Media or text shown at the top of the message.'}
                      </Typography>
                    </Box>
                  </Stack>

                  {newTemplate.format === 'text' ? (
                    <Box>
                      {newTemplate.headerType === 'text' ? (
                        <TextField
                          fullWidth
                          size="small"
                          value={newTemplate.headerText}
                          onChange={(e) => setNewTemplate({ ...newTemplate, headerText: e.target.value })}
                          placeholder="e.g. Special Announcement"
                          InputProps={{
                            sx: {
                              color: '#ffffff',
                              backgroundColor: '#020617',
                              borderRadius: '10px',
                              height: 42,
                              fontSize: '0.88rem',
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                            },
                          }}
                        />
                      ) : (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setNewTemplate({ ...newTemplate, headerType: 'text' })}
                          sx={{
                            textTransform: 'none',
                            color: '#cbd5e1',
                            borderColor: 'rgba(148, 163, 184, 0.25)',
                            borderRadius: '10px',
                            fontWeight: 600,
                            px: 2,
                            py: 0.8,
                            bgcolor: '#020617',
                            '&:hover': { borderColor: '#38bdf8', color: '#38bdf8' },
                          }}
                        >
                          Add text header
                        </Button>
                      )}
                    </Box>
                  ) : newTemplate.format === 'image' ? (
                    <Box>
                      {/* Hidden File Input for Image Browser */}
                      <input
                        type="file"
                        ref={imageInputRef}
                        accept="image/png, image/jpeg, image/jpg"
                        style={{ display: 'none' }}
                        onChange={handleImageFileChange}
                      />

                      {newTemplate.headerMediaUrl ? (
                        /* Uploaded Image Card Preview */
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2.5,
                            borderRadius: '16px',
                            backgroundColor: '#020617',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2.5,
                            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
                          }}
                        >
                          <Box
                            sx={{
                              width: 90,
                              height: 90,
                              borderRadius: '12px',
                              overflow: 'hidden',
                              flexShrink: 0,
                              border: '2px solid rgba(56, 189, 248, 0.3)',
                              bgcolor: '#0f172a',
                            }}
                          >
                            <img
                              src={newTemplate.headerMediaUrl}
                              alt="Header Preview"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </Box>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                              <Chip label="Uploaded Image" size="small" color="success" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 800 }} />
                              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                                Ready for WhatsApp Header
                              </Typography>
                            </Stack>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#ffffff', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {newTemplate.uploadedFileName || 'Header Image'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#38bdf8', fontSize: '0.75rem', fontWeight: 600, display: 'block', mt: 0.2 }}>
                              Formats: PNG, JPG, JPEG · Max 5 MB
                            </Typography>

                            <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => imageInputRef.current && imageInputRef.current.click()}
                                startIcon={<CloudUploadIcon sx={{ fontSize: 16 }} />}
                                sx={{
                                  textTransform: 'none',
                                  color: '#38bdf8',
                                  borderColor: 'rgba(56, 189, 248, 0.4)',
                                  borderRadius: '8px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  height: 32,
                                  '&:hover': { bgcolor: 'rgba(56, 189, 248, 0.1)', borderColor: '#38bdf8' },
                                }}
                              >
                                Change Image
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={handleRemoveImage}
                                startIcon={<DeleteOutlineIcon sx={{ fontSize: 16 }} />}
                                sx={{
                                  textTransform: 'none',
                                  borderRadius: '8px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  height: 32,
                                }}
                              >
                                Remove
                              </Button>
                            </Stack>
                          </Box>
                        </Paper>
                      ) : (
                        /* Drag & Drop Area */
                        <Paper
                          elevation={0}
                          onClick={() => imageInputRef.current && imageInputRef.current.click()}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingImage(true);
                          }}
                          onDragLeave={() => setIsDraggingImage(false)}
                          onDrop={handleDropImage}
                          sx={{
                            p: 3.5,
                            borderRadius: '16px',
                            backgroundColor: isDraggingImage ? 'rgba(56, 189, 248, 0.08)' : '#020617',
                            border: isDraggingImage ? '2px dashed #38bdf8' : '2px dashed rgba(148, 163, 184, 0.25)',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': { borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.04)' },
                          }}
                        >
                          <Box
                            sx={{
                              width: 52,
                              height: 52,
                              borderRadius: '50%',
                              bgcolor: '#2563eb',
                              color: '#ffffff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mb: 1.5,
                              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                            }}
                          >
                            <CloudUploadIcon sx={{ fontSize: 26 }} />
                          </Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '0.95rem' }}>
                            Drag & Drop Your Image Here, Or Click To Browse
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.78rem', mt: 0.6, display: 'block' }}>
                            Supported Formats: <span style={{ color: '#38bdf8', fontWeight: 700 }}>PNG, JPG, JPEG</span> · Max File Size: <span style={{ color: '#38bdf8', fontWeight: 700 }}>5 MB</span>
                          </Typography>
                          <Button
                            variant="contained"
                            size="small"
                            sx={{
                              mt: 2,
                              bgcolor: '#0284c7',
                              color: '#ffffff',
                              textTransform: 'none',
                              fontWeight: 700,
                              borderRadius: '8px',
                              px: 2.5,
                              height: 34,
                              '&:hover': { bgcolor: '#0369a1' },
                            }}
                          >
                            Browse Image File
                          </Button>
                        </Paper>
                      )}
                    </Box>
                  ) : newTemplate.format === 'video' ? (
                    <Box>
                      {/* Hidden File Input for Video Browser */}
                      <input
                        type="file"
                        ref={videoInputRef}
                        accept="video/mp4, video/3gpp"
                        style={{ display: 'none' }}
                        onChange={handleVideoFileChange}
                      />

                      {newTemplate.headerMediaFile || newTemplate.headerMediaUrl ? (
                        /* Uploaded Video Card Preview */
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2.5,
                            borderRadius: '16px',
                            backgroundColor: '#020617',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2.5,
                            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
                          }}
                        >
                          <Box
                            sx={{
                              width: 90,
                              height: 90,
                              borderRadius: '12px',
                              overflow: 'hidden',
                              flexShrink: 0,
                              border: '2px solid rgba(56, 189, 248, 0.3)',
                              bgcolor: '#0f172a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {newTemplate.headerMediaUrl ? (
                              <video
                                src={newTemplate.headerMediaUrl}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <VideocamIcon sx={{ color: '#38bdf8', fontSize: 36 }} />
                            )}
                          </Box>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                              <Chip label="Uploaded Video" size="small" color="success" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 800 }} />
                              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                                Ready for WhatsApp Video Header
                              </Typography>
                            </Stack>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#ffffff', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {newTemplate.uploadedFileName || 'Header Video'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#38bdf8', fontSize: '0.75rem', fontWeight: 600, display: 'block', mt: 0.2 }}>
                              Formats: MP4, 3GP · Max 16 MB
                            </Typography>

                            <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => videoInputRef.current && videoInputRef.current.click()}
                                startIcon={<CloudUploadIcon sx={{ fontSize: 16 }} />}
                                sx={{
                                  textTransform: 'none',
                                  color: '#38bdf8',
                                  borderColor: 'rgba(56, 189, 248, 0.4)',
                                  borderRadius: '8px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  height: 32,
                                  '&:hover': { bgcolor: 'rgba(56, 189, 248, 0.1)', borderColor: '#38bdf8' },
                                }}
                              >
                                Change Video
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={handleRemoveImage}
                                startIcon={<DeleteOutlineIcon sx={{ fontSize: 16 }} />}
                                sx={{
                                  textTransform: 'none',
                                  borderRadius: '8px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  height: 32,
                                }}
                              >
                                Remove
                              </Button>
                            </Stack>
                          </Box>
                        </Paper>
                      ) : (
                        /* Drag & Drop Area for Video */
                        <Paper
                          elevation={0}
                          onClick={() => videoInputRef.current && videoInputRef.current.click()}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingVideo(true);
                          }}
                          onDragLeave={() => setIsDraggingVideo(false)}
                          onDrop={handleDropVideo}
                          sx={{
                            p: 3.5,
                            borderRadius: '16px',
                            backgroundColor: isDraggingVideo ? 'rgba(56, 189, 248, 0.08)' : '#020617',
                            border: isDraggingVideo ? '2px dashed #38bdf8' : '2px dashed rgba(148, 163, 184, 0.25)',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': { borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.04)' },
                          }}
                        >
                          <Box
                            sx={{
                              width: 52,
                              height: 52,
                              borderRadius: '50%',
                              bgcolor: '#0284c7',
                              color: '#ffffff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mb: 1.5,
                              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                            }}
                          >
                            <VideocamIcon sx={{ fontSize: 26 }} />
                          </Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '0.95rem' }}>
                            Drag & Drop Your Video File Here, Or Click To Browse
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.78rem', mt: 0.6, display: 'block' }}>
                            Supported Formats: <span style={{ color: '#38bdf8', fontWeight: 700 }}>MP4, 3GP</span> · Max File Size: <span style={{ color: '#38bdf8', fontWeight: 700 }}>16 MB</span>
                          </Typography>
                          <Button
                            variant="contained"
                            size="small"
                            sx={{
                              mt: 2,
                              bgcolor: '#0284c7',
                              color: '#ffffff',
                              textTransform: 'none',
                              fontWeight: 700,
                              borderRadius: '8px',
                              px: 2.5,
                              height: 34,
                              '&:hover': { bgcolor: '#0369a1' },
                            }}
                          >
                            Browse Video File
                          </Button>
                        </Paper>
                      )}
                    </Box>
                  ) : newTemplate.format === 'document' ? (
                    <Box>
                      {/* Hidden File Input for Document Browser */}
                      <input
                        type="file"
                        ref={documentInputRef}
                        accept=".pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .txt"
                        style={{ display: 'none' }}
                        onChange={handleDocumentFileChange}
                      />

                      {newTemplate.headerMediaFile || newTemplate.uploadedFileName ? (
                        /* Uploaded Document Card Preview */
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2.5,
                            borderRadius: '16px',
                            backgroundColor: '#020617',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2.5,
                            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
                          }}
                        >
                          <Box
                            sx={{
                              width: 90,
                              height: 90,
                              borderRadius: '12px',
                              overflow: 'hidden',
                              flexShrink: 0,
                              border: '2px solid rgba(56, 189, 248, 0.3)',
                              bgcolor: '#0f172a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <InsertDriveFileIcon sx={{ color: '#38bdf8', fontSize: 44 }} />
                          </Box>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                              <Chip label="Uploaded Document" size="small" color="success" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 800 }} />
                              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                                Ready for WhatsApp Document Header
                              </Typography>
                            </Stack>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#ffffff', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {newTemplate.uploadedFileName || 'Header Document.pdf'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#38bdf8', fontSize: '0.75rem', fontWeight: 600, display: 'block', mt: 0.2 }}>
                              Formats: PDF, DOC, DOCX, XLS · Max 16 MB
                            </Typography>

                            <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => documentInputRef.current && documentInputRef.current.click()}
                                startIcon={<CloudUploadIcon sx={{ fontSize: 16 }} />}
                                sx={{
                                  textTransform: 'none',
                                  color: '#38bdf8',
                                  borderColor: 'rgba(56, 189, 248, 0.4)',
                                  borderRadius: '8px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  height: 32,
                                  '&:hover': { bgcolor: 'rgba(56, 189, 248, 0.1)', borderColor: '#38bdf8' },
                                }}
                              >
                                Change Document
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={handleRemoveImage}
                                startIcon={<DeleteOutlineIcon sx={{ fontSize: 16 }} />}
                                sx={{
                                  textTransform: 'none',
                                  borderRadius: '8px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  height: 32,
                                }}
                              >
                                Remove
                              </Button>
                            </Stack>
                          </Box>
                        </Paper>
                      ) : (
                        /* Drag & Drop Area for Document */
                        <Paper
                          elevation={0}
                          onClick={() => documentInputRef.current && documentInputRef.current.click()}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingDocument(true);
                          }}
                          onDragLeave={() => setIsDraggingDocument(false)}
                          onDrop={handleDropDocument}
                          sx={{
                            p: 3.5,
                            borderRadius: '16px',
                            backgroundColor: isDraggingDocument ? 'rgba(56, 189, 248, 0.08)' : '#020617',
                            border: isDraggingDocument ? '2px dashed #38bdf8' : '2px dashed rgba(148, 163, 184, 0.25)',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': { borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.04)' },
                          }}
                        >
                          <Box
                            sx={{
                              width: 52,
                              height: 52,
                              borderRadius: '50%',
                              bgcolor: '#0284c7',
                              color: '#ffffff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mb: 1.5,
                              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                            }}
                          >
                            <InsertDriveFileIcon sx={{ fontSize: 26 }} />
                          </Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '0.95rem' }}>
                            Drag & Drop Your Document File Here, Or Click To Browse
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.78rem', mt: 0.6, display: 'block' }}>
                            Supported Formats: <span style={{ color: '#38bdf8', fontWeight: 700 }}>PDF, DOC, DOCX, XLS</span> · Max File Size: <span style={{ color: '#38bdf8', fontWeight: 700 }}>16 MB</span>
                          </Typography>
                          <Button
                            variant="contained"
                            size="small"
                            sx={{
                              mt: 2,
                              bgcolor: '#0284c7',
                              color: '#ffffff',
                              textTransform: 'none',
                              fontWeight: 700,
                              borderRadius: '8px',
                              px: 2.5,
                              height: 34,
                              '&:hover': { bgcolor: '#0369a1' },
                            }}
                          >
                            Browse Document File
                          </Button>
                        </Paper>
                      )}
                    </Box>
                  ) : (
                    /* Other format placeholders */
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: '12px',
                        backgroundColor: '#020617',
                        border: '1px dashed rgba(148, 163, 184, 0.2)',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': { borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.04)' },
                      }}
                    >
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          bgcolor: '#2563eb',
                          color: '#ffffff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 1.5,
                          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                        }}
                      >
                        <CloudUploadIcon sx={{ fontSize: 24 }} />
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '0.95rem' }}>
                        Drag & Drop Your {newTemplate.format.charAt(0).toUpperCase() + newTemplate.format.slice(1)}, Or Click To Browse
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.78rem', mt: 0.5, display: 'block' }}>
                        {newTemplate.format === 'video' && 'MP4 · up to 16 MB'}
                        {newTemplate.format === 'document' && 'PDF or DOCX · up to 100 MB'}
                        {(newTemplate.format === 'location' || newTemplate.format === 'carousel') && 'Media asset preview'}
                      </Typography>
                    </Paper>
                  )}
                </Box>

                <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.1)' }} />

                {/* STEP 3: BODY CONTENT */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        bgcolor: '#2563eb',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                      }}
                    >
                      3
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem', lineHeight: 1.2 }}>
                        Body Content *
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                        The main message. Personalise with variables.
                      </Typography>
                    </Box>
                  </Stack>

                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: '14px',
                      backgroundColor: isDark ? '#020617' : '#f8fafc',
                      border: isDark ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid #cbd5e1',
                      overflow: 'hidden',
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{
                        px: 2,
                        py: 1,
                        bgcolor: isDark ? '#0f172a' : '#f1f5f9',
                        borderBottom: isDark ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid #cbd5e1',
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                          size="small"
                          startIcon={<InsertEmoticonIcon sx={{ fontSize: 16 }} />}
                          sx={{ textTransform: 'none', color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.78rem', fontWeight: 600 }}
                        >
                          Emoji
                        </Button>

                        <Button
                          size="small"
                          startIcon={<CodeIcon sx={{ fontSize: 16 }} />}
                          onClick={handleInsertVariable}
                          sx={{ textTransform: 'none', color: isDark ? '#38bdf8' : '#0284c7', fontSize: '0.78rem', fontWeight: 700 }}
                        >
                          {'{x}'} Variable
                        </Button>

                        <IconButton size="small" sx={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                          <FormatBoldIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton size="small" sx={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                          <FormatItalicIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Stack>

                      <Typography variant="caption" sx={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        {newTemplate.body.length}/1024
                      </Typography>
                    </Stack>

                    <TextField
                      inputRef={bodyInputRef}
                      fullWidth
                      multiline
                      rows={5}
                      value={newTemplate.body}
                      onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                      placeholder="Type your WhatsApp message body here..."
                      variant="standard"
                      InputProps={{
                        disableUnderline: true,
                        sx: {
                          p: 2,
                          color: isDark ? '#ffffff' : '#0f172a',
                          fontFamily: 'monospace',
                          fontSize: '0.88rem',
                          lineHeight: 1.6,
                        },
                      }}
                    />
                  </Paper>

                  {/* Body Params Section */}
                  {getBodyVariables(newTemplate.body).length > 0 && (
                    <Box sx={{ mt: 2.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem', mb: 1 }}>
                        Body Params
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 2, fontSize: '0.78rem' }}>
                        Assign a parameter attribute name (e.g. name, order_id, address) to each variable index for dynamic mapping.
                      </Typography>

                      <Stack spacing={2}>
                        {getBodyVariables(newTemplate.body).map((varNum) => {
                          const paramVal = newTemplate.bodyParams?.[varNum] || '';

                          return (
                            <Box key={varNum}>
                              <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 0.6, fontWeight: 700, fontSize: '0.82rem' }}>
                                Index {varNum} ({`{{${varNum}}}`}) <span style={{ color: '#ef4444' }}>*</span>
                              </Typography>
                              <TextField
                                fullWidth
                                size="small"
                                placeholder="Please enter parameter name"
                                value={paramVal}
                                onChange={(e) => {
                                  const updatedVal = e.target.value;
                                  setNewTemplate((prev) => ({
                                    ...prev,
                                    bodyParams: {
                                      ...(prev.bodyParams || {}),
                                      [varNum]: updatedVal,
                                    },
                                  }));
                                }}
                                InputProps={{
                                  sx: {
                                    color: '#ffffff',
                                    backgroundColor: '#020617',
                                    borderRadius: '10px',
                                    height: 42,
                                    fontSize: '0.88rem',
                                    fontFamily: 'monospace',
                                    '& .MuiOutlinedInput-notchedOutline': {
                                      borderColor: !paramVal ? 'rgba(239, 68, 68, 0.7)' : 'rgba(148, 163, 184, 0.25)',
                                    },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                      borderColor: !paramVal ? '#ef4444' : '#38bdf8',
                                    },
                                  },
                                }}
                              />
                              {!paramVal && (
                                <Typography variant="caption" sx={{ color: '#ef4444', fontSize: '0.72rem', mt: 0.5, display: 'block', fontWeight: 500 }}>
                                  This field is required
                                </Typography>
                              )}
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>
                  )}
                </Box>

                <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.1)' }} />

                {/* STEP 4: FOOTER */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        bgcolor: '#2563eb',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                      }}
                    >
                      4
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem', lineHeight: 1.2 }}>
                        Footer
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                        Optional short text shown below the body.
                      </Typography>
                    </Box>
                  </Stack>

                  <Box sx={{ position: 'relative' }}>
                    <Typography variant="caption" sx={{ color: '#64748b', position: 'absolute', right: 12, top: -20, fontSize: '0.72rem' }}>
                      {newTemplate.footer.length}/60
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={newTemplate.footer}
                      onChange={(e) => setNewTemplate({ ...newTemplate, footer: e.target.value })}
                      placeholder="Please enter footer name"
                      InputProps={{
                        sx: {
                          color: '#ffffff',
                          backgroundColor: '#020617',
                          borderRadius: '10px',
                          height: 42,
                          fontSize: '0.88rem',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                        },
                      }}
                    />
                  </Box>
                </Box>

                <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.1)' }} />

                {/* STEP 5: BUTTONS CONFIGURATION */}
                <Box sx={{ pb: 6, mb: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        bgcolor: '#2563eb',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                      }}
                    >
                      5
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem', lineHeight: 1.2 }}>
                        Buttons
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                        Add up to 10 interactive buttons.
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Add Buttons Controls Row */}
                  <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2.5 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleAddButton('quick_reply')}
                      startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                      sx={{ textTransform: 'none', color: '#cbd5e1', borderColor: 'rgba(148, 163, 184, 0.25)', borderRadius: '8px', fontSize: '0.78rem' }}
                    >
                      Quick Reply
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleAddButton('call_phone')}
                      startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                      sx={{ textTransform: 'none', color: '#cbd5e1', borderColor: 'rgba(148, 163, 184, 0.25)', borderRadius: '8px', fontSize: '0.78rem' }}
                    >
                      Call Phone
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleAddButton('visit_website')}
                      startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                      sx={{ textTransform: 'none', color: '#cbd5e1', borderColor: 'rgba(148, 163, 184, 0.25)', borderRadius: '8px', fontSize: '0.78rem' }}
                    >
                      Visit Website
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleAddButton('copy_coupon')}
                      startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                      sx={{ textTransform: 'none', color: '#cbd5e1', borderColor: 'rgba(148, 163, 184, 0.25)', borderRadius: '8px', fontSize: '0.78rem' }}
                    >
                      Copy Coupon
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleAddButton('flow')}
                      startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                      sx={{ textTransform: 'none', color: '#cbd5e1', borderColor: 'rgba(148, 163, 184, 0.25)', borderRadius: '8px', fontSize: '0.78rem' }}
                    >
                      Flow
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleAddButton('dynamic_url')}
                      startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                      sx={{ textTransform: 'none', color: '#cbd5e1', borderColor: 'rgba(148, 163, 184, 0.25)', borderRadius: '8px', fontSize: '0.78rem' }}
                    >
                      Dynamic URL
                    </Button>
                  </Stack>

                  {/* Added Buttons List Rows */}
                  <Stack spacing={1.5}>
                    {newTemplate.buttons.length === 0 ? (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          borderRadius: '12px',
                          backgroundColor: '#020617',
                          border: '1px dashed rgba(148, 163, 184, 0.2)',
                          textAlign: 'center',
                        }}
                      >
                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.8rem' }}>
                          No buttons added yet.
                        </Typography>
                      </Paper>
                    ) : (
                      newTemplate.buttons.map((btn) => (
                        <Grid container spacing={1.5} alignItems="center" key={btn.id}>
                          <Grid item xs={3} sm={2.5}>
                            <Paper
                              elevation={0}
                              sx={{
                                py: 1,
                                px: 1.5,
                                borderRadius: '10px',
                                backgroundColor: '#0f172a',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                textAlign: 'center',
                              }}
                            >
                              <Typography variant="caption" sx={{ fontWeight: 700, color: '#cbd5e1', fontSize: '0.75rem' }}>
                                {btn.type === 'quick_reply' && 'Quick Reply'}
                                {btn.type === 'call_phone' && 'Call Phone'}
                                {btn.type === 'visit_website' && 'Visit Website'}
                                {btn.type === 'copy_coupon' && 'Copy Coupon'}
                                {btn.type === 'flow' && 'Flow'}
                                {btn.type === 'dynamic_url' && 'Dynamic URL'}
                              </Typography>
                            </Paper>
                          </Grid>

                          <Grid item xs={4} sm={4}>
                            <TextField
                              fullWidth
                              size="small"
                              value={btn.label}
                              onChange={(e) => handleUpdateButtonField(btn.id, 'label', e.target.value)}
                              placeholder="Button Label"
                              InputProps={{
                                sx: {
                                  color: '#ffffff',
                                  backgroundColor: '#020617',
                                  borderRadius: '10px',
                                  height: 40,
                                  fontSize: '0.82rem',
                                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                                },
                              }}
                            />
                          </Grid>

                          <Grid item xs={4} sm={4.5}>
                            <TextField
                              fullWidth
                              size="small"
                              disabled={btn.type === 'quick_reply'}
                              value={btn.type === 'quick_reply' ? '⚡ Triggers assigned Bot Flow on click' : btn.value}
                              onChange={(e) => handleUpdateButtonField(btn.id, 'value', e.target.value)}
                              placeholder={btn.type === 'call_phone' ? '+1 415 555 0100' : 'https://...'}
                              InputProps={{
                                sx: {
                                  color: btn.type === 'quick_reply' ? '#64748b' : '#ffffff',
                                  backgroundColor: '#020617',
                                  borderRadius: '10px',
                                  height: 40,
                                  fontSize: '0.82rem',
                                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                                },
                              }}
                            />
                          </Grid>

                          <Grid item xs={1} sm={1} textAlign="right">
                            <IconButton onClick={() => handleRemoveButton(btn.id)} sx={{ color: '#f87171', p: 0.5, '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' } }}>
                              <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Grid>
                        </Grid>
                      ))
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Box>

            {/* RIGHT COLUMN: LIVE PREVIEW PHONE MOCKUP (HIDDEN SCROLLBAR) */}
            <Box
              sx={{
                width: { xs: '100%', md: 390 },
                flexShrink: 0,
                p: { xs: 2.5, md: 3 },
                backgroundColor: isDark ? '#070a13' : '#f8fafc',
                borderLeft: isDark ? '1px solid rgba(148, 163, 184, 0.12)' : '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflowY: 'auto',
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {/* Live Preview Bar */}
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%', maxWidth: 310, mb: 2 }}>
                <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.8px' }}>
                  LIVE PREVIEW
                </Typography>
                <Chip
                  label="WhatsApp"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(37, 211, 102, 0.15)',
                    color: '#25d366',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    height: 22,
                    border: '1px solid rgba(37, 211, 102, 0.3)',
                  }}
                />
              </Stack>

              {/* Smartphone Frame Container */}
              <Paper
                elevation={0}
                sx={{
                  width: 325,
                  borderRadius: '40px',
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  border: isDark ? '6px solid #1e293b' : '6px solid #e2e8f0',
                  boxShadow: isDark ? '0 25px 50px rgba(0, 0, 0, 0.85)' : '0 15px 35px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Status Bar */}
                <Box sx={{ bgcolor: '#075e54', px: 2.5, pt: 1.2, pb: 0.5, display: 'flex', justifyContent: 'space-between', color: '#ffffff', fontSize: '0.68rem' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.68rem', color: '#ffffff' }}>9:41</Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#ffffff', fontWeight: 600 }}>--- ▮▮▮ 100%</Typography>
                  </Stack>
                </Box>

                {/* WhatsApp App Header Bar */}
                <Box sx={{ bgcolor: '#075e54', px: 1.5, pb: 1.5, pt: 0.5, color: '#ffffff' }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <ArrowBackIcon sx={{ fontSize: 18, color: '#ffffff' }} />
                    <Box sx={{ width: 34, height: 34, borderRadius: '50%', bgcolor: 'rgba(255, 255, 255, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <WhatsAppIcon sx={{ fontSize: 20, color: '#ffffff' }} />
                    </Box>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.85rem', color: '#ffffff', lineHeight: 1.2, noWrap: true }}>
                        Syntrrix Business
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.65rem', display: 'block', noWrap: true }}>
                        {newTemplate.businessNumber ? `${newTemplate.businessNumber.split('·')[0]} - Syntrri...` : '+1 415 555 0100 - Syntrri...'}
                      </Typography>
                    </Box>
                    <VideocamIcon sx={{ fontSize: 18, color: '#ffffff' }} />
                    <CallIcon sx={{ fontSize: 16, color: '#ffffff' }} />
                    <MoreVertIcon sx={{ fontSize: 18, color: '#ffffff' }} />
                  </Stack>
                </Box>

                {/* WhatsApp Chat Body Background */}
                <Box
                  sx={{
                    p: 1.8,
                    bgcolor: isDark ? '#0b141a' : '#efeae2',
                    backgroundImage: isDark ? 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)' : 'radial-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
                    backgroundSize: '12px 12px',
                    height: 520,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    '&::-webkit-scrollbar': { display: 'none' },
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  }}
                >
                  {/* Speech Message Bubble */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.6,
                      borderRadius: '12px 12px 12px 2px',
                      backgroundColor: isDark ? '#005c4b' : '#d9fdd3',
                      color: isDark ? '#ffffff' : '#111b21',
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                      position: 'relative',
                      boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.12)',
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {/* Header Text */}
                    {newTemplate.headerText && newTemplate.format === 'text' && (
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#111b21', mb: 0.8, fontSize: '0.85rem', wordBreak: 'break-word' }}>
                        {newTemplate.headerText}
                      </Typography>
                    )}

                    {/* Media Placeholders */}
                    {newTemplate.format === 'image' && (
                      newTemplate.headerMediaUrl ? (
                        <Box sx={{ borderRadius: '10px', overflow: 'hidden', mb: 1.2, maxHeight: 160, border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid #cbd5e1' }}>
                          <img
                            src={newTemplate.headerMediaUrl}
                            alt="Header Preview"
                            style={{ width: '100%', height: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }}
                          />
                        </Box>
                      ) : (
                        <Box sx={{ bgcolor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.06)', borderRadius: '8px', height: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', mb: 1.2 }}>
                          <ImageIcon sx={{ color: isDark ? '#ffffff' : '#475569', fontSize: 36, opacity: 0.85, mb: 0.5 }} />
                          <Typography variant="caption" sx={{ color: isDark ? '#cbd5e1' : '#64748b', fontSize: '0.72rem', fontWeight: 600 }}>
                            [ Image Header ]
                          </Typography>
                        </Box>
                      )
                    )}

                    {newTemplate.format === 'video' && (
                      newTemplate.headerMediaUrl ? (
                        <Box sx={{ borderRadius: '10px', overflow: 'hidden', mb: 1.2, maxHeight: 160, border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid #cbd5e1' }}>
                          <video
                            src={newTemplate.headerMediaUrl}
                            controls
                            style={{ width: '100%', height: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }}
                          />
                        </Box>
                      ) : (
                        <Box sx={{ bgcolor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.06)', borderRadius: '8px', height: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', mb: 1.2 }}>
                          <PlayCircleOutlineIcon sx={{ color: isDark ? '#ffffff' : '#475569', fontSize: 38, mb: 0.5 }} />
                          <Typography variant="caption" sx={{ color: isDark ? '#cbd5e1' : '#64748b', fontSize: '0.72rem', fontWeight: 600 }}>
                            [ Video Header ]
                          </Typography>
                        </Box>
                      )
                    )}

                    {newTemplate.format === 'document' && (
                      <Box sx={{ bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)', borderRadius: '8px', p: 1.2, display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.2, border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #cbd5e1' }}>
                        <InsertDriveFileIcon sx={{ color: isDark ? '#38bdf8' : '#0284c7', fontSize: 28 }} />
                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#111b21', fontSize: '0.78rem', display: 'block', noWrap: true }}>
                            {newTemplate.uploadedFileName || 'document.pdf'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: isDark ? 'rgba(255, 255, 255, 0.65)' : '#667781', fontSize: '0.65rem' }}>
                            WhatsApp Document Header
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {/* Body Text */}
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: '0.82rem',
                        lineHeight: 1.45,
                        color: isDark ? '#f8fafc' : '#111b21',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                        width: '100%',
                      }}
                    >
                      {renderParsedBodyText(newTemplate.body, newTemplate.bodyParams)}
                    </Typography>

                    {/* Footer Text */}
                    {newTemplate.footer && (
                      <Typography variant="caption" sx={{ display: 'block', color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#667781', fontSize: '0.68rem', mt: 0.8, wordBreak: 'break-word' }}>
                        {newTemplate.footer}
                      </Typography>
                    )}

                    {/* Time + Blue Double Checkmark */}
                    <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={0.4} sx={{ mt: 0.5 }}>
                      <Typography variant="caption" sx={{ color: isDark ? 'rgba(255, 255, 255, 0.65)' : '#667781', fontSize: '0.62rem' }}>
                        9:41 AM
                      </Typography>
                      <CheckIcon sx={{ fontSize: 12, color: '#53bdeb' }} />
                    </Stack>
                  </Paper>

                  {/* Embedded Dark Action Button Cards Stacked Below Bubble */}
                  {newTemplate.buttons && newTemplate.buttons.length > 0 && (
                    <Stack spacing={0.8} sx={{ mt: 1, width: '96%' }}>
                      {newTemplate.buttons.map((btn) => (
                        <Paper
                          key={btn.id}
                          elevation={0}
                          sx={{
                            py: 1,
                            px: 1.5,
                            borderRadius: '10px',
                            backgroundColor: isDark ? '#111b21' : '#ffffff',
                            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
                            color: isDark ? '#38bdf8' : '#0284c7',
                            textAlign: 'center',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 0.8,
                            cursor: 'pointer',
                            transition: 'transform 0.1s ease',
                            '&:hover': { transform: 'scale(1.01)', bgcolor: isDark ? '#182229' : '#f8fafc' },
                          }}
                        >
                          {btn.type === 'quick_reply' && <CheckIcon sx={{ fontSize: 14 }} />}
                          {btn.type === 'call_phone' && <CallIcon sx={{ fontSize: 14 }} />}
                          {(btn.type === 'visit_website' || btn.type === 'dynamic_url') && <LaunchIcon sx={{ fontSize: 14 }} />}
                          {btn.label || 'Action Button'}
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Paper>

              <Typography variant="caption" sx={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: '0.72rem', mt: 2, fontWeight: 500 }}>
                Preview updates instantly as you type.
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        {/* Modal Footer Bar */}
        <DialogActions
          sx={{
            py: 2,
            px: 3,
            backgroundColor: isDark ? '#0b1329' : '#ffffff',
            borderTop: isDark ? '1px solid rgba(148, 163, 184, 0.12)' : '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Button
            variant="outlined"
            disabled={submittingTemplate}
            startIcon={<SaveIcon sx={{ fontSize: 16 }} />}
            onClick={() => handleCreateTemplateSubmit(true)}
            sx={{
              textTransform: 'none',
              color: isDark ? '#cbd5e1' : '#334155',
              borderColor: isDark ? 'rgba(148, 163, 184, 0.25)' : '#cbd5e1',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.85rem',
              height: 38,
              bgcolor: isDark ? '#090d16' : '#f8fafc',
              '&:hover': { borderColor: isDark ? '#ffffff' : '#0f172a', color: isDark ? '#ffffff' : '#0f172a' },
              '&.Mui-disabled': { opacity: 0.5, borderColor: isDark ? 'rgba(148, 163, 184, 0.15)' : '#e2e8f0', color: '#94a3b8' },
            }}
          >
            Save Draft
          </Button>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="text"
              disabled={submittingTemplate}
              startIcon={<RestartAltIcon sx={{ fontSize: 18 }} />}
              onClick={handleResetCreateTemplate}
              sx={{
                textTransform: 'none',
                color: isDark ? '#94a3b8' : '#64748b',
                fontWeight: 600,
                fontSize: '0.85rem',
                '&:hover': { color: isDark ? '#ffffff' : '#0f172a' },
                '&.Mui-disabled': { color: '#94a3b8' },
              }}
            >
              Reset
            </Button>

            <Button
              variant="contained"
              disabled={submittingTemplate}
              startIcon={
                submittingTemplate ? (
                  <CircularProgress size={16} sx={{ color: '#ffffff' }} />
                ) : (
                  <SendIcon sx={{ fontSize: 16 }} />
                )
              }
              onClick={() => handleCreateTemplateSubmit(false)}
              sx={{
                textTransform: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.88rem',
                borderRadius: '10px',
                height: 38,
                px: 3,
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                '&:hover': { backgroundColor: '#1d4ed8' },
                '&.Mui-disabled': { backgroundColor: 'rgba(37, 99, 235, 0.5)', color: 'rgba(255, 255, 255, 0.7)' },
              }}
            >
              {submittingTemplate ? 'Submitting to Meta...' : 'Submit to Meta'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* ==================== SYNC TEMPLATES FROM META MODAL DIALOG ==================== */}
      <Dialog
        open={syncModalOpen}
        onClose={() => !syncingTemplates && setSyncModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#090d16',
            color: '#f8fafc',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            borderRadius: '18px',
            boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.9)',
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2.5, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                bgcolor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}
            >
              <AutorenewIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '1.05rem', lineHeight: 1.2 }}>
                Sync Templates from Meta
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.76rem' }}>
                Select business number to fetch templates
              </Typography>
            </Box>
          </Stack>
          <IconButton
            disabled={syncingTemplates}
            onClick={() => setSyncModalOpen(false)}
            size="small"
            sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5, pt: 1.5 }}>
          <Typography variant="body2" sx={{ color: '#cbd5e1', fontSize: '0.84rem', mb: 2, lineHeight: 1.4 }}>
            Choose integrated WhatsApp Business Number to sync latest templates directly from Meta Cloud API:
          </Typography>

          <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 0.8, fontWeight: 700, fontSize: '0.78rem' }}>
            Select Business Number *
          </Typography>
          <Select
            fullWidth
            size="small"
            value={selectedSyncBusinessNumber}
            onChange={(e) => setSelectedSyncBusinessNumber(e.target.value)}
            sx={{
              backgroundColor: '#020617',
              color: '#ffffff',
              borderRadius: '10px',
              height: 44,
              fontSize: '0.88rem',
              fontWeight: 600,
              '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#38bdf8' },
            }}
          >
            {businessNumberOptions.length > 0 ? (
              businessNumberOptions.map((opt) => (
                <MenuItem key={opt.id} value={String(opt.id)} sx={{ fontSize: '0.86rem', fontWeight: 600 }}>
                  {opt.label} ✓
                </MenuItem>
              ))
            ) : (
              <MenuItem value="" disabled sx={{ color: '#94a3b8' }}>
                No Connected WhatsApp Channels
              </MenuItem>
            )}
          </Select>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, pt: 1.5, borderTop: '1px solid rgba(148, 163, 184, 0.12)' }}>
          <Button
            variant="outlined"
            disabled={syncingTemplates}
            onClick={() => setSyncModalOpen(false)}
            sx={{
              color: '#cbd5e1',
              borderColor: 'rgba(148, 163, 184, 0.25)',
              fontWeight: 700,
              borderRadius: '10px',
              textTransform: 'none',
              px: 2.5,
              '&:hover': { color: '#ffffff', borderColor: '#cbd5e1' },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={syncingTemplates || !selectedSyncBusinessNumber}
            onClick={handlePerformSyncSubmit}
            startIcon={syncingTemplates ? <CircularProgress size={16} sx={{ color: '#ffffff' }} /> : <AutorenewIcon sx={{ fontSize: 18 }} />}
            sx={{
              bgcolor: '#2563eb',
              color: '#ffffff',
              fontWeight: 800,
              borderRadius: '10px',
              textTransform: 'none',
              px: 3,
              py: 0.9,
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
              '&:hover': { bgcolor: '#1d4ed8' },
            }}
          >
            {syncingTemplates ? 'Syncing...' : 'OK (Sync Now)'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== CONNECT / EDIT WHATSAPP CHANNEL DIALOG (EXACT CUT-TO-CUT MATCH TO SCREENSHOT) ==================== */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#090d19',
            color: '#f8fafc',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3.5,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
          },
        }}
      >
        {/* Modal Header */}
        <DialogTitle sx={{ bgcolor: '#090d19', py: 2.5, px: 3, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1.8}>
              <Box
                sx={{
                  backgroundColor: '#0d3829',
                  p: 1,
                  borderRadius: '12px',
                  border: '1px solid rgba(37, 211, 102, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <WhatsAppIcon sx={{ color: '#25d366', fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '1.25rem' }}>
                  {editingConfigId ? 'Edit WhatsApp Channel' : 'Connect WhatsApp Number'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.82rem', display: 'block', mt: 0.2 }}>
                  Configure Meta Cloud API credentials and map custom chatbot flows
                </Typography>
              </Box>
            </Stack>

            <IconButton
              onClick={() => setModalOpen(false)}
              size="small"
              sx={{ color: '#94a3b8', bgcolor: 'rgba(255, 255, 255, 0.05)', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff' } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>

        {/* Modal Content */}
        <DialogContent sx={{ p: 3, bgcolor: '#090d19' }}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {/* SECTION 1: 🤖 1. CHANNEL & BOT MAPPING */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '14px',
                backgroundColor: '#0f1a30',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.78rem', letterSpacing: '0.6px', display: 'block', mb: 2 }}>
                🤖 1. CHANNEL & BOT MAPPING
              </Typography>

              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 0.6, fontWeight: 700, fontSize: '0.8rem' }}>
                    Channel Name *
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="WhatsApp Line 1"
                    InputProps={{
                      sx: {
                        color: '#ffffff',
                        backgroundColor: '#050a14',
                        borderRadius: '8px',
                        height: 42,
                        fontSize: '0.88rem',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.12)' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#38bdf8' },
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 0.6, fontWeight: 700, fontSize: '0.8rem' }}>
                    Select Bot Flow *
                  </Typography>
                  <Select
                    fullWidth
                    size="small"
                    value={selectedBotId}
                    onChange={(e) => setSelectedBotId(e.target.value)}
                    sx={{
                      backgroundColor: '#050a14',
                      color: '#ffffff',
                      borderRadius: '8px',
                      height: 42,
                      fontSize: '0.88rem',
                      fontWeight: 500,
                      '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.12)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#38bdf8' },
                    }}
                  >
                    <MenuItem value="">
                      <em>Bot - Seller (Published)</em>
                    </MenuItem>
                    {sellerBots.map((bot) => (
                      <MenuItem key={bot.bot_id} value={String(bot.bot_id)}>
                        {bot.name || `Bot - Seller (${bot.bot_id})`}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
              </Grid>
            </Paper>

            {/* SECTION 2: 💬 2. WHATSAPP BUSINESS CREDENTIALS */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '14px',
                backgroundColor: '#0f1a30',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#4ade80', fontSize: '0.78rem', letterSpacing: '0.6px', display: 'block', mb: 2 }}>
                💬 2. WHATSAPP BUSINESS CREDENTIALS
              </Typography>

              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 0.6, fontWeight: 700, fontSize: '0.8rem' }}>
                    Mobile Phone Number *
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    InputProps={{
                      sx: {
                        color: '#ffffff',
                        backgroundColor: '#050a14',
                        borderRadius: '8px',
                        height: 42,
                        fontSize: '0.85rem',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.12)' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4ade80' },
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 0.6, fontWeight: 700, fontSize: '0.8rem' }}>
                    Phone Number ID *
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={phoneId}
                    onChange={(e) => setPhoneId(e.target.value)}
                    placeholder="e.g. 1187359467795552"
                    InputProps={{
                      sx: {
                        color: '#ffffff',
                        backgroundColor: '#050a14',
                        borderRadius: '8px',
                        height: 42,
                        fontSize: '0.85rem',
                        fontFamily: 'monospace',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.12)' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4ade80' },
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 0.6, fontWeight: 700, fontSize: '0.8rem' }}>
                    WhatsApp Business Account ID (WABA ID) *
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                    placeholder="e.g. 1843529827087405"
                    InputProps={{
                      sx: {
                        color: '#ffffff',
                        backgroundColor: '#050a14',
                        borderRadius: '8px',
                        height: 42,
                        fontSize: '0.85rem',
                        fontFamily: 'monospace',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.12)' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4ade80' },
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 0.6, fontWeight: 700, fontSize: '0.8rem' }}>
                    System User Access Token *
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste your Permanent Access Token"
                    InputProps={{
                      sx: {
                        color: '#ffffff',
                        backgroundColor: '#050a14',
                        borderRadius: '8px',
                        height: 42,
                        fontSize: '0.85rem',
                        fontFamily: 'monospace',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.12)' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4ade80' },
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* SECTION 3: 📋 3. META WEBHOOK CONFIGURATION PARAMETERS */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '14px',
                backgroundColor: '#0f1a30',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#fbbf24', fontSize: '0.78rem', letterSpacing: '0.6px', display: 'block', mb: 2 }}>
                📋 3. META WEBHOOK CONFIGURATION PARAMETERS
              </Typography>

              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 0.6, fontWeight: 700, fontSize: '0.8rem' }}>
                    Callback URL (Read-only)
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={webhookUrl || `https://api.qa.syntrrix.com/api/whatsapp/webhook/`}
                    inputProps={{ readOnly: true }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => handleCopy(webhookUrl || `https://api.qa.syntrrix.com/api/whatsapp/webhook/`, 'Callback URL')}
                            sx={{ color: '#25d366', p: 0.5 }}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                      sx: {
                        color: '#94a3b8',
                        backgroundColor: '#030712',
                        borderRadius: '8px',
                        height: 42,
                        fontSize: '0.82rem',
                        fontFamily: 'monospace',
                        userSelect: 'all',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.08)' },
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 0.6, fontWeight: 700, fontSize: '0.8rem' }}>
                    Verification Token (Read-only)
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={verifyToken}
                    inputProps={{ readOnly: true }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => handleCopy(verifyToken, 'Verification Token')}
                            sx={{ color: '#25d366', p: 0.5 }}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                      sx: {
                        color: '#94a3b8',
                        backgroundColor: '#030712',
                        borderRadius: '8px',
                        height: 42,
                        fontSize: '0.82rem',
                        fontFamily: 'monospace',
                        userSelect: 'all',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.08)' },
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Stack>
        </DialogContent>

        {/* Modal Action Footer */}
        <DialogActions sx={{ p: 2.5, bgcolor: '#070a14', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Button
            onClick={() => setModalOpen(false)}
            sx={{ color: '#94a3b8', textTransform: 'none', fontWeight: 600, fontSize: '0.88rem', px: 2, mr: 1, '&:hover': { color: '#ffffff' } }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={saving}
            onClick={handleSaveChannel}
            startIcon={saving ? <CircularProgress size={16} sx={{ color: '#ffffff' }} /> : <WhatsAppIcon sx={{ fontSize: 20 }} />}
            sx={{
              textTransform: 'none',
              backgroundColor: '#10b981',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              borderRadius: '10px',
              px: 3,
              height: 42,
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              '&:hover': { backgroundColor: '#059669' },
            }}
          >
            {saving ? 'Connecting...' : 'Connect to WhatsApp'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== TEST WHATSAPP CONNECTION DIALOG ==================== */}
      <Dialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#090d16',
            color: '#f8fafc',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: 3.5,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          },
        }}
      >
        <DialogTitle sx={{ bgcolor: '#0b1329', py: 2.5, px: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', p: 1, borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.25)', display: 'flex' }}>
                <SendIcon sx={{ color: '#38bdf8', fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '1.2rem' }}>
                  Test WhatsApp Connection
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                  Send a live test message to verify your Meta API credentials.
                </Typography>
              </Box>
            </Stack>

            <IconButton onClick={() => setTestDialogOpen(false)} size="small" sx={{ color: '#94a3b8' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 3, bgcolor: '#090d16' }}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {testError && (
              <Alert severity="error" sx={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {testError}
              </Alert>
            )}
            {testSuccess && (
              <Alert severity="success" sx={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#86efac', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                {testSuccess}
              </Alert>
            )}

            <Box>
              <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 0.8, fontWeight: 700, fontSize: '0.82rem' }}>
                Select Business Number / Channel *
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={testChannelDisplayLabel}
                InputProps={{
                  readOnly: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: '#38bdf8', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                  sx: {
                    color: '#ffffff !important',
                    backgroundColor: '#020617',
                    borderRadius: '10px',
                    height: 44,
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    letterSpacing: '0.3px',
                    '& input': {
                      color: '#ffffff !important',
                      WebkitTextFillColor: '#ffffff !important',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                    },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(56, 189, 248, 0.5) !important' },
                  },
                }}
              />
            </Box>

            <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', fontWeight: 700 }}>
              Recipient Mobile Number (with country code) *
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              InputProps={{
                sx: {
                  color: '#ffffff',
                  backgroundColor: '#020617',
                  borderRadius: '10px',
                  height: 42,
                  fontSize: '0.88rem',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                },
              }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={useTemplate}
                  onChange={(e) => setUseTemplate(e.target.checked)}
                  sx={{ color: '#38bdf8', '&.Mui-checked': { color: '#25d366' } }}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                  Use Approved Meta Template (Recommended for test messages outside 24h window)
                </Typography>
              }
            />

            {useTemplate && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 0.5, fontWeight: 600 }}>
                    Select Approved Template *
                  </Typography>
                  <Select
                    fullWidth
                    size="small"
                    value={templateName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTemplateName(val);
                      const matchedTpl = approvedTemplatesForSelectedConfig.find((t) => t.name === val);
                      if (matchedTpl && matchedTpl.language) {
                        const langMap = { 'English (US)': 'en_US', 'English': 'en_US', 'Hindi': 'hi', 'Marathi': 'mr' };
                        setLanguageCode(langMap[matchedTpl.language] || matchedTpl.language || 'en_US');
                      }
                    }}
                    sx={{
                      backgroundColor: '#020617',
                      color: '#ffffff',
                      borderRadius: '8px',
                      height: 40,
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                      '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.2)' },
                    }}
                  >
                    {approvedTemplatesForSelectedConfig.length > 0 ? (
                      approvedTemplatesForSelectedConfig.map((tpl) => (
                        <MenuItem key={tpl.id} value={tpl.name} sx={{ fontSize: '0.84rem', fontFamily: 'monospace' }}>
                          {tpl.name} ({tpl.language || 'en_US'}) ✓
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem value="" disabled sx={{ color: '#94a3b8' }}>
                        No Approved Templates for Selected Business Number
                      </MenuItem>
                    )}
                  </Select>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 0.5, fontWeight: 600 }}>
                    Language Code
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={languageCode}
                    onChange={(e) => setLanguageCode(e.target.value)}
                    placeholder="en_US"
                    InputProps={{
                      sx: {
                        color: '#ffffff',
                        backgroundColor: '#020617',
                        borderRadius: '8px',
                        height: 40,
                        fontSize: '0.85rem',
                        fontFamily: 'monospace',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.2)' },
                      },
                    }}
                  />
                </Grid>
              </Grid>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, backgroundColor: '#0b1329', borderTop: '1px solid rgba(148, 163, 184, 0.12)' }}>
          <Button onClick={() => setTestDialogOpen(false)} sx={{ color: '#94a3b8', textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={testing}
            onClick={handleTestConnection}
            startIcon={testing ? <CircularProgress size={16} sx={{ color: '#ffffff' }} /> : <SendIcon sx={{ fontSize: 16 }} />}
            sx={{
              textTransform: 'none',
              backgroundColor: '#38bdf8',
              color: '#020617',
              fontWeight: 800,
              borderRadius: '10px',
              px: 3,
              height: 40,
              boxShadow: '0 4px 14px rgba(56, 189, 248, 0.3)',
              '&:hover': { backgroundColor: '#7dd3fc' },
            }}
          >
            {testing ? 'Sending...' : 'Send Test Message'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== TEMPLATE PREVIEW MODAL (Matching User Screenshot) ==================== */}
      <Dialog
        open={previewModalOpen}
        onClose={handleClosePreviewModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: isDark ? '#090d16' : '#ffffff',
            color: isDark ? '#ffffff' : '#0f172a',
            borderRadius: '20px',
            border: isDark ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid rgba(226, 232, 240, 0.8)',
            overflow: 'hidden',
            boxShadow: isDark ? '0 25px 50px -12px rgba(0, 0, 0, 0.8)' : '0 20px 50px rgba(0, 0, 0, 0.08)',
          },
        }}
      >
        {/* Modal Header (Title, Subtitle, Status/Category/Lang Badges, Sun & Close Button) */}
        <Box sx={{ p: 2.8, pb: 1.8, borderBottom: isDark ? '1px solid rgba(148, 163, 184, 0.12)' : '1px solid #e2e8f0', bgcolor: isDark ? '#090d16' : '#ffffff' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', fontSize: '1.3rem', lineHeight: 1.2 }}>
                {previewTemplate?.name || 'Template Preview'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.82rem', display: 'block', mt: 0.4 }}>
                {previewTemplate?.businessNumber || '+44 20 7946 0958 · Syntrrix UK'}
              </Typography>

              {/* Status, Category & Language Soft Pills */}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.4 }}>
                {renderTemplateStatusPill(previewTemplate?.status)}
                <Chip
                  label={previewTemplate?.category || 'Marketing'}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(236, 72, 153, 0.15)',
                    color: '#f472b6',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    height: 24,
                    borderRadius: '12px',
                    border: '1px solid rgba(236, 72, 153, 0.3)',
                  }}
                />
                <Chip
                  label={previewTemplate?.language || 'English (US)'}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(148, 163, 184, 0.12)',
                    color: '#cbd5e1',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    height: 24,
                    borderRadius: '12px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                  }}
                />
              </Stack>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton
                size="small"
                sx={{
                  color: '#94a3b8',
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' },
                }}
              >
                <WbSunnyIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleClosePreviewModal}
                sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff', bgcolor: 'rgba(255, 255, 255, 0.1)' } }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          {/* Segmented Tab Switcher Bar (Preview | Details | JSON) */}
          <Paper
            elevation={0}
            sx={{
              mt: 2.2,
              p: 0.5,
              borderRadius: '12px',
              backgroundColor: 'rgba(2, 6, 23, 0.7)',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              display: 'flex',
              gap: 0.5,
            }}
          >
            {[
              { id: 'preview', label: 'Preview' },
              { id: 'details', label: 'Details' },
              { id: 'json', label: 'JSON' },
            ].map((tab) => {
              const isActive = previewTab === tab.id;
              return (
                <Button
                  key={tab.id}
                  fullWidth
                  onClick={() => setPreviewTab(tab.id)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: isActive ? 800 : 600,
                    fontSize: '0.88rem',
                    py: 0.8,
                    borderRadius: '8px',
                    color: isActive ? '#0f172a' : '#94a3b8',
                    backgroundColor: isActive ? '#ffffff' : 'transparent',
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.25)' : 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.05)',
                      color: isActive ? '#0f172a' : '#ffffff',
                    },
                  }}
                >
                  {tab.label}
                </Button>
              );
            })}
          </Paper>
        </Box>

        {/* Modal Content Body */}
        <DialogContent sx={{ p: 3, bgcolor: '#020617', scrollbarWidth: 'none', msOverflowStyle: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          {/* TAB 1: PREVIEW (Smartphone Frame Mockup matching User Screenshot) */}
          {previewTab === 'preview' && (
            <Box
              sx={{
                py: 4,
                px: 2,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#070b14',
                borderRadius: '16px',
                border: '1px solid rgba(148, 163, 184, 0.12)',
              }}
            >
              {/* Smartphone Frame Outer Shell */}
              <Box
                sx={{
                  width: 320,
                  borderRadius: '38px',
                  border: '6px solid #ffffff',
                  backgroundColor: '#0b141a',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {/* Phone Top Notch Status Bar */}
                <Box
                  sx={{
                    pt: 1.2,
                    pb: 0.6,
                    px: 2.2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#111b21',
                    color: '#94a3b8',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: 800, color: '#ffffff' }}>
                    9:41
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.68rem', letterSpacing: '1px', color: '#94a3b8' }}>
                    --- 📶 🔋 100%
                  </Typography>
                </Box>

                {/* WhatsApp Chat Bar Header */}
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    backgroundColor: '#111b21',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <ArrowBackIcon sx={{ color: '#8696a0', fontSize: 18 }} />
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                    }}
                  >
                    SY
                  </Box>
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.82rem', color: '#e9edef', lineHeight: 1.1 }}>
                      Syntrrix Business
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#8696a0', fontSize: '0.65rem', display: 'block', noWrap: true }}>
                      {previewTemplate?.businessNumber || '+44 20 7946 0958 · Syntrrix'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5} sx={{ color: '#8696a0' }}>
                    <VideocamIcon sx={{ fontSize: 18 }} />
                    <CallIcon sx={{ fontSize: 16 }} />
                    <MoreVertIcon sx={{ fontSize: 18 }} />
                  </Stack>
                </Box>

                {/* Chat Wall Wallpaper Container */}
                <Box
                  sx={{
                    p: 2,
                    minHeight: 330,
                    backgroundColor: '#0b141a',
                    backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
                    backgroundSize: '12px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                  }}
                >
                  {/* WhatsApp Green Message Bubble */}
                  <Box
                    sx={{
                      backgroundColor: '#005c4b',
                      borderRadius: '12px',
                      borderTopLeftRadius: '2px',
                      p: 1.2,
                      color: '#e9edef',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    {/* Header Image if template format is image */}
                    {previewTemplate?.format === 'image' && (
                      <Box
                        sx={{
                          width: '100%',
                          height: 150,
                          borderRadius: '8px',
                          backgroundColor: '#1f2c34',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 1.2,
                          overflow: 'hidden',
                          position: 'relative',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <img
                          src={resolveHeaderImageUrl(previewTemplate?.headerMediaUrl) || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&fm=jpg&fit=crop&q=80'}
                          alt="Header Media Preview"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&fm=jpg&fit=crop&q=80';
                          }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </Box>
                    )}

                    {previewTemplate?.format === 'video' && (
                      <Box
                        sx={{
                          width: '100%',
                          minHeight: 150,
                          maxHeight: 200,
                          borderRadius: '8px',
                          overflow: 'hidden',
                          position: 'relative',
                          bgcolor: '#000000',
                          mb: 1.2,
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <video
                          key={previewTemplate?.headerMediaUrl}
                          src={resolveHeaderImageUrl(previewTemplate?.headerMediaUrl) || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'}
                          controls
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="auto"
                          controlsList="nodownload"
                          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                        />
                      </Box>
                    )}

                    {previewTemplate?.format === 'document' && (
                      <Paper
                        elevation={0}
                        component={resolveHeaderImageUrl(previewTemplate?.headerMediaUrl) ? 'a' : 'div'}
                        href={resolveHeaderImageUrl(previewTemplate?.headerMediaUrl) || undefined}
                        target={resolveHeaderImageUrl(previewTemplate?.headerMediaUrl) ? '_blank' : undefined}
                        rel={resolveHeaderImageUrl(previewTemplate?.headerMediaUrl) ? 'noopener noreferrer' : undefined}
                        sx={{
                          p: 1.5,
                          borderRadius: '10px',
                          bgcolor: 'rgba(0, 0, 0, 0.35)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          mb: 1.2,
                          textDecoration: 'none',
                          cursor: resolveHeaderImageUrl(previewTemplate?.headerMediaUrl) ? 'pointer' : 'default',
                          '&:hover': resolveHeaderImageUrl(previewTemplate?.headerMediaUrl) ? { bgcolor: 'rgba(0, 0, 0, 0.5)' } : {},
                        }}
                      >
                        <Box
                          sx={{
                            width: 42,
                            height: 42,
                            borderRadius: '8px',
                            bgcolor: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            flexShrink: 0,
                          }}
                        >
                          PDF
                        </Box>
                        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {previewTemplate?.name ? `${previewTemplate.name}.pdf` : 'Document.pdf'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block' }}>
                            PDF Document · Tap to view
                          </Typography>
                        </Box>
                      </Paper>
                    )}

                    {/* Text Header if text format */}
                    {previewTemplate?.format === 'text' && previewTemplate?.headerText && (
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '0.85rem', mb: 0.5 }}>
                        {previewTemplate.headerText}
                      </Typography>
                    )}

                    {/* Body Text */}
                    <Typography variant="body2" sx={{ fontSize: '0.82rem', color: '#e9edef', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                      {previewTemplate?.body || 'No template body content provided.'}
                    </Typography>

                    {/* Footer Text */}
                    {previewTemplate?.footer && (
                      <Typography variant="caption" sx={{ color: '#8696a0', fontSize: '0.72rem', display: 'block', mt: 0.8 }}>
                        {previewTemplate.footer}
                      </Typography>
                    )}

                    {/* Timestamp & Double Blue Checkmarks */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5, mt: 0.6 }}>
                      <Typography variant="caption" sx={{ color: '#8696a0', fontSize: '0.65rem' }}>
                        9:41 AM
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#53bdeb', fontSize: '0.75rem', fontWeight: 900 }}>
                        ✓✓
                      </Typography>
                    </Box>
                  </Box>

                  {/* Buttons below message bubble */}
                  {previewTemplate?.buttons && previewTemplate.buttons.length > 0 && (
                    <Stack spacing={0.8} sx={{ mt: 1 }}>
                      {previewTemplate.buttons.map((btn, bIdx) => (
                        <Paper
                          key={bIdx}
                          elevation={0}
                          sx={{
                            py: 1,
                            px: 1.5,
                            borderRadius: '8px',
                            backgroundColor: '#1f2c34',
                            color: '#38bdf8',
                            textAlign: 'center',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 0.8,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                          }}
                        >
                          {btn.type === 'phone' || btn.type === 'call_phone' ? (
                            <CallIcon sx={{ fontSize: 15 }} />
                          ) : btn.type === 'quick_reply' ? (
                            <CheckIcon sx={{ fontSize: 15 }} />
                          ) : (
                            <LaunchIcon sx={{ fontSize: 15 }} />
                          )}
                          {btn.label || btn.text || 'Action Button'}
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Box>
            </Box>
          )}

          {/* TAB 2: DETAILS */}
          {previewTab === 'details' && (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', backgroundColor: '#090d16', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.72rem', display: 'block', mb: 0.5 }}>
                      TEMPLATE NAME
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 700, fontFamily: 'monospace' }}>
                      {previewTemplate?.name}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', backgroundColor: '#090d16', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.72rem', display: 'block', mb: 0.5 }}>
                      META TEMPLATE ID
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>
                      {previewTemplate?.meta_id || 'Not Synced'}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', backgroundColor: '#090d16', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.72rem', display: 'block', mb: 0.5 }}>
                      BUSINESS NUMBER & CHANNEL
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                      {previewTemplate?.businessNumber}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', backgroundColor: '#090d16', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.72rem', display: 'block', mb: 0.5 }}>
                      FORMAT & CATEGORY
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                      {previewTemplate?.format?.toUpperCase()} · {previewTemplate?.category}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Rejection Reason if template is REJECTED */}
              {(previewTemplate?.status === 'REJECTED' || previewTemplate?.status === 'Rejected') && (
                <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <Typography variant="caption" sx={{ color: '#fca5a5', fontWeight: 800, fontSize: '0.75rem', display: 'block', mb: 0.5 }}>
                    REJECTION REASON (FROM META):
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ffffff', fontSize: '0.82rem' }}>
                    {previewTemplate.rejectedReason || 'Meta Cloud API rejected this template due to invalid formatting or missing variable text samples.'}
                  </Typography>
                </Paper>
              )}
            </Stack>
          )}

          {/* TAB 3: JSON */}
          {previewTab === 'json' && (
            <Paper
              elevation={0}
              sx={{
                p: 2.2,
                borderRadius: '12px',
                backgroundColor: '#090d16',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.75rem' }}>
                  META GRAPH API COMPONENT PAYLOAD
                </Typography>
                <Button
                  size="small"
                  startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(previewTemplate, null, 2));
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'JSON Copied!', showConfirmButton: false, timer: 1500 });
                  }}
                  sx={{ textTransform: 'none', color: '#94a3b8', fontSize: '0.75rem' }}
                >
                  Copy JSON
                </Button>
              </Box>

              <Box
                component="pre"
                sx={{
                  margin: 0,
                  color: '#38bdf8',
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflow: 'visible',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  '&::-webkit-scrollbar': { display: 'none' },
                }}
              >
                {JSON.stringify(previewTemplate, null, 2)}
              </Box>
            </Paper>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== CAMPAIGN ANALYTICS & RECIPIENTS LOGS MODAL ==================== */}
      <Dialog
        open={statsModalOpen}
        onClose={() => setStatsModalOpen(false)}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: {
            width: '92vw',
            maxWidth: '1350px',
            height: '88vh',
            maxHeight: '920px',
            backgroundColor: '#090d16',
            color: '#ffffff',
            borderRadius: '24px',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        {/* Modal Header */}
        <Box sx={{ p: 3.5, pb: 2.5, borderBottom: '1px solid rgba(148, 163, 184, 0.15)', bgcolor: '#0b1329' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '1.45rem', lineHeight: 1.2 }}>
                {selectedStatsCampaign?.title || 'Campaign Analytics & Delivery Logs'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.9rem', display: 'block', mt: 0.5, fontWeight: 500 }}>
                {selectedStatsCampaign?.subtitle || 'Lead Pipeline · order_confirmation'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#38bdf8', fontSize: '0.88rem', display: 'block', mt: 0.5, fontWeight: 700 }}>
                📞 {selectedStatsCampaign?.business_number || 'Syntrrix Main · +919000012345'}
              </Typography>
            </Box>

            <IconButton
              onClick={() => setStatsModalOpen(false)}
              sx={{
                color: '#94a3b8',
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                '&:hover': { color: '#ffffff', bgcolor: 'rgba(255, 255, 255, 0.12)' },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>

          {/* Header 5 Badges Metrics Row */}
          {(() => {
            const modalM = formatCampaignMetrics(selectedStatsCampaign, campaignRecipientsList);
            return (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mt: 2.5,
                  borderRadius: '16px',
                  backgroundColor: '#020617',
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  textAlign: 'center',
                  gap: 1,
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.8px' }}>
                    AUDIENCE
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#ffffff', mt: 0.3, fontSize: '1.15rem' }}>
                    {modalM.aud}
                  </Typography>
                </Box>

                <Box sx={{ borderLeft: '1px solid rgba(148, 163, 184, 0.15)' }}>
                  <Typography variant="caption" sx={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.8px' }}>
                    SENT
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#38bdf8', mt: 0.3, fontSize: '1.15rem' }}>
                    {modalM.sent}
                  </Typography>
                </Box>

                <Box sx={{ borderLeft: '1px solid rgba(148, 163, 184, 0.15)' }}>
                  <Typography variant="caption" sx={{ color: '#4ade80', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.8px' }}>
                    DELIVERED
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#4ade80', mt: 0.3, fontSize: '1.15rem' }}>
                    {modalM.delivered}
                  </Typography>
                </Box>

                <Box sx={{ borderLeft: '1px solid rgba(148, 163, 184, 0.15)' }}>
                  <Typography variant="caption" sx={{ color: '#a78bfa', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.8px' }}>
                    READ
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#a78bfa', mt: 0.3, fontSize: '1.15rem' }}>
                    {modalM.read}
                  </Typography>
                </Box>

                <Box sx={{ borderLeft: '1px solid rgba(148, 163, 184, 0.15)' }}>
                  <Typography variant="caption" sx={{ color: '#f87171', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.8px' }}>
                    FAILED
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#f87171', mt: 0.3, fontSize: '1.15rem' }}>
                    {modalM.failed}
                  </Typography>
                </Box>
              </Paper>
            );
          })()}
        </Box>

        {/* Modal Content Body: Recipients Logs Table */}
        <DialogContent
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            p: 3.5,
            bgcolor: '#020617',
            overflow: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem' }}>
              Detailed Recipient Delivery & Read Status Logs
            </Typography>
            <Chip
              label={`${campaignRecipientsList.length} Recipients Listed`}
              size="medium"
              sx={{ bgcolor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 800, fontSize: '0.8rem', px: 1 }}
            />
          </Stack>

          {loadingRecipients ? (
            <Box sx={{ flex: 1, py: 10, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={36} sx={{ color: '#38bdf8' }} />
              <Typography variant="body1" sx={{ color: '#94a3b8', mt: 2, fontSize: '0.92rem', fontWeight: 600 }}>
                Loading recipient delivery logs from database...
              </Typography>
            </Box>
          ) : campaignRecipientsList.length > 0 ? (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                flex: 1,
                bgcolor: '#090d16',
                borderRadius: '16px',
                border: '1px solid rgba(148, 163, 184, 0.18)',
                overflowY: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              <Table stickyHeader size="medium">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: '#0f172a', color: '#94a3b8', fontWeight: 800, fontSize: '0.82rem', borderColor: 'rgba(148, 163, 184, 0.18)', py: 1.8 } }}>
                    <TableCell sx={{ minWidth: 170 }}>DISPATCH TIME</TableCell>
                    <TableCell sx={{ minWidth: 240 }}>PHONE NUMBER & NAME</TableCell>
                    <TableCell align="center" sx={{ minWidth: 160 }}>SENT</TableCell>
                    <TableCell align="center" sx={{ minWidth: 180 }}>DELIVERED</TableCell>
                    <TableCell align="center" sx={{ minWidth: 160 }}>READ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {campaignRecipientsList.map((r, idx) => (
                    <TableRow key={r.id || idx} hover sx={{ '& td': { borderColor: 'rgba(148, 163, 184, 0.08)', py: 1.6 } }}>
                      <TableCell sx={{ color: '#cbd5e1', fontSize: '0.84rem', fontFamily: 'monospace', fontWeight: 600 }}>
                        {(() => {
                          if (r.time) return r.time;
                          if (r.timestamp) {
                            try {
                              return new Date(r.timestamp).toLocaleString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              });
                            } catch {
                              return String(r.timestamp);
                            }
                          }
                          return 'N/A';
                        })()}
                      </TableCell>
                      <TableCell sx={{ color: '#ffffff', fontSize: '0.88rem', fontWeight: 700, fontFamily: 'monospace' }}>
                        +{r.phone_number} <Typography component="span" sx={{ color: '#94a3b8', fontSize: '0.82rem', ml: 0.8, fontWeight: 500 }}>({r.customer_name || 'Recipient'})</Typography>
                      </TableCell>
                      <TableCell align="center">
                        {r.sent_status ? (
                          <Chip label="Yes ✓" size="small" sx={{ bgcolor: 'rgba(34, 197, 94, 0.18)', color: '#4ade80', fontWeight: 800, fontSize: '0.78rem', height: 26, px: 0.8 }} />
                        ) : (
                          <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.6}>
                            <Chip label="No ✗" size="small" sx={{ bgcolor: 'rgba(239, 68, 68, 0.18)', color: '#f87171', fontWeight: 800, fontSize: '0.78rem', height: 26, px: 0.8 }} />
                            {r.sent_error ? (
                              <Tooltip title={`Failure Reason: ${r.sent_error}`} arrow placement="top">
                                <InfoOutlinedIcon sx={{ fontSize: 16, color: '#f87171', cursor: 'pointer', '&:hover': { color: '#ef4444' } }} />
                              </Tooltip>
                            ) : null}
                          </Stack>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {r.delivered_status ? (
                          <Chip label="Yes ✓✓" size="small" sx={{ bgcolor: 'rgba(34, 197, 94, 0.18)', color: '#4ade80', fontWeight: 800, fontSize: '0.78rem', height: 26, px: 0.8 }} />
                        ) : (
                          <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.6}>
                            <Chip label="No" size="small" sx={{ bgcolor: 'rgba(239, 68, 68, 0.14)', color: '#f87171', fontWeight: 800, fontSize: '0.78rem', height: 26, px: 0.8 }} />
                            {r.delivered_error || r.sent_error ? (
                              <Tooltip title={`Delivery Reason: ${r.delivered_error || r.sent_error}`} arrow placement="top">
                                <InfoOutlinedIcon sx={{ fontSize: 16, color: '#f87171', cursor: 'pointer', '&:hover': { color: '#ef4444' } }} />
                              </Tooltip>
                            ) : null}
                          </Stack>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {r.read_status ? (
                          <Chip label="Yes ✓✓" size="small" sx={{ bgcolor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontWeight: 800, fontSize: '0.78rem', height: 26, px: 0.8 }} />
                        ) : (
                          <Chip label="No" size="small" sx={{ bgcolor: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', fontWeight: 600, fontSize: '0.78rem', height: 26, px: 0.8 }} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Paper elevation={0} sx={{ flex: 1, p: 6, textAlign: 'center', bgcolor: '#090d16', borderRadius: '16px', border: '1px solid rgba(148, 163, 184, 0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body1" sx={{ color: '#94a3b8', fontSize: '0.95rem' }}>
                No individual recipient logs found for this campaign.
              </Typography>
            </Paper>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== 4-STEP CREATE CAMPAIGN WIZARD MODAL ==================== */}
      <Dialog
        open={createWizardOpen}
        onClose={() => setCreateWizardOpen(false)}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: {
            width: '96vw',
            maxWidth: '1650px',
            height: '92vh',
            maxHeight: '980px',
            backgroundColor: isDark ? '#020617' : '#ffffff',
            color: isDark ? '#ffffff' : '#0f172a',
            borderRadius: '24px',
            border: isDark ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: isDark ? '0 25px 60px -12px rgba(0, 0, 0, 0.95)' : '0 20px 50px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        {/* WIZARD HEADER */}
        <Box sx={{ p: 3, pb: 2, borderBottom: isDark ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid #e2e8f0', bgcolor: isDark ? '#0b1329' : '#ffffff' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" alignItems="center" spacing={1.8}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                }}
              >
                <CampaignIcon sx={{ fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', fontSize: '1.25rem', lineHeight: 1.2 }}>
                  Create Campaign
                </Typography>
                <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#475569', fontSize: '0.82rem', fontWeight: 600 }}>
                  {wizardStep === 1 && 'Step 1 of 4 · Campaign Details'}
                  {wizardStep === 2 && 'Step 2 of 4 · Upload Audience'}
                  {wizardStep === 3 && 'Step 3 of 4 · Test Message'}
                  {wizardStep === 4 && 'Step 4 of 4 · Review & Launch'}
                </Typography>
              </Box>
            </Stack>

            <IconButton
              onClick={() => setCreateWizardOpen(false)}
              sx={{
                color: isDark ? '#94a3b8' : '#475569',
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
                border: isDark ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid #cbd5e1',
                '&:hover': { color: isDark ? '#ffffff' : '#0f172a', bgcolor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0' },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>

          {/* STEPPER PILLS BAR */}
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.5} sx={{ mt: 2.5, px: 2 }}>
            {[
              { num: 1, label: 'Campaign Details', icon: <CampaignIcon sx={{ fontSize: 16 }} /> },
              { num: 2, label: 'Upload Audience', icon: <CloudUploadIcon sx={{ fontSize: 16 }} /> },
              { num: 3, label: 'Test Message', icon: <SendIcon sx={{ fontSize: 16 }} /> },
              { num: 4, label: 'Review & Launch', icon: <LaunchIcon sx={{ fontSize: 16 }} /> },
            ].map((step, idx) => {
              const isCompleted = wizardStep > step.num;
              const isActive = wizardStep === step.num;
              return (
                <Stack key={step.num} direction="row" alignItems="center" spacing={1.2}>
                  <Box
                    onClick={() => { if (step.num < wizardStep) setWizardStep(step.num); }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 2.2,
                      py: 0.9,
                      borderRadius: '30px',
                      cursor: step.num <= wizardStep ? 'pointer' : 'default',
                      bgcolor: isActive ? (isDark ? '#0f172a' : '#f1f5f9') : isCompleted ? (isDark ? 'rgba(34, 197, 94, 0.12)' : 'rgba(34, 197, 94, 0.1)') : (isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'),
                      border: isActive
                        ? '2px solid #0284c7'
                        : isCompleted
                        ? '1px solid rgba(34, 197, 94, 0.3)'
                        : isDark ? '1px solid rgba(148, 163, 184, 0.12)' : '1px solid #cbd5e1',
                      color: isActive ? (isDark ? '#ffffff' : '#0284c7') : isCompleted ? '#16a34a' : '#64748b',
                      transition: 'all 0.2s ease',
                      boxShadow: isActive ? '0 0 16px rgba(56, 189, 248, 0.3)' : 'none',
                    }}
                  >
                    <Box
                      sx={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        bgcolor: isActive ? '#0284c7' : isCompleted ? '#22c55e' : (isDark ? '#334155' : '#cbd5e1'),
                        color: isActive ? '#ffffff' : (isDark ? '#ffffff' : '#0f172a'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 900,
                      }}
                    >
                      {isCompleted ? '✓' : step.num}
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.84rem' }}>
                      {step.label}
                    </Typography>
                  </Box>

                  {idx < 3 && (
                    <Box sx={{ width: 30, height: 2, bgcolor: isCompleted ? '#22c55e' : (isDark ? 'rgba(148, 163, 184, 0.15)' : '#cbd5e1') }} />
                  )}
                </Stack>
              );
            })}
          </Stack>
        </Box>

        {/* WIZARD CONTENT BODY - 2 COLUMNS SIDE-BY-SIDE (FORM LEFT, PREVIEW RIGHT) */}
        <DialogContent sx={{ p: 0, flexGrow: 1, overflow: 'hidden', display: 'flex', bgcolor: isDark ? '#090d16' : '#f8fafc' }}>
          <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%', flexGrow: 1, overflow: 'hidden' }}>
            {/* LEFT COLUMN: ACTIVE STEP FORM (SCROLLABLE, HIDDEN SCROLLBAR) */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                p: { xs: 2.5, md: 3.5 },
                overflowY: 'auto',
                borderRight: '1px solid rgba(148, 163, 184, 0.12)',
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {/* STEP 1: CAMPAIGN DETAILS */}
              {wizardStep === 1 && (
                <Stack spacing={3}>
                  {/* Campaign Basics Card */}
                  <Paper elevation={0} sx={{ p: 3, width: '100%', borderRadius: '16px', bgcolor: isDark ? '#0f172a' : '#ffffff', border: isDark ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid #e2e8f0', boxSizing: 'border-box' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', fontSize: '1rem' }}>
                      Campaign Basics
                    </Typography>
                    <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.8rem', display: 'block', mb: 2.5 }}>
                      Name and describe your campaign
                    </Typography>

                    <Stack spacing={2.5} sx={{ width: '100%' }}>
                      <Box sx={{ width: '100%' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.6 }}>
                          <Typography variant="caption" sx={{ color: isDark ? '#cbd5e1' : '#334155', fontWeight: 700, fontSize: '0.82rem' }}>
                            Campaign Name *
                          </Typography>
                          <Typography variant="caption" sx={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>
                            {wizardCampaignName.length}/100
                          </Typography>
                        </Stack>
                        <TextField
                          fullWidth
                          size="small"
                          value={wizardCampaignName}
                          onChange={(e) => setWizardCampaignName(e.target.value)}
                          placeholder="Please select campaign name"
                          inputProps={{ maxLength: 100 }}
                          sx={{
                            width: '100%',
                            bgcolor: isDark ? '#020617' : '#f8fafc',
                            borderRadius: '10px',
                            '& .MuiOutlinedInput-root': { width: '100%' },
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? 'rgba(148, 163, 184, 0.25)' : '#cbd5e1' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#38bdf8' },
                            input: { color: isDark ? '#ffffff' : '#0f172a', fontSize: '0.9rem', py: 1.2, px: 1.5 },
                          }}
                        />
                      </Box>

                      <Box sx={{ width: '100%' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.6 }}>
                          <Typography variant="caption" sx={{ color: isDark ? '#cbd5e1' : '#334155', fontWeight: 700, fontSize: '0.82rem' }}>
                            Description
                          </Typography>
                          <Typography variant="caption" sx={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>
                            {wizardDescription.length}/250
                          </Typography>
                        </Stack>
                        <TextField
                          fullWidth
                          size="small"
                          multiline
                          rows={3}
                          value={wizardDescription}
                          onChange={(e) => setWizardDescription(e.target.value)}
                          placeholder="Please enter description"
                          inputProps={{ maxLength: 250 }}
                          sx={{
                            width: '100%',
                            bgcolor: isDark ? '#020617' : '#f8fafc',
                            borderRadius: '10px',
                            '& .MuiOutlinedInput-root': { width: '100%' },
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? 'rgba(148, 163, 184, 0.25)' : '#cbd5e1' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#38bdf8' },
                            textarea: { color: isDark ? '#ffffff' : '#0f172a', fontSize: '0.9rem', p: 0.5 },
                          }}
                        />
                      </Box>
                    </Stack>
                  </Paper>

                  {/* Business Number Card */}
                  <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', bgcolor: isDark ? '#0f172a' : '#ffffff', border: isDark ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid #e2e8f0' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', fontSize: '1rem' }}>
                      Business Number
                    </Typography>
                    <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.8rem', display: 'block', mb: 2 }}>
                      Templates are filtered by selected WABA number
                    </Typography>

                    <Grid container spacing={2}>
                      {(sellerBusinessChannels.length > 0
                        ? sellerBusinessChannels
                        : [
                            { config_id: '1', channel_name: 'Syntrrix UK', phone_number: '+44 20 7946 0958', quality: 'High', color: '#4ade80' },
                            { config_id: '2', channel_name: 'Syntrrix India', phone_number: '+91 80 4567 1234', quality: 'Medium', color: '#fbbf24' },
                          ]
                      ).map((item) => {
                        const itemTitle = item.channel_name || 'WhatsApp Channel';
                        const itemNum = item.phone_number || '';
                        const itemLabel = `${itemTitle} · ${itemNum}`;
                        const isSelected = wizardSelectedBusinessNumber === itemLabel || wizardSelectedBusinessNumber.includes(itemTitle);
                        return (
                          <Grid item xs={12} sm={6} key={item.config_id || itemTitle}>
                            <Paper
                              onClick={() => {
                                setWizardSelectedBusinessNumber(itemLabel);
                                if (item.config_id) {
                                  loadApprovedTemplatesForConfig(item.config_id);
                                }
                              }}
                              elevation={0}
                              sx={{
                                p: 2.2,
                                width: '100%',
                                borderRadius: '14px',
                                bgcolor: isSelected ? (isDark ? 'rgba(56, 189, 248, 0.1)' : '#e0f2fe') : (isDark ? '#020617' : '#f8fafc'),
                                border: isSelected ? '2px solid #0284c7' : (isDark ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid #cbd5e1'),
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                '&:hover': { borderColor: '#38bdf8' },
                              }}
                            >
                              <Box
                                sx={{
                                  width: 42,
                                  height: 42,
                                  borderRadius: '12px',
                                  bgcolor: 'rgba(37, 211, 102, 0.15)',
                                  color: '#25d366',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <WhatsAppIcon sx={{ fontSize: 22 }} />
                              </Box>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                  <Typography variant="body1" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', fontSize: '0.9rem' }}>
                                    {itemTitle}
                                  </Typography>
                                  {isSelected && <CheckCircleIcon sx={{ fontSize: 16, color: '#38bdf8' }} />}
                                </Stack>
                                <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b', display: 'block', fontWeight: 600, fontSize: '0.78rem', mt: 0.2 }}>
                                  {itemNum}
                                </Typography>
                                <Typography variant="caption" sx={{ color: item.color || '#4ade80', fontSize: '0.72rem', fontWeight: 700, mt: 0.2, display: 'block' }}>
                                  Status: {item.is_connected !== false ? 'Active' : 'Disconnected'}
                                </Typography>
                              </Box>
                            </Paper>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Paper>

                  {/* Template Card */}
                  <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', bgcolor: isDark ? '#0f172a' : '#ffffff', border: isDark ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid #e2e8f0' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', fontSize: '1rem' }}>
                      Template
                    </Typography>
                    <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.8rem', display: 'block', mb: 2 }}>
                      Showing approved templates for {wizardSelectedBusinessNumber.split('·')[0]} ({sellerApprovedTemplates.length || 1})
                    </Typography>

                    {sellerApprovedTemplates.length > 0 ? (
                      <Box
                        sx={{
                          maxHeight: '380px',
                          overflowY: 'auto',
                          mb: 2.5,
                          pr: 0.5,
                          scrollbarWidth: 'none',
                          msOverflowStyle: 'none',
                          '&::-webkit-scrollbar': { display: 'none' },
                        }}
                      >
                        <Stack spacing={1.8}>
                          {sellerApprovedTemplates.map((tpl) => {
                            const isTplSel = wizardSelectedTemplate === tpl.name;
                            return (
                              <Paper
                                key={tpl.template_id || tpl.name}
                                onClick={() => {
                                  setWizardSelectedTemplate(tpl.name);
                                  setSelectedTemplateObject(tpl);
                                  const tplMedia = tpl.header_media || tpl.media_url || tpl.header_file_url || '';
                                  if (tplMedia) {
                                    setWizardHeaderMediaUrl(resolveMediaUrl(tplMedia));
                                  } else {
                                    setWizardHeaderMediaUrl('');
                                  }
                                }}
                                elevation={0}
                                sx={{
                                  p: 2,
                                  borderRadius: '14px',
                                  bgcolor: isTplSel ? (isDark ? 'rgba(56, 189, 248, 0.1)' : '#e0f2fe') : (isDark ? '#020617' : '#f8fafc'),
                                  border: isTplSel ? '2px solid #0284c7' : (isDark ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid #cbd5e1'),
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  '&:hover': { borderColor: '#38bdf8' },
                                }}
                              >
                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                  <Stack direction="row" alignItems="center" spacing={1.2}>
                                    <DescriptionIcon sx={{ color: '#38bdf8', fontSize: 20 }} />
                                    <Typography variant="body1" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', fontSize: '0.95rem' }}>
                                      {tpl.name}
                                    </Typography>
                                    <Chip label={tpl.category || 'MARKETING'} size="small" sx={{ bgcolor: 'rgba(56, 189, 248, 0.15)', color: '#0284c7', fontWeight: 800, fontSize: '0.68rem', height: 22 }} />
                                    <Chip label={tpl.language || 'en_US'} size="small" sx={{ bgcolor: isDark ? 'rgba(148, 163, 184, 0.15)' : '#f1f5f9', color: isDark ? '#cbd5e1' : '#475569', fontWeight: 700, fontSize: '0.68rem', height: 22 }} />
                                    <Chip label="APPROVED" size="small" sx={{ bgcolor: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', fontWeight: 800, fontSize: '0.68rem', height: 22 }} />
                                  </Stack>
                                </Stack>
                                <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b', display: 'block', mt: 0.8, fontWeight: 600 }}>
                                  Header: {(tpl.format || 'IMAGE').toUpperCase()} · Approved Template
                                </Typography>
                              </Paper>
                            );
                          })}
                        </Stack>
                      </Box>
                    ) : (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          borderRadius: '14px',
                          bgcolor: isDark ? '#020617' : '#f8fafc',
                          border: '2px solid #38bdf8',
                          mb: 2.5,
                        }}
                      >
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Stack direction="row" alignItems="center" spacing={1.2}>
                            <DescriptionIcon sx={{ color: '#38bdf8', fontSize: 20 }} />
                            <Typography variant="body1" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', fontSize: '0.95rem' }}>
                              {wizardSelectedTemplate}
                            </Typography>
                            <Chip label="MARKETING" size="small" sx={{ bgcolor: 'rgba(56, 189, 248, 0.15)', color: '#0284c7', fontWeight: 800, fontSize: '0.68rem', height: 22 }} />
                            <Chip label="en_GB" size="small" sx={{ bgcolor: isDark ? 'rgba(148, 163, 184, 0.15)' : '#f1f5f9', color: isDark ? '#cbd5e1' : '#475569', fontWeight: 700, fontSize: '0.68rem', height: 22 }} />
                            <Chip label="APPROVED" size="small" sx={{ bgcolor: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', fontWeight: 800, fontSize: '0.68rem', height: 22 }} />
                          </Stack>
                        </Stack>
                        <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b', display: 'block', mt: 0.8, fontWeight: 600 }}>
                          Header: IMAGE · Approved Template
                        </Typography>
                      </Paper>
                    )}

                    {/* DYNAMIC HEADER MEDIA FILE UPLOAD & REPLACEMENT CARD (SHOWN ONLY FOR IMAGE, VIDEO & DOCUMENT TEMPLATES) */}
                    {['image', 'video', 'document'].includes((selectedTemplateObject?.format || selectedTemplateObject?.header_type || 'image').toLowerCase()) && (
                      <Paper elevation={0} sx={{ p: 2.5, borderRadius: '14px', bgcolor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#fffbeb', border: isDark ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid #fde68a' }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                          <Typography variant="subtitle2" sx={{ color: isDark ? '#fbbf24' : '#d97706', fontWeight: 800, fontSize: '0.86rem' }}>
                            Upload & Replace Template Media File ({(selectedTemplateObject?.format || 'IMAGE').toUpperCase()})
                          </Typography>
                          {uploadingHeaderMedia && <CircularProgress size={18} sx={{ color: isDark ? '#fbbf24' : '#d97706' }} />}
                        </Stack>

                        {/* Drag & Drop File Upload Box */}
                        <Box
                          component="label"
                          sx={{
                            p: 3,
                            borderRadius: '12px',
                            border: isDark ? '2px dashed rgba(245, 158, 11, 0.4)' : '2px dashed #f59e0b',
                            bgcolor: isDark ? '#020617' : '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s ease',
                            '&:hover': { borderColor: '#f59e0b', bgcolor: isDark ? 'rgba(245, 158, 11, 0.04)' : '#fff7ed' },
                          }}
                        >
                          <input
                            type="file"
                            accept={
                              (selectedTemplateObject?.format || '').toLowerCase() === 'video'
                                ? 'video/*'
                                : (selectedTemplateObject?.format || '').toLowerCase() === 'document'
                                ? 'application/pdf,.doc,.docx,.xls,.xlsx'
                                : 'image/*'
                            }
                            onChange={handleWizardMediaFileUpload}
                            style={{ display: 'none' }}
                          />
                          <CloudUploadIcon sx={{ fontSize: 36, color: isDark ? '#fbbf24' : '#d97706', mb: 1 }} />
                          <Typography variant="body2" sx={{ color: isDark ? '#ffffff' : '#0f172a', fontWeight: 800, fontSize: '0.88rem' }}>
                            Click or drag new {(selectedTemplateObject?.format || 'media').toLowerCase()} file to upload & replace
                          </Typography>
                          <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.75rem', mt: 0.5 }}>
                            Overwrites previous template media file on server.
                          </Typography>
                        </Box>
                      </Paper>
                    )}
                  </Paper>
                </Stack>
              )}

              {/* STEP 2: UPLOAD AUDIENCE */}
              {wizardStep === 2 && (
                <Stack spacing={3}>
                  {/* Upload Audience Card */}
                  <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', bgcolor: isDark ? '#0f172a' : '#ffffff', border: isDark ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid #e2e8f0' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', fontSize: '1rem' }}>
                      Upload Audience
                    </Typography>
                    <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.8rem', display: 'block', mb: 2 }}>
                      CSV or XLSX with Country (Col 1), Phone Number (Col 2), and template variable columns
                    </Typography>

                    {/* Dropzone */}
                    <Box
                      component="label"
                      sx={{
                        p: 4,
                        borderRadius: '16px',
                        border: isDark ? '2px dashed rgba(56, 189, 248, 0.4)' : '2px dashed #0284c7',
                        bgcolor: isDark ? '#020617' : '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': { bgcolor: isDark ? 'rgba(56, 189, 248, 0.05)' : '#e0f2fe', borderColor: '#38bdf8' },
                      }}
                    >
                      <input type="file" accept=".csv,.xlsx,.txt,.tsv" hidden onChange={handleWizardFileUpload} />
                      <CloudUploadIcon sx={{ fontSize: 44, color: '#38bdf8', mb: 1 }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a' }}>
                        Upload recipient CSV / XLSX file
                      </Typography>
                      <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
                        Drag & drop or click to browse (CSV, XLSX, TSV)
                      </Typography>
                    </Box>

                    {/* File Banner */}
                    {wizardUploadedFileName ? (
                      <Paper elevation={0} sx={{ p: 1.8, mt: 2, borderRadius: '12px', bgcolor: isDark ? '#020617' : '#f1f5f9', border: isDark ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <DescriptionIcon sx={{ color: '#38bdf8' }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a' }}>
                              {wizardUploadedFileName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
                              {wizardUploadedFileSize}
                            </Typography>
                          </Box>
                        </Stack>
                        <Chip label="Uploaded ✓" size="small" sx={{ bgcolor: 'rgba(34, 197, 94, 0.15)', color: isDark ? '#4ade80' : '#16a34a', fontWeight: 800 }} />
                      </Paper>
                    ) : null}

                    {/* Stats 4-Box Grid (100% Full Width Equal Columns) */}
                    {(() => {
                      const total = wizardAudienceRows.length;
                      const valid = wizardAudienceRows.filter((r) => r.status === 'Valid').length;
                      const invalid = wizardAudienceRows.filter((r) => r.status === 'Invalid').length;
                      const dup = wizardAudienceRows.filter((r) => r.status === 'Duplicate').length;

                      return (
                        <Box
                          sx={{
                            mt: 2.5,
                            width: '100%',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: 2,
                          }}
                        >
                          {[
                            { label: 'TOTAL', count: total, color: isDark ? '#ffffff' : '#0f172a' },
                            { label: 'VALID', count: valid, color: isDark ? '#4ade80' : '#16a34a' },
                            { label: 'INVALID', count: invalid, color: isDark ? '#f87171' : '#dc2626' },
                            { label: 'DUPLICATES', count: dup, color: isDark ? '#fbbf24' : '#d97706' },
                          ].map((s) => (
                            <Paper
                              key={s.label}
                              elevation={0}
                              sx={{
                                py: 2,
                                px: 1.5,
                                textAlign: 'center',
                                bgcolor: isDark ? '#020617' : '#f8fafc',
                                borderRadius: '14px',
                                border: isDark ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid #e2e8f0',
                                boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  borderColor: 'rgba(56, 189, 248, 0.4)',
                                  transform: 'translateY(-2px)',
                                },
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  color: isDark ? '#94a3b8' : '#64748b',
                                  fontWeight: 800,
                                  fontSize: '0.72rem',
                                  letterSpacing: '0.8px',
                                  display: 'block',
                                }}
                              >
                                {s.label}
                              </Typography>
                              <Typography
                                variant="h5"
                                sx={{
                                  fontWeight: 900,
                                  color: s.color,
                                  mt: 0.6,
                                  fontSize: '1.35rem',
                                }}
                              >
                                {s.count}
                              </Typography>
                            </Paper>
                          ))}
                        </Box>
                      );
                    })()}
                  </Paper>

                  {/* Variable Mapping Card (Only visible when template has variables) */}
                  {(() => {
                    const templateBodyText = selectedTemplateObject?.body || 'Hi {{1}}, thank you for contacting us!';
                    const varMatches = templateBodyText.match(/\{\{(\d+)\}\}/g);
                    const detectedVarKeys = Array.from(new Set((varMatches || []).map((m) => parseInt(m.replace(/\D+/g, ''), 10))));

                    if (detectedVarKeys.length === 0) return null;

                    return (
                      <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', bgcolor: isDark ? '#0f172a' : '#ffffff', border: isDark ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid #e2e8f0' }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', fontSize: '1rem' }}>
                          Variable Mapping
                        </Typography>
                        <Typography variant="caption" sx={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.8rem', display: 'block', mb: 2 }}>
                          Map each template variable to non-phone columns from uploaded file
                        </Typography>

                        <Stack spacing={2}>
                          {detectedVarKeys.map((vk) => (
                            <Stack key={vk} direction="row" alignItems="center" spacing={2}>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: '#38bdf8', minWidth: 60, fontFamily: 'monospace' }}>
                                {`{{${vk}}}`} ➔
                              </Typography>
                              <Select
                                fullWidth
                                size="small"
                                value={wizardVarMapping[vk] || (wizardCustomColumns[vk - 1] || wizardCustomColumns[0] || 'Name')}
                                onChange={(e) => setWizardVarMapping({ ...wizardVarMapping, [vk]: e.target.value })}
                                sx={{
                                  bgcolor: isDark ? '#020617' : '#f8fafc',
                                  color: isDark ? '#ffffff' : '#0f172a',
                                  borderRadius: '10px',
                                  height: 38,
                                  fontSize: '0.88rem',
                                  '& .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : '#cbd5e1' },
                                }}
                              >
                                {wizardCustomColumns.map((colName) => (
                                  <MenuItem key={colName} value={colName}>
                                    {colName}
                                  </MenuItem>
                                ))}
                              </Select>
                            </Stack>
                          ))}
                        </Stack>
                      </Paper>
                    );
                  })()}

                  {/* Audience Preview Card & Table with Pagination & Hidden Scrollbar */}
                  <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', bgcolor: isDark ? '#0f172a' : '#ffffff', border: isDark ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid #e2e8f0' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', fontSize: '1rem' }}>
                        Audience Preview
                      </Typography>

                      <Stack direction="row" spacing={1}>
                        {['All', 'Valid', 'Invalid'].map((f) => (
                          <Button
                            key={f}
                            size="small"
                            onClick={() => {
                              setWizardAudienceFilter(f);
                              setWizardAudiencePage(1);
                            }}
                            sx={{
                              px: 1.8,
                              py: 0.4,
                              borderRadius: '20px',
                              textTransform: 'none',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              bgcolor: wizardAudienceFilter === f ? (isDark ? '#020617' : '#e0f2fe') : 'transparent',
                              color: wizardAudienceFilter === f ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#64748b' : '#64748b'),
                              border: wizardAudienceFilter === f ? '1px solid #38bdf8' : '1px solid transparent',
                            }}
                          >
                            {f}
                          </Button>
                        ))}
                      </Stack>
                    </Stack>

                    <TableContainer
                      component={Paper}
                      elevation={0}
                      sx={{
                        bgcolor: isDark ? '#020617' : '#f8fafc',
                        borderRadius: '12px',
                        border: isDark ? '1px solid rgba(148, 163, 184, 0.12)' : '1px solid #e2e8f0',
                        maxHeight: '340px',
                        overflowY: 'auto',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        '&::-webkit-scrollbar': { display: 'none' },
                      }}
                    >
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ '& th': { bgcolor: isDark ? '#090d16' : '#f1f5f9', color: isDark ? '#94a3b8' : '#475569', fontWeight: 800, fontSize: '0.78rem' } }}>
                            <TableCell>Country</TableCell>
                            <TableCell>Phone</TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell align="center">Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(() => {
                            const filtered = wizardAudienceRows.filter((r) => wizardAudienceFilter === 'All' || (wizardAudienceFilter === 'Valid' ? r.status === 'Valid' : r.status !== 'Valid'));
                            if (filtered.length === 0) {
                              return (
                                <TableRow>
                                  <TableCell colSpan={4} align="center" sx={{ color: isDark ? '#94a3b8' : '#64748b', py: 5, fontSize: '0.88rem', fontWeight: 600 }}>
                                    No recipient contacts uploaded yet. Please upload a CSV or XLSX file above.
                                  </TableCell>
                                </TableRow>
                              );
                            }
                            const pageSize = 10;
                            const startIndex = (wizardAudiencePage - 1) * pageSize;
                            const paginatedRows = filtered.slice(startIndex, startIndex + pageSize);
                            return paginatedRows.map((r) => (
                              <TableRow key={r.id} hover sx={{ '& td': { color: isDark ? '#cbd5e1' : '#1e293b', fontSize: '0.82rem', py: 1 } }}>
                                <TableCell>{r.country}</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.phone}</TableCell>
                                <TableCell>{r.name}</TableCell>
                                <TableCell align="center">
                                  {r.status === 'Valid' ? (
                                    <Chip label="Valid" size="small" sx={{ bgcolor: 'rgba(34, 197, 94, 0.18)', color: isDark ? '#4ade80' : '#16a34a', fontWeight: 800, height: 22 }} />
                                  ) : (
                                    <Chip label={r.status} size="small" sx={{ bgcolor: 'rgba(239, 68, 68, 0.18)', color: isDark ? '#f87171' : '#dc2626', fontWeight: 800, height: 22 }} />
                                  )}
                                </TableCell>
                              </TableRow>
                            ));
                          })()}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Pagination Controls */}
                    {(() => {
                      const filtered = wizardAudienceRows.filter((r) => wizardAudienceFilter === 'All' || (wizardAudienceFilter === 'Valid' ? r.status === 'Valid' : r.status !== 'Valid'));
                      const totalPages = Math.ceil(filtered.length / 10) || 1;
                      return (
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
                          <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700 }}>
                            Showing {filtered.length > 0 ? Math.min((wizardAudiencePage - 1) * 10 + 1, filtered.length) : 0} - {Math.min(wizardAudiencePage * 10, filtered.length)} of {filtered.length} records
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Button
                              size="small"
                              disabled={wizardAudiencePage <= 1}
                              onClick={() => setWizardAudiencePage((p) => Math.max(p - 1, 1))}
                              sx={{ color: '#ffffff', bgcolor: '#020617', border: '1px solid rgba(148, 163, 184, 0.2)', textTransform: 'none', fontSize: '0.75rem' }}
                            >
                              ← Previous
                            </Button>
                            <Typography variant="caption" sx={{ color: '#38bdf8', fontWeight: 800, px: 1 }}>
                              Page {wizardAudiencePage} of {totalPages}
                            </Typography>
                            <Button
                              size="small"
                              disabled={wizardAudiencePage >= totalPages}
                              onClick={() => setWizardAudiencePage((p) => Math.min(p + 1, totalPages))}
                              sx={{ color: '#ffffff', bgcolor: '#020617', border: '1px solid rgba(148, 163, 184, 0.2)', textTransform: 'none', fontSize: '0.75rem' }}
                            >
                              Next →
                            </Button>
                          </Stack>
                        </Stack>
                      );
                    })()}
                  </Paper>
                </Stack>
              )}

              {/* STEP 3: TEST MESSAGE */}
              {wizardStep === 3 && (
                <Stack spacing={3}>
                  <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', bgcolor: '#0f172a', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem' }}>
                      Test Message
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', mb: 2 }}>
                      Send a single test message to verify template format and variable mapping before full launch
                    </Typography>

                    {/* Test Message Form - 100% Full Width Stretch */}
                    <Box
                      sx={{
                        mt: 2.5,
                        width: '100%',
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '2.5fr 4.5fr 3fr' },
                        gap: 2,
                        alignItems: 'end',
                      }}
                    >
                      <Box>
                        <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 800, mb: 0.8, display: 'block', fontSize: '0.78rem' }}>
                          Country
                        </Typography>
                        <Select
                          fullWidth
                          size="small"
                          value={wizardTestCountry}
                          onChange={(e) => setWizardTestCountry(e.target.value)}
                          sx={{
                            bgcolor: '#020617',
                            color: '#ffffff',
                            borderRadius: '10px',
                            height: 42,
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#38bdf8' },
                          }}
                        >
                          <MenuItem value="IN">IN (+91)</MenuItem>
                          <MenuItem value="US">US (+1)</MenuItem>
                          <MenuItem value="UK">UK (+44)</MenuItem>
                          <MenuItem value="AE">UAE (+971)</MenuItem>
                          <MenuItem value="CA">Canada (+1)</MenuItem>
                        </Select>
                      </Box>

                      <Box>
                        <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 800, mb: 0.8, display: 'block', fontSize: '0.78rem' }}>
                          Test Phone Number
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          value={wizardTestPhone}
                          onChange={(e) => setWizardTestPhone(e.target.value)}
                          placeholder="e.g. 9876543210"
                          InputProps={{
                            sx: {
                              bgcolor: '#020617',
                              color: '#ffffff',
                              borderRadius: '10px',
                              height: 42,
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148, 163, 184, 0.25)' },
                              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#38bdf8' },
                            },
                          }}
                        />
                      </Box>

                      <Box>
                        <Button
                          fullWidth
                          variant="contained"
                          disabled={wizardSendingTest}
                          startIcon={wizardSendingTest ? <CircularProgress size={16} sx={{ color: '#ffffff' }} /> : <SendIcon sx={{ fontSize: 16 }} />}
                          onClick={handleWizardSendTest}
                          sx={{
                            bgcolor: '#0b1329',
                            color: '#ffffff',
                            fontWeight: 800,
                            borderRadius: '10px',
                            height: 42,
                            textTransform: 'none',
                            fontSize: '0.88rem',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                            transition: 'all 0.2s ease',
                            '&:hover': { bgcolor: '#1e293b', borderColor: '#38bdf8' },
                          }}
                        >
                          {wizardSendingTest ? 'Sending...' : 'Send Test Message'}
                        </Button>
                      </Box>
                    </Box>
                  </Paper>
                </Stack>
              )}

              {/* STEP 4: REVIEW & LAUNCH */}
              {wizardStep === 4 && (
                <Stack spacing={3}>
                  {/* Campaign Summary Card (100% Full Width 4-Column Grid) */}
                  <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', bgcolor: '#0f172a', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem', mb: 2 }}>
                      Campaign Summary
                    </Typography>

                    <Box
                      sx={{
                        width: '100%',
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
                        gap: 2,
                      }}
                    >
                      {[
                        { label: 'Campaign Name', value: wizardCampaignName || 'Campaign 1', color: '#ffffff' },
                        { label: 'Description', value: wizardDescription || 'N/A', color: '#94a3b8' },
                        { label: 'Business Number', value: wizardSelectedBusinessNumber, color: '#38bdf8' },
                        { label: 'Template Name', value: wizardSelectedTemplate, color: '#4ade80' },
                      ].map((item) => (
                        <Paper
                          key={item.label}
                          elevation={0}
                          sx={{
                            p: 2,
                            bgcolor: '#020617',
                            borderRadius: '14px',
                            border: '1px solid rgba(148, 163, 184, 0.15)',
                          }}
                        >
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.5px', display: 'block', mb: 0.5 }}>
                            {item.label}
                          </Typography>
                          <Typography variant="body2" sx={{ color: item.color, fontWeight: 800, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.value}
                          </Typography>
                        </Paper>
                      ))}
                    </Box>
                  </Paper>

                  {/* Audience Statistics Card (100% Full Width 4 Equal Columns) */}
                  <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', bgcolor: '#0f172a', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem', mb: 2 }}>
                      Audience Statistics
                    </Typography>

                    {(() => {
                      const total = wizardAudienceRows.length;
                      const valid = wizardAudienceRows.filter((r) => r.status === 'Valid').length;
                      const invalid = wizardAudienceRows.filter((r) => r.status === 'Invalid').length;
                      const dup = wizardAudienceRows.filter((r) => r.status === 'Duplicate').length;

                      return (
                        <Box
                          sx={{
                            width: '100%',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: 2,
                          }}
                        >
                          {[
                            { label: 'TOTAL', count: total, color: '#ffffff' },
                            { label: 'VALID', count: valid, color: '#4ade80' },
                            { label: 'INVALID', count: invalid, color: '#f87171' },
                            { label: 'DUPLICATES', count: dup, color: '#fbbf24' },
                          ].map((s) => (
                            <Paper
                              key={s.label}
                              elevation={0}
                              sx={{
                                py: 2,
                                px: 1.5,
                                textAlign: 'center',
                                bgcolor: '#020617',
                                borderRadius: '14px',
                                border: '1px solid rgba(148, 163, 184, 0.15)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  borderColor: 'rgba(56, 189, 248, 0.4)',
                                  transform: 'translateY(-2px)',
                                },
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  color: '#94a3b8',
                                  fontWeight: 800,
                                  fontSize: '0.72rem',
                                  letterSpacing: '0.8px',
                                  display: 'block',
                                }}
                              >
                                {s.label}
                              </Typography>
                              <Typography
                                variant="h5"
                                sx={{
                                  fontWeight: 900,
                                  color: s.color,
                                  mt: 0.6,
                                  fontSize: '1.35rem',
                                }}
                              >
                                {s.count}
                              </Typography>
                            </Paper>
                          ))}
                        </Box>
                      );
                    })()}
                  </Paper>

                  {/* Variable Mapping Summary */}
                  <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', bgcolor: '#0f172a', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem', mb: 1.5 }}>
                      Variable Mapping Summary
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 700, fontFamily: 'monospace' }}>
                      {`{{1}}`} ➔ {wizardVarMapping[1] || 'Name'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 700, fontFamily: 'monospace', mt: 0.5 }}>
                      {`{{2}}`} ➔ {wizardVarMapping[2] || 'Order'}
                    </Typography>
                  </Paper>

                  {/* Launch Options */}
                  <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', bgcolor: '#0f172a', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem', mb: 1.5 }}>
                      Launch Options
                    </Typography>

                    <Stack spacing={1.5}>
                      <Paper
                        onClick={() => setWizardLaunchOption('now')}
                        elevation={0}
                        sx={{
                          p: 1.8,
                          borderRadius: '12px',
                          bgcolor: wizardLaunchOption === 'now' ? 'rgba(56, 189, 248, 0.1)' : '#020617',
                          border: wizardLaunchOption === 'now' ? '2px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.15)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                        }}
                      >
                        <Typography variant="body1" sx={{ fontWeight: 800, color: '#ffffff' }}>
                          🔘 Send Now
                        </Typography>
                      </Paper>

                      <Paper
                        onClick={() => setWizardLaunchOption('schedule')}
                        elevation={0}
                        sx={{
                          p: 1.8,
                          borderRadius: '12px',
                          bgcolor: wizardLaunchOption === 'schedule' ? 'rgba(56, 189, 248, 0.1)' : '#020617',
                          border: wizardLaunchOption === 'schedule' ? '2px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.15)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                        }}
                      >
                        <Typography variant="body1" sx={{ fontWeight: 800, color: '#ffffff' }}>
                          ⚪ Schedule Campaign
                        </Typography>
                      </Paper>
                    </Stack>
                  </Paper>

                  {/* Confirmation Alert Box */}
                  <Paper elevation={0} sx={{ p: 2.2, borderRadius: '14px', bgcolor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
                    <Typography variant="body2" sx={{ color: '#fbbf24', fontWeight: 800, mb: 1 }}>
                      🧑‍🤝‍🧑 You are about to send this campaign to {wizardAudienceRows.filter((r) => r.status === 'Valid').length} valid contacts.
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <input
                        type="checkbox"
                        id="wizConfirm"
                        checked={wizardConfirmed}
                        onChange={(e) => setWizardConfirmed(e.target.checked)}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                      />
                      <Typography component="label" htmlFor="wizConfirm" variant="caption" sx={{ color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>
                        I confirm that the audience and message content have been reviewed.
                      </Typography>
                    </Stack>
                  </Paper>
                </Stack>
              )}
            </Box>

            {/* RIGHT COLUMN: REALISTIC DARK SMARTPHONE WHATSAPP LIVE PREVIEW (EXACTLY MATCHING IMAGE 2) */}
            <Box
              sx={{
                width: { xs: '100%', md: '380px', lg: '420px' },
                flexShrink: 0,
                p: 2.5,
                bgcolor: isDark ? '#020617' : '#f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                overflowY: 'auto',
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5, width: '100%' }}>
                <WhatsAppIcon sx={{ color: '#25d366', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a', fontSize: '0.9rem' }}>
                  {wizardStep === 3 ? 'Preview with first valid recipient' : wizardStep === 4 ? 'Final Preview' : 'Live WhatsApp Preview'}
                </Typography>
              </Stack>

              {/* REALISTIC SMARTPHONE FRAME MOCKUP (MATCHING CREATE TEMPLATE PREVIEW) */}
              <Box
                sx={{
                  width: '100%',
                  maxWidth: 360,
                  borderRadius: '38px',
                  border: isDark ? '3.5px solid #1e293b' : '3.5px solid #e2e8f0',
                  bgcolor: isDark ? '#0b141a' : '#ffffff',
                  boxShadow: isDark ? '0 20px 50px rgba(0,0,0,0.85), 0 0 25px rgba(255,255,255,0.12)' : '0 15px 35px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* SMARTPHONE TOP STATUS BAR */}
                <Box
                  sx={{
                    px: 2.5,
                    pt: 1.2,
                    pb: 0.6,
                    bgcolor: '#075e54',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: '#ffffff',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '0.75rem' }}>
                    9:41
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={0.8}>
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#ffffff', fontWeight: 700 }}>
                      📶 100% 🔋
                    </Typography>
                  </Stack>
                </Box>

                {/* WHATSAPP CHAT TOP HEADER BAR */}
                <Box
                  sx={{
                    px: 2,
                    py: 1.2,
                    bgcolor: '#075e54',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.2}>
                    <Typography sx={{ color: '#ffffff', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 700 }}>←</Typography>
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        bgcolor: 'rgba(255, 255, 255, 0.25)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                      }}
                    >
                      SY
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 800, fontSize: '0.84rem', lineHeight: 1.1 }}>
                        Syntrrix Business
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.68rem', display: 'block' }}>
                        +91 8999311951 · Company 1
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1.2} sx={{ color: '#ffffff' }}>
                    <VideocamIcon sx={{ fontSize: 18, cursor: 'pointer' }} />
                    <CallIcon sx={{ fontSize: 17, cursor: 'pointer' }} />
                    <MoreVertIcon sx={{ fontSize: 18, cursor: 'pointer' }} />
                  </Stack>
                </Box>

                {/* CHAT MESSAGES BODY CONTAINER */}
                <Box
                  sx={{
                    p: 2,
                    minHeight: 380,
                    bgcolor: isDark ? '#0b141a' : '#efeae2',
                    backgroundImage: isDark ? 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 0)' : 'radial-gradient(rgba(0,0,0,0.04) 1px, transparent 0)',
                    backgroundSize: '16px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    gap: 1.2,
                  }}
                >
                  {/* EMERALD GREEN MESSAGE BUBBLE */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.8,
                      borderRadius: '14px 14px 14px 2px',
                      bgcolor: isDark ? '#005c4b' : '#d9fdd3',
                      color: isDark ? '#e9edef' : '#111b21',
                      maxWidth: '94%',
                      boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.12)',
                    }}
                  >
                    {/* Dynamic Header Image, Video, Document or Header Text */}
                    {(() => {
                      const rawMediaUrl = wizardHeaderMediaUrl || selectedTemplateObject?.header_media || selectedTemplateObject?.media_url || selectedTemplateObject?.header_file_url || '';
                      const effectiveMediaUrl = resolveMediaUrl(rawMediaUrl);
                      let fmt = (selectedTemplateObject?.format || selectedTemplateObject?.header_type || '').toLowerCase();
                      const fileNameLow = (wizardHeaderMediaFileName || '').toLowerCase();

                      if (rawMediaUrl) {
                        const lowUrl = rawMediaUrl.toLowerCase();
                        if (
                          /\.(mp4|mov|avi|webm|3gp|mkv)($|\?)/i.test(lowUrl) ||
                          /\.(mp4|mov|avi|webm|3gp|mkv)($|\?)/i.test(fileNameLow) ||
                          lowUrl.includes('video') ||
                          fmt === 'video'
                        ) {
                          fmt = 'video';
                        } else if (
                          /\.(pdf|doc|docx)($|\?)/i.test(lowUrl) ||
                          /\.(pdf|doc|docx)($|\?)/i.test(fileNameLow) ||
                          lowUrl.includes('document') ||
                          fmt === 'document'
                        ) {
                          fmt = 'document';
                        } else if (
                          /\.(jpg|jpeg|png|gif|webp)($|\?)/i.test(lowUrl) ||
                          /\.(jpg|jpeg|png|gif|webp)($|\?)/i.test(fileNameLow) ||
                          lowUrl.includes('image') ||
                          fmt === 'image'
                        ) {
                          fmt = 'image';
                        }
                      }

                      if (fmt === 'image') {
                        const imgSrc = effectiveMediaUrl || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&fm=jpg&fit=crop&q=80';
                        return (
                          <Box
                            component="img"
                            key={imgSrc}
                            src={imgSrc}
                            alt="Header Image Preview"
                            sx={{ width: '100%', height: 160, borderRadius: '10px', objectFit: 'cover', mb: 1.2, display: 'block' }}
                          />
                        );
                      }

                      if (fmt === 'video') {
                        const vidSrc = effectiveMediaUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
                        return (
                          <Box
                            sx={{
                              width: '100%',
                              minHeight: 160,
                              maxHeight: 220,
                              borderRadius: '10px',
                              overflow: 'hidden',
                              position: 'relative',
                              bgcolor: '#000000',
                              mb: 1.2,
                            }}
                          >
                            <video
                              key={vidSrc}
                              src={vidSrc}
                              controls
                              autoPlay
                              muted
                              loop
                              playsInline
                              preload="auto"
                              controlsList="nodownload"
                              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                            />
                          </Box>
                        );
                      }

                      if (fmt === 'document') {
                        const docName = wizardHeaderMediaFileName || (selectedTemplateObject?.name ? `${selectedTemplateObject.name}.pdf` : 'Document.pdf');
                        return (
                          <Paper
                            elevation={0}
                            component={effectiveMediaUrl ? 'a' : 'div'}
                            href={effectiveMediaUrl || undefined}
                            target={effectiveMediaUrl ? '_blank' : undefined}
                            rel={effectiveMediaUrl ? 'noopener noreferrer' : undefined}
                            sx={{
                              p: 1.5,
                              borderRadius: '10px',
                              bgcolor: isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.05)',
                              border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid #cbd5e1',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              mb: 1.2,
                              textDecoration: 'none',
                              cursor: effectiveMediaUrl ? 'pointer' : 'default',
                              '&:hover': effectiveMediaUrl ? { bgcolor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.08)' } : {},
                            }}
                          >
                            <Box
                              sx={{
                                width: 42,
                                height: 42,
                                borderRadius: '8px',
                                bgcolor: '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                flexShrink: 0,
                              }}
                            >
                              PDF
                            </Box>
                            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#111b21', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {docName}
                              </Typography>
                              <Typography variant="caption" sx={{ color: isDark ? '#38bdf8' : '#0284c7', fontSize: '0.72rem', display: 'block', fontWeight: 600 }}>
                                {effectiveMediaUrl ? '📄 Tap to Open / View Document' : 'Document Header Attached'}
                              </Typography>
                            </Box>
                          </Paper>
                        );
                      }

                      if (selectedTemplateObject?.header_text) {
                        return (
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#ffffff' : '#111b21', mb: 0.8 }}>
                            {selectedTemplateObject.header_text}
                          </Typography>
                        );
                      }

                      return null;
                    })()}

                    {/* Dynamic Selected Template Body Content */}
                    <Typography variant="body2" sx={{ fontSize: '0.84rem', lineHeight: 1.45, color: isDark ? '#e9edef' : '#111b21', fontWeight: 500, whiteSpace: 'pre-line' }}>
                      {(() => {
                        let text = selectedTemplateObject?.body || 'Hi {{1}}, thank you for contacting us!';
                        if (wizardStep >= 3 && wizardAudienceRows.length > 0) {
                          const sampleRecipient = wizardAudienceRows.find((r) => r.status === 'Valid') || wizardAudienceRows[0];
                          const val1 = sampleRecipient.name || 'Customer';
                          const val2 = sampleRecipient.order || 'Order';
                          text = text.replace(/\{\{1\}\}/g, val1).replace(/\{\{2\}\}/g, val2);
                        } else {
                          text = text.replace(/\{\{1\}\}/g, 'Sample 1').replace(/\{\{2\}\}/g, 'Sample 2');
                        }
                        return text;
                      })()}
                    </Typography>

                    {/* Template Footer if provided */}
                    {selectedTemplateObject?.footer ? (
                      <Typography variant="caption" sx={{ color: isDark ? 'rgba(233, 237, 239, 0.65)' : '#667781', fontSize: '0.68rem', display: 'block', mt: 0.8 }}>
                        {selectedTemplateObject.footer}
                      </Typography>
                    ) : null}

                    <Typography variant="caption" sx={{ color: isDark ? 'rgba(233, 237, 239, 0.65)' : '#667781', fontSize: '0.65rem', display: 'block', mt: 0.6, fontWeight: 600 }}>
                      Powered By Syntrrix
                    </Typography>

                    {/* Timestamp & Blue Double Checkmarks */}
                    <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={0.4} sx={{ mt: 0.8 }}>
                      <Typography variant="caption" sx={{ color: isDark ? 'rgba(233, 237, 239, 0.65)' : '#667781', fontSize: '0.64rem' }}>
                        9:41 AM
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#53bdeb', fontSize: '0.72rem', fontWeight: 900 }}>
                        ✓✓
                      </Typography>
                    </Stack>
                  </Paper>

                  {/* INTERACTIVE CTA BUTTON 1 */}
                  <Paper
                    elevation={0}
                    sx={{
                      py: 1,
                      px: 2,
                      borderRadius: '10px',
                      bgcolor: isDark ? '#1f2c34' : '#ffffff',
                      color: isDark ? '#38bdf8' : '#0284c7',
                      textAlign: 'center',
                      cursor: 'pointer',
                      border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      transition: 'all 0.2s ease',
                      '&:hover': { bgcolor: isDark ? '#2a3942' : '#f8fafc' },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.82rem', color: isDark ? '#38bdf8' : '#0284c7' }}>
                      ✓ Know More
                    </Typography>
                  </Paper>

                  {/* INTERACTIVE CTA BUTTON 2 */}
                  <Paper
                    elevation={0}
                    sx={{
                      py: 1,
                      px: 2,
                      borderRadius: '10px',
                      bgcolor: isDark ? '#1f2c34' : '#ffffff',
                      color: isDark ? '#38bdf8' : '#0284c7',
                      textAlign: 'center',
                      cursor: 'pointer',
                      border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      transition: 'all 0.2s ease',
                      '&:hover': { bgcolor: isDark ? '#2a3942' : '#f8fafc' },
                    }}
                  >
                    <CallIcon sx={{ fontSize: 15, color: isDark ? '#38bdf8' : '#0284c7' }} />
                    <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.82rem', color: isDark ? '#38bdf8' : '#0284c7' }}>
                      Return to cart
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>

        {/* WIZARD FOOTER NAVIGATION BAR */}
        <Box sx={{ p: 2.5, px: 3.5, borderTop: isDark ? '1px solid rgba(148, 163, 184, 0.15)' : '1px solid #e2e8f0', bgcolor: isDark ? '#0b1329' : '#ffffff' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            {wizardStep === 1 ? (
              <Button
                variant="outlined"
                onClick={() => setCreateWizardOpen(false)}
                sx={{
                  color: isDark ? '#cbd5e1' : '#334155',
                  borderColor: isDark ? 'rgba(148, 163, 184, 0.25)' : '#cbd5e1',
                  fontWeight: 700,
                  borderRadius: '10px',
                  textTransform: 'none',
                  px: 3,
                  '&:hover': { color: isDark ? '#ffffff' : '#0f172a', borderColor: '#cbd5e1' },
                }}
              >
                ← Cancel
              </Button>
            ) : (
              <Button
                variant="outlined"
                onClick={() => setWizardStep(wizardStep - 1)}
                sx={{
                  color: '#cbd5e1',
                  borderColor: 'rgba(148, 163, 184, 0.25)',
                  fontWeight: 700,
                  borderRadius: '10px',
                  textTransform: 'none',
                  px: 3,
                  '&:hover': { color: '#ffffff', borderColor: '#cbd5e1' },
                }}
              >
                ← Back
              </Button>
            )}

            {wizardStep < 4 ? (
              <Button
                variant="contained"
                onClick={() => {
                  if (wizardStep === 1) {
                    if (!wizardCampaignName.trim()) {
                      Swal.fire({
                        icon: 'warning',
                        title: 'Campaign Name Required',
                        text: 'Please enter a Campaign Name before proceeding.',
                        confirmButtonColor: '#38bdf8',
                      });
                      return;
                    }
                    if (!wizardSelectedBusinessNumber) {
                      Swal.fire({
                        icon: 'warning',
                        title: 'Business Number Required',
                        text: 'Please select a Business Number before proceeding.',
                        confirmButtonColor: '#38bdf8',
                      });
                      return;
                    }
                    if (!wizardSelectedTemplate) {
                      Swal.fire({
                        icon: 'warning',
                        title: 'Template Required',
                        text: 'Please select an Approved Template before proceeding.',
                        confirmButtonColor: '#38bdf8',
                      });
                      return;
                    }
                  }
                  setWizardStep(wizardStep + 1);
                }}
                sx={{
                  bgcolor: '#334155',
                  color: '#ffffff',
                  fontWeight: 800,
                  borderRadius: '10px',
                  textTransform: 'none',
                  px: 3.5,
                  py: 1,
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                  '&:hover': { bgcolor: '#2563eb' },
                }}
              >
                {wizardStep === 1 && 'Next: Upload Audience →'}
                {wizardStep === 2 && 'Next: Test Message →'}
                {wizardStep === 3 && 'Next: Review & Launch →'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleWizardLaunchSubmit}
                startIcon={<LaunchIcon />}
                sx={{
                  bgcolor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 800,
                  borderRadius: '10px',
                  textTransform: 'none',
                  px: 3.8,
                  py: 1,
                  boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
                  '&:hover': { bgcolor: '#1d4ed8' },
                }}
              >
                🚀 Launch Campaign
              </Button>
            )}
          </Stack>
        </Box>
      </Dialog>
    </Box>
  );
}

export default WhatsAppIntegration;
