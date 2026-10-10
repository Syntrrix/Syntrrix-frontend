import apiClient from './client';

/**
 * Fetch all categories for the logged-in seller
 * @returns {Promise<Object>} Response data with categories array
 * Response format: { success: true, count: number, data: [...] }
 */
export const fetchCategories = async () => {
  const { data } = await apiClient.get('categories/');
  return data;
};

/**
 * Create a new category
 * @param {Object} payload - Category data
 * @param {string} payload.category_name - Category name (required)
 * @param {string} [payload.description] - Category description (optional)
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string, category_id: number, data: {...} }
 */
export const createCategory = async (payload) => {
  const { data } = await apiClient.post('categories/', payload);
  return data;
};

/**
 * Update an existing category
 * @param {number} categoryId - Category ID (required)
 * @param {Object} payload - Category data to update
 * @param {string} [payload.category_name] - Category name (optional)
 * @param {string} [payload.description] - Category description (optional)
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string, data: {...} }
 */
export const updateCategory = async (categoryId, payload) => {
  const { data } = await apiClient.patch(`categories/?category_id=${categoryId}`, payload);
  return data;
};

/**
 * Delete a category
 * @param {number} categoryId - Category ID (required)
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string }
 */
export const deleteCategory = async (categoryId) => {
  const { data } = await apiClient.delete(`categories/?category_id=${categoryId}`);
  return data;
};

/**
 * Get a specific category by ID
 * @param {number} categoryId - Category ID (required)
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, data: {...} }
 */
export const getCategoryById = async (categoryId) => {
  const { data } = await apiClient.get(`categories/?category_id=${categoryId}`);
  return data;
};

