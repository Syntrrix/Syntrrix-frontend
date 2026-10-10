import apiClient from './client';

/**
 * Create a new buyer (admin only)
 * @param {Object} payload - Buyer registration data
 * @param {string} payload.full_name - Full name (required)
 * @param {string} payload.email - Email (required)
 * @param {string} payload.phone - Phone number (required)
 * @param {string} payload.password - Password (required)
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string, user_id: number }
 */
export const createBuyer = async (payload) => {
  const { data } = await apiClient.post('buyers/', payload);
  return data;
};

/**
 * Fetch all buyers (admin only)
 * @returns {Promise<Object>} Response data with buyers array
 * Response format: { success: true, count: number, data: [...] }
 */
export const fetchBuyers = async () => {
  const { data } = await apiClient.get('buyers/');
  return data;
};



