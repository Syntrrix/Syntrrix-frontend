import apiClient from './client';

/**
 * Create a new seller (admin only)
 * @param {Object} payload - Seller registration data
 * @param {string} payload.full_name - Full name (required)
 * @param {string} payload.email - Email (required)
 * @param {string} payload.phone - Phone number (required)
 * @param {string} payload.password - Password (required)
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string, user_id: number }
 */
export const createSeller = async (payload) => {
  const { data } = await apiClient.post('sellers/', payload);
  return data;
};

/**
 * Fetch all sellers (admin only)
 * @returns {Promise<Object>} Response data with sellers array
 * Response format: { success: true, count: number, data: [...] }
 */
export const fetchSellers = async () => {
  const { data } = await apiClient.get('sellers/');
  return data;
};

/**
 * Update seller status (admin only)
 * @param {number} userId - User ID of the seller
 * @param {string} status - New status ('active', 'inactive', or 'pending')
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string }
 */
export const updateSellerStatus = async (userId, status) => {
  const { data } = await apiClient.patch(`sellers/?user_id=${userId}`, { status });
  return data;
};

/**
 * Update seller's own profile (authenticated seller only)
 * @param {Object} payload - Profile data to update
 * @param {string} [payload.full_name] - Full name (optional)
 * @param {string} [payload.phone] - Phone number (optional)
 * @param {string} [payload.company_name] - Company name (optional)
 * @param {string} [payload.gst_number] - GST number (optional)
 * @param {string} [payload.address] - Address (optional)
 * @param {string} [payload.pan_number] - PAN number (optional)
 * @param {string} [payload.account_holder_name] - Account holder name (optional)
 * @param {string} [payload.account_number] - Account number (optional)
 * @param {string} [payload.ifsc_code] - IFSC code (optional)
 * @param {string} [payload.bank_name] - Bank name (optional)
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string, data: {...} }
 */
export const updateSellerProfile = async (payload) => {
  const { data } = await apiClient.put('sellers/', payload);
  return data;
};

/**
 * Assign a plan to a seller (admin only)
 * @param {number} userId - User ID of the seller
 * @param {number|null} planId - Plan ID to assign (or null to remove)
 * @returns {Promise<Object>} Response data
 */
export const assignSellerPlan = async (userId, planId) => {
  const { data } = await apiClient.patch(`sellers/?user_id=${userId}`, { plan_id: planId });
  return data;
};

/**
 * Update seller's WhatsApp App ID (admin only)
 * @param {number} userId - User ID of the seller
 * @param {string} appId - Meta App ID
 * @returns {Promise<Object>} Response data
 */
export const updateSellerAppId = async (userId, appId, configId = null) => {
  const payload = { app_id: appId };
  if (configId) payload.config_id = configId;
  const { data } = await apiClient.patch(`sellers/?user_id=${userId}`, payload);
  return data;
};



