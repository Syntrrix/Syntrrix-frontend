import apiClient from './client';

/**
 * Fetch batches for a given product.
 * @param {number|string} productId - Product ID (required)
 * @returns {Promise<Object>} { success, count, data: [{ batch_name, quantity }] }
 */
export const fetchBatchesByProduct = async (productId) => {
  const { data } = await apiClient.get(`batches/?product_id=${productId}`);
  return data;
};

/**
 * Create a new batch (admin only)
 * @param {Object} payload - Batch data
 * @param {string} payload.batch_name - Batch name (required)
 * @param {number} payload.product - Product ID (required)
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string, batch_id: number, data: {...} }
 */
export const createBatch = async (payload) => {
  const { data } = await apiClient.post('batches/', payload);
  return data;
};

/**
 * Fetch all batches
 * @returns {Promise<Object>} Response data with batches array
 * Response format: { success: true, count: number, data: [...] }
 */
export const fetchBatches = async () => {
  const { data } = await apiClient.get('batches/');
  return data;
};

/**
 * Update an existing batch
 * @param {number} batchId - Batch ID (required)
 * @param {Object} payload - Batch data to update
 * @param {string} [payload.batch_name] - Batch name (optional)
 * @param {string} [payload.expiry_date] - Expiry date YYYY-MM-DD (optional)
 * @param {string} [payload.manufacturing_date] - Manufacturing date YYYY-MM-DD (optional)
 * @param {number} [payload.purchase_price] - Purchase price (optional)
 * @param {number} [payload.selling_price] - Selling price (optional)
 * @param {number} [payload.mrp] - MRP (optional)
 * @param {number} [payload.available_quantity] - Available quantity (optional)
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string, data: {...} }
 */
export const updateBatch = async (batchId, payload) => {
  const { data } = await apiClient.patch(`batches/?batch_id=${batchId}`, payload);
  return data;
};

/**
 * Fetch all batches that have been stocked in for Stock Out operations for a given product.
 * This API is specifically designed for Stock Out modal.
 * Returns all batches with available_quantity > 0, including batch_name, available_quantity, and expiry_date.
 * Returns batches regardless of expiry status (expired and non-expired batches).
 * @param {number|string} productId - Product ID (required)
 * @returns {Promise<Object>} { success, count, data: [{ batch_id, batch_name, available_quantity, expiry_date }] }
 */
export const fetchStockOutBatches = async (productId) => {
  const { data } = await apiClient.get(`batches/stock-out/?product_id=${productId}`);
  return data;
};

/**
 * Fetch available batches for a product for cart selection.
 * Returns active, non-expired batches with available quantity, ordered by nearest expiry (FIFO).
 * This API is specifically designed for cart operations.
 * @param {number|string} productId - Product ID (required)
 * @param {number} [minQuantity] - Minimum available quantity (optional, default: 1)
 * @returns {Promise<Object>} { success, product_id, product_name, count, data: [{ batch_id, batch_name, available_quantity, selling_price, mrp, expiry_date, days_until_expiry }] }
 */
export const fetchProductBatchesForCart = async (productId, minQuantity = 1) => {
  const url = `products/batches/?product_id=${productId}${minQuantity ? `&min_quantity=${minQuantity}` : ''}`;
  const { data } = await apiClient.get(url);
  return data;
};

