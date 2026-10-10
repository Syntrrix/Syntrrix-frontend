import apiClient from './client';

/**
 * Create a new supplier
 * @param {Object} payload - Supplier data
 * @param {string} payload.supplier_name - Supplier name (required)
 * @param {string} payload.email_id - Supplier email (required)
 * @param {string} payload.mobile_number - Mobile number (required)
 * @param {string} [payload.whatsapp_number] - WhatsApp number (optional)
 * @param {string} [payload.business_name] - Business name (optional)
 * @param {string} [payload.address] - Address (optional)
 * @param {string} [payload.gst_number] - GST number (optional)
 * @param {string} [payload.payment_type] - Payment type: 'cash', 'online', 'cheque', 'bank_transfer' (optional, default: 'online')
 * @param {number} [payload.seller_user] - Seller user ID (optional, will use authenticated user if not provided)
 * @returns {Promise<Object>} Response data
 */
export const createSupplier = async (payload) => {
  const { data } = await apiClient.post('suppliers/', payload);
  return data;
};

/**
 * Fetch all suppliers for the authenticated seller
 * @returns {Promise<Object>} Response data with suppliers array
 * Response format: { success: true, count: number, data: [...] }
 */
export const fetchSuppliers = async () => {
  const { data } = await apiClient.get('suppliers/');
  return data;
};

/**
 * Fetch a single supplier by ID
 * @param {number} supplierId - Supplier ID (required)
 * @returns {Promise<Object>} Response data with supplier object
 * Response format: { success: true, data: {...} }
 */
export const fetchSupplierById = async (supplierId) => {
  const { data } = await apiClient.get(`suppliers/?supplier_id=${supplierId}`);
  return data;
};

/**
 * Update a supplier
 * @param {number} supplierId - Supplier ID (required)
 * @param {Object} payload - Supplier data to update
 * @returns {Promise<Object>} Response data
 */
export const updateSupplier = async (supplierId, payload) => {
  const { data } = await apiClient.patch(`suppliers/?supplier_id=${supplierId}`, payload);
  return data;
};

