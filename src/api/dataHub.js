import apiClient from './client';

export const fetchDataHubTables = async () => {
  const { data } = await apiClient.get('data-hub/tables/');
  return data;
};

export const createDataHubTable = async (payload) => {
  const { data } = await apiClient.post('data-hub/tables/', payload);
  return data;
};

export const updateDataHubTable = async (payload) => {
  const { data } = await apiClient.put('data-hub/tables/', payload);
  return data;
};

export const deleteDataHubTable = async (tableId) => {
  const { data } = await apiClient.delete(`data-hub/tables/?table_id=${encodeURIComponent(tableId)}`);
  return data;
};

export const fetchDataHubRows = async (tableId) => {
  const { data } = await apiClient.get(`data-hub/rows/?table_id=${encodeURIComponent(tableId)}`);
  return data;
};

export const insertDataHubRow = async (tableId, row) => {
  const { data } = await apiClient.post('data-hub/rows/', { table_id: tableId, row });
  return data;
};

// Public endpoint used by bot widget execution (no auth required)
export const publicExecuteDataHubOp = async ({ botId, tableId, operation, row, rowId, patch, filters }) => {
  const { data } = await apiClient.post('data-hub/public/rows/', {
    bot_id: botId,
    table_id: tableId,
    operation,
    row,
    row_id: rowId,
    patch,
    filters,
  });
  return data;
};

export const updateDataHubRow = async (tableId, rowId, patch) => {
  const { data } = await apiClient.put('data-hub/row/', { table_id: tableId, row_id: rowId, patch });
  return data;
};

export const deleteDataHubRow = async (tableId, rowId) => {
  const { data } = await apiClient.delete(`data-hub/row/?table_id=${encodeURIComponent(tableId)}&row_id=${encodeURIComponent(rowId)}`);
  return data;
};

