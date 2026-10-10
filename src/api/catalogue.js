import apiClient from './client';

export const fetchPublicBotProducts = async (botId) => {
  const { data } = await apiClient.get(`products/public/?bot_id=${encodeURIComponent(botId)}`);
  return data;
};

export const fetchSellerOnlineOrders = async () => {
  const { data } = await apiClient.get('catalogue/orders/');
  return data;
};

export const approveCatalogueOrder = async ({ tableId, rowId, note }) => {
  const body = { table_id: tableId, row_id: rowId };
  if (note != null && String(note).trim() !== '') body.note = String(note).trim();
  const { data } = await apiClient.post('catalogue/orders/approve/', body);
  return data;
};

export const rejectCatalogueOrder = async ({ tableId, rowId, note }) => {
  const body = { table_id: tableId, row_id: rowId };
  if (note != null && String(note).trim() !== '') body.note = String(note).trim();
  const { data } = await apiClient.post('catalogue/orders/reject/', body);
  return data;
};

