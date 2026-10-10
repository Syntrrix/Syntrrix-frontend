import apiClient from './client';

/**
 * Fetch all plans (Admin or authenticated user)
 * @returns {Promise<Object>} Response data
 */
export const fetchPlans = async () => {
  const { data } = await apiClient.get('plans/');
  return data;
};

/**
 * Create a new plan (Admin only)
 * @param {Object} payload
 * @param {string} payload.name - Plan Name
 * @param {Array<string>} payload.features - List of enabled feature names
 * @param {string} [payload.description] - Plan description
 * @returns {Promise<Object>} Response data
 */
export const createPlan = async (payload) => {
  const { data } = await apiClient.post('plans/', payload);
  return data;
};

/**
 * Update an existing plan (Admin only)
 * @param {number} planId
 * @param {Object} payload
 * @returns {Promise<Object>} Response data
 */
export const updatePlan = async (planId, payload) => {
  const { data } = await apiClient.patch(`plans/${planId}/`, payload);
  return data;
};

/**
 * Delete a plan (Admin only)
 * @param {number} planId
 * @returns {Promise<Object>} Response data
 */
export const deletePlan = async (planId) => {
  const { data } = await apiClient.delete(`plans/${planId}/`);
  return data;
};
