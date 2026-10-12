import apiClient from './client';

// Seller: fetch (and create on-demand) the live chat session for a bot-captured customer.
export const fetchSellerLiveChatSession = async (customerId) => {
  const { data } = await apiClient.get(`live-chat/sessions/?customer_id=${customerId}`);
  return data;
};

// Seller: inbox list of sessions (1 row per customer)
export const fetchSellerLiveChatSupportSessions = async (opts = {}) => {
  const path = opts.forLeadPipeline
    ? 'live-chat/support/sessions/?for_lead_pipeline=1'
    : 'live-chat/support/sessions/';
  const { data } = await apiClient.get(path);
  return data;
};

/** Lead Pipeline "Add Lead" — creates visitor session; excluded from default inbox list. */
export const createManualPipelineLead = async (payload) => {
  const { data } = await apiClient.post('live-chat/support/sessions/', payload);
  return data;
};

/** PATCH support session: status and/or assignment (seller / team manager). */
export const patchLiveChatSupportSession = async (sessionId, body) => {
  const { data } = await apiClient.patch(
    `live-chat/support/sessions/?session_id=${encodeURIComponent(sessionId)}`,
    body,
  );
  return data;
};

/** Persist pipeline tab status; visible to seller + assigned team manager / agent */
export const patchLiveChatLeadPipelineStatus = async (sessionId, leadPipelineStatus) => {
  return patchLiveChatSupportSession(sessionId, { lead_pipeline_status: leadPipelineStatus });
};

/** Remove session from pipeline (Lead Pipeline delete). */
export const deleteLiveChatSupportSession = async (sessionId) => {
  const { data } = await apiClient.delete(
    `live-chat/support/sessions/?session_id=${encodeURIComponent(sessionId)}`,
  );
  return data;
};

// Seller: fetch messages for a session
export const fetchSellerLiveChatMessages = async (sessionId, limit = 50) => {
  const { data } = await apiClient.get(`live-chat/messages/?session_id=${sessionId}&limit=${limit}`);
  return data;
};

// Seller: send a message (text and/or file attachment) to a session
export const sendSellerLiveChatMessage = async (sessionId, message, file = null) => {
  if (file) {
    const formData = new FormData();
    if (message) formData.append('message', message);
    formData.append('file', file);
    const { data } = await apiClient.post(`live-chat/messages/?session_id=${sessionId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  }
  const { data } = await apiClient.post(`live-chat/messages/?session_id=${sessionId}`, { message });
  return data;
};

// Customer (bot widget): fetch messages using the public token
export const fetchPublicLiveChatMessages = async (token, limit = 50) => {
  const { data } = await apiClient.get(`live-chat/public/messages/?token=${token}&limit=${limit}`);
  return data;
};

// Customer (bot widget): send a message using the public token
export const sendPublicLiveChatMessage = async (token, message) => {
  const { data } = await apiClient.post(`live-chat/public/messages/?token=${token}`, { message });
  return data;
};

// Customer (bot widget): create visitor-based session (without Customer table insert)
export const createPublicLiveChatSession = async (botId, payload) => {
  const { data } = await apiClient.post(`live-chat/public/session/?bot_id=${botId}`, payload);
  return data;
};

/** Replace bot flow transcript on an existing public session (includes media attachments). */
export const syncPublicLiveChatTranscript = async (token, flowMessages) => {
  const { data } = await apiClient.post(
    `live-chat/public/transcript/?token=${encodeURIComponent(token)}`,
    { flow_messages: flowMessages },
  );
  return data;
};

