import { useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { downloadChatAttachment } from '../utils/attachmentDownload';

// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000/api/';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.app.syntrrix.com/api/';

export const resolveMediaUrl = (url) => {
  const raw = (url || '').toString().trim();
  if (!raw) return '';
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${raw.startsWith('/') ? raw : `/${raw}`}`;
};

const isImageAttachment = (m) => {
  const type = (m?.attachment_type || '').toString().toLowerCase();
  const mime = (m?.mime_type || '').toString().toLowerCase();
  return type === 'image' || mime.startsWith('image/');
};

const isVideoAttachment = (m) => {
  const type = (m?.attachment_type || '').toString().toLowerCase();
  const mime = (m?.mime_type || '').toString().toLowerCase();
  return type === 'video' || mime.startsWith('video/');
};

export default function LiveChatAttachment({ message, textColor = '#e5e7eb', primaryColor = '#0ea5e9' }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const fileUrl = resolveMediaUrl(message?.file_url);
  const fileName = (message?.file_name || 'download').toString();
  const caption = (message?.message || '').toString().trim();

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadChatAttachment(message);
    } catch (e) {
      setDownloadError(e?.message || 'Download failed.');
    } finally {
      setDownloading(false);
    }
  };

  if (!fileUrl) {
    return caption || null;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {caption ? (
        <Typography sx={{ color: textColor, fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
          {caption}
        </Typography>
      ) : null}

      {isImageAttachment(message) ? (
        <Box
          component="img"
          src={fileUrl}
          alt={fileName}
          sx={{ maxWidth: '100%', height: 'auto', borderRadius: 1.5, border: '1px solid rgba(148,163,184,0.25)' }}
        />
      ) : isVideoAttachment(message) ? (
        <Box
          component="video"
          src={fileUrl}
          controls
          sx={{ maxWidth: '100%', borderRadius: 1.5, border: '1px solid rgba(148,163,184,0.25)' }}
        />
      ) : (
        <Typography sx={{ color: textColor, fontSize: 13, fontWeight: 600 }}>{fileName}</Typography>
      )}

      <Button
        variant="contained"
        size="small"
        disabled={downloading}
        onClick={() => void handleDownload()}
        startIcon={downloading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <DownloadIcon fontSize="small" />}
        sx={{
          alignSelf: 'flex-start',
          textTransform: 'none',
          fontWeight: 700,
          backgroundColor: primaryColor,
          '&:hover': { backgroundColor: primaryColor, filter: 'brightness(0.92)' },
        }}
      >
        {downloading ? 'Downloading...' : 'Download'}
      </Button>

      {downloadError ? (
        <Typography sx={{ color: '#fca5a5', fontSize: 11 }}>{downloadError}</Typography>
      ) : null}
    </Box>
  );
}
