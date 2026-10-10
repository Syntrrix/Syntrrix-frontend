import apiClient from './client';

/**
 * Fetch supplier outstanding amounts
 * @param {number} [supplierId] - Supplier ID (optional, if not provided returns all suppliers)
 * @returns {Promise<Object>} Response data with outstanding information
 * Response format: { success: true, count: number, data: [...] }
 * Each item contains: supplier_id, supplier_name, total_amount, paid_amount, outstanding
 */
export const fetchSupplierOutstanding = async (supplierId = null) => {
  let url = 'outstanding/';
  if (supplierId) {
    url += `?supplier_id=${supplierId}`;
  }
  const { data } = await apiClient.get(url);
  return data;
};

/**
 * Fetch customer outstanding amounts
 * @param {number} [customerId] - Customer ID (optional, if not provided returns all customers)
 * @returns {Promise<Object>} Response data with outstanding information
 * Response format: { success: true, count: number, data: [...] }
 * Each item contains: customer_id, customer_name, total_amount, paid_amount, outstanding
 */
export const fetchCustomerOutstanding = async (customerId = null) => {
  let url = 'customer/outstanding/';
  if (customerId) {
    url += `?customer_id=${customerId}`;
  }
  const { data } = await apiClient.get(url);
  return data;
};

