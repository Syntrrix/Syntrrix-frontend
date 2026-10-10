import apiClient from './client';

/**
 * Stock In - Add items to inventory
 * @param {Object} payload - Stock in data
 * @param {number} payload.product - Product ID (required)
 * @param {number} [payload.batch] - Batch ID (optional, updates batch quantity and expiry if provided)
 * @param {string} [payload.batch_name] - Batch name (optional, for reference tracking)
 * @param {number} payload.quantity - Quantity (required, must be > 0)
 * @param {string} [payload.reason] - Reason for stock in (optional, e.g., "Purchase", "Manual Adjustment")
 * @param {string} [payload.reference_id] - Reference ID (optional, e.g., invoice number)
 * @param {string} payload.date - Date in YYYY-MM-DD format (required)
 * @param {string} [payload.expiry_date] - Expiry date in YYYY-MM-DD format (optional, also updates batch expiry)
 * @param {string} [payload.manufacturing_date] - Manufacturing date in YYYY-MM-DD format (optional)
 * @param {string} [payload.category] - Category name (optional, updates product's category)
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string, transaction_id: number, data: {...} }
 */
export const stockIn = async (payload) => {
  const { data } = await apiClient.post('inventory/stock-in/', payload);
  return data;
};

/**
 * Stock Out - Remove items from inventory
 * @param {Object} payload - Stock out data
 * @param {number} payload.product - Product ID (required)
 * @param {number} [payload.batch] - Batch ID (optional)
 * @param {number} payload.quantity - Quantity (required, must be > 0)
 * @param {string} payload.reason - Reason for stock out (required, e.g., "Damaged", "Sold", "Manual Adjustment")
 * @param {string} [payload.reference_id] - Reference ID (optional)
 * @param {string} payload.date - Date in YYYY-MM-DD format (required)
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string, transaction_id: number, data: {...} }
 */
export const stockOut = async (payload) => {
  const { data } = await apiClient.post('inventory/stock-out/', payload);
  return data;
};

/**
 * Get inventory summary (current stock levels)
 * @param {Object} [options] - Query options
 * @param {number} [options.product_id] - Filter by product ID (optional)
 * @param {number} [options.seller_user] - Filter by seller user ID (optional)
 * @param {boolean} [options.batch_wise] - Return batch-wise breakdown (optional, default: false)
 * @returns {Promise<Object>} Response data with inventory summary
 * Response format: { success: true, count: number, data: [...] }
 * Each item contains: product_id, product_name, category, brand, unit, 
 * stock_in, stock_out, sold_to_customer, available_stock, minimum_stock_alert, is_low_stock
 * If batch_wise=true, also includes batches array with batch details
 * 
 * According to API documentation:
 * available_stock = stock_in - stock_out - sold_to_customer
 */
export const getInventorySummary = async (options = {}) => {
  const { product_id, seller_user, batch_wise } = options;
  let url = 'inventory/summary/';
  const params = new URLSearchParams();
  
  if (product_id) {
    params.append('product_id', product_id);
  }
  if (seller_user) {
    params.append('seller_user', seller_user);
  }
  if (batch_wise === true) {
    params.append('batch_wise', 'true');
  }
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const { data } = await apiClient.get(url);
  return data;
};

/**
 * Get inventory transactions (stock in/out history)
 * @param {Object} [options] - Query options
 * @param {number} [options.product_id] - Filter by product ID (optional)
 * @param {string} [options.transaction_type] - Filter by transaction type: 'in' or 'out' (optional)
 * @returns {Promise<Object>} Response data with transaction history
 * Response format: { success: true, count: number, data: [...] }
 * Each item contains transaction details including batch info, quantity, reason, date, etc.
 */
export const getInventoryTransactions = async (options = {}) => {
  const { product_id, transaction_type } = options;
  let url = 'inventory/transactions/';
  const params = new URLSearchParams();
  
  if (product_id) {
    params.append('product_id', product_id);
  }
  if (transaction_type) {
    params.append('transaction_type', transaction_type);
  }
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const { data } = await apiClient.get(url);
  return data;
};

