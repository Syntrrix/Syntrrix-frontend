import { getAccessToken } from './storage';

// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000/api/';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.app.syntrrix.com/api/';




export const extractBotMediaPath = (fileUrlOrPath) => {
  const raw = (fileUrlOrPath || '').toString().trim();
  if (!raw) return '';
  if (raw.startsWith('bot_uploads/') || raw.startsWith('bot_downloads/')) return raw;
  if (raw.startsWith('media/bot_uploads/') || raw.startsWith('media/bot_downloads/')) return raw.slice('media/'.length);
  const mediaIdx = raw.indexOf('/media/');
  if (mediaIdx >= 0) {
    return raw.slice(mediaIdx + '/media/'.length).split('?')[0];
  }
  return '';
};

/** @deprecated use extractBotMediaPath */
export const extractBotUploadPath = extractBotMediaPath;

export const buildAttachmentDownloadApiUrl = (message) => {
  const path =
    (message?.file_path || '').toString().trim()
    || extractBotMediaPath(message?.file_url);
  if (!path) return '';
  const fileName = encodeURIComponent((message?.file_name || 'download').toString());
  return `${API_BASE_URL}bots/media/download/?path=${encodeURIComponent(path)}&name=${fileName}`;
};

export const downloadChatAttachment = async (message) => {
  const url = buildAttachmentDownloadApiUrl(message);
  if (!url) {
    throw new Error('Download URL is missing for this attachment.');
  }

  const token = getAccessToken();
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { method: 'GET', headers });
  if (!response.ok) {
    throw new Error('Failed to download file.');
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const fileName = (message?.file_name || 'download').toString();

  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
