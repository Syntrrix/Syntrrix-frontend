import apiClient from './client';

export const fetchWhatsAppConfig = async () => {
  const { data } = await apiClient.get('whatsapp/config/');
  return data;
};

export const saveWhatsAppConfig = async (payload) => {
  const { data } = await apiClient.post('whatsapp/config/', payload);
  return data;
};

export const disconnectWhatsApp = async (configId = null) => {
  const { data } = await apiClient.post('whatsapp/disconnect/', { config_id: configId });
  return data;
};

export const testWhatsAppConnection = async (testNumber, useTemplate = false, templateName = 'hello_world', languageCode = 'en_US', configId = null) => {
  const { data } = await apiClient.post('whatsapp/test/', {
    test_number: testNumber,
    use_template: useTemplate,
    template_name: templateName,
    language_code: languageCode,
    config_id: configId,
  });
  return data;
};

export const sendBulkWhatsAppTemplate = async (payload) => {
  const { data } = await apiClient.post('whatsapp/bulk-template/', payload);
  return data;
};

export const fetchWhatsAppTemplates = async (configId = null) => {
  const params = configId ? `?config_id=${configId}` : '';
  const { data } = await apiClient.get(`whatsapp/templates/${params}`);
  return data;
};

export const createWhatsAppTemplate = async (payload) => {
  const { data } = await apiClient.post('whatsapp/templates/', payload);
  return data;
};

export const syncWhatsAppTemplates = async (configId = null) => {
  const { data } = await apiClient.post('whatsapp/templates/sync/', { config_id: configId });
  return data;
};

export const fetchWhatsAppCampaigns = async () => {
  const { data } = await apiClient.get('whatsapp/campaigns/');
  return data;
};

export const createWhatsAppCampaign = async (payload) => {
  const { data } = await apiClient.post('whatsapp/campaigns/', payload);
  return data;
};

export const fetchCampaignRecipients = async (campaignId) => {
  const { data } = await apiClient.get(`whatsapp/campaigns/recipients/?campaign_id=${campaignId}`);
  return data;
};
