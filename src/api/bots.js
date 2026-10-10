import apiClient from './client';

/** Full bot detail (flow + design) can be multi‑MB; QA/prod links need a long read timeout. */
const BOT_DETAIL_TIMEOUT_MS = 180000;
const BOT_WRITE_TIMEOUT_MS = 180000;

export const fetchBots = async (botId = null) => {
  const url = botId ? `bots/?bot_id=${encodeURIComponent(botId)}` : 'bots/';
  const opts = botId ? { timeout: BOT_DETAIL_TIMEOUT_MS } : {};
  const { data } = await apiClient.get(url, opts);
  return data;
};

export const createBot = async (payload) => {
  const { data } = await apiClient.post('bots/', payload, { timeout: BOT_WRITE_TIMEOUT_MS });
  return data;
};

export const updateBot = async (botId, payload) => {
  const { data } = await apiClient.put(`bots/?bot_id=${botId}`, payload, { timeout: BOT_WRITE_TIMEOUT_MS });
  return data;
};

export const publishBot = async (botId) => {
  const { data } = await apiClient.post(`bots/publish/?bot_id=${botId}`);
  return data;
};

export const unpublishBot = async (botId) => {
  const { data } = await apiClient.post(`bots/unpublish/?bot_id=${botId}`);
  return data;
};

export const fetchPublishedBot = async (botId) => {
  const { data } = await apiClient.get(`bots/public/?bot_id=${botId}`, { timeout: BOT_DETAIL_TIMEOUT_MS });
  return data;
};

// Public: submit a bot-captured entry (no auth token required)
export const submitBotEntry = async (botId, payload) => {
  const { data } = await apiClient.post(`bots/entry/?bot_id=${botId}`, payload);
  return data;
};

/** Public: upload media from bot widget (image / video / pdf). */
export const uploadBotMedia = async (botId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post(`bots/public/upload/?bot_id=${encodeURIComponent(botId)}`, formData, {
    timeout: 120000,
  });
  return data;
};

/** Seller bot builder: upload media for Media Download component. */
export const uploadBotBuilderMedia = async (botId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post(`bots/media/upload/?bot_id=${encodeURIComponent(botId)}`, formData, {
    timeout: 120000,
  });
  return data;
};


