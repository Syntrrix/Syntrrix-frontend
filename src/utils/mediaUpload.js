const FORMAT_ACCEPT = {
  image: 'image/*',
  video: 'video/*',
  pdf: '.pdf,application/pdf',
  document: '.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation',
  audio: 'audio/*',
  text: '.txt,text/plain',
};

const FORMAT_MIME_CHECKS = {
  image: (mime) => mime.startsWith('image/'),
  video: (mime) => mime.startsWith('video/'),
  pdf: (mime, name) => mime === 'application/pdf' || name.endsWith('.pdf'),
  document: (mime, name) =>
    mime === 'application/pdf'
    || mime.includes('msword')
    || mime.includes('officedocument')
    || mime.includes('ms-excel')
    || mime.includes('ms-powerpoint')
    || /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(name),
  audio: (mime) => mime.startsWith('audio/'),
  text: (mime, name) => mime.startsWith('text/') || name.endsWith('.txt'),
};

export const DEFAULT_MEDIA_FORMAT_TYPES = {
  image: true,
  video: true,
  pdf: true,
};

export const buildMediaAcceptString = (formatTypes = DEFAULT_MEDIA_FORMAT_TYPES) => {
  const parts = [];
  Object.entries(formatTypes || {}).forEach(([key, enabled]) => {
    if (!enabled) return;
    const accept = FORMAT_ACCEPT[key];
    if (accept) parts.push(accept);
  });
  return parts.join(',') || 'image/*,video/*,.pdf,application/pdf';
};

export const detectAttachmentType = (mimeType, fileName) => {
  const mime = (mimeType || '').toLowerCase();
  const name = (fileName || '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('text/') || name.endsWith('.txt')) return 'text';
  return 'document';
};

export const validateMediaFile = (file, formatTypes = DEFAULT_MEDIA_FORMAT_TYPES, opts = {}) => {
  if (!file) return 'Please choose a file to upload.';
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const enabledKeys = Object.entries(formatTypes || {}).filter(([, v]) => v).map(([k]) => k);
  if (!enabledKeys.length) return 'No file types are enabled for this step.';

  const allowed = enabledKeys.some((key) => {
    const check = FORMAT_MIME_CHECKS[key];
    return check ? check(mime, name) : false;
  });
  if (!allowed) return (opts.errorMessage || 'File type is not allowed.').toString();

  const videoMaxMb = Number(opts.maxVideoSizeMb || 10);
  const isVideo = mime.startsWith('video/') || detectAttachmentType(mime, name) === 'video';
  if (isVideo && file.size > videoMaxMb * 1024 * 1024) {
    return `Video must be ${videoMaxMb} MB or smaller.`;
  }

  const otherMaxMb = Number(opts.maxOtherSizeMb || 15);
  if (!isVideo && file.size > otherMaxMb * 1024 * 1024) {
    return `File must be ${otherMaxMb} MB or smaller.`;
  }

  return '';
};
