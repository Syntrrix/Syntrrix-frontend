import apiClient from './client';

/**
 * Create a new product
 * @param {Object} payload - Product data
 * @param {string} payload.product_name - Product name (required)
 * @param {number} payload.seller_user - Seller User ID (required)
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string, product_id: number, data: {...} }
 */
export const createProduct = async (payload) => {
  const { data } = await apiClient.post('products/', payload);
  return data;
};

/**
 * Fetch all products
 * @param {number} [sellerUserId] - Seller User ID (optional, if provided filters products by seller)
 * @returns {Promise<Object>} Response data with products array
 * Response format: { success: true, count: number, data: [...] }
 */
export const fetchProducts = async (sellerUserId = null) => {
  let url = 'products/';
  if (sellerUserId) {
    url += `?seller_user=${sellerUserId}`;
  }
  const { data } = await apiClient.get(url);
  return data;
};

/**
 * Fetch product details by ID
 * @param {number} productId - Product ID (required)
 * @returns {Promise<Object>} Response data with product details
 * Response format: { success: true, data: { product_id, product_name, purchase_price, sale_price, gst, mrp, barcode, unit } }
 */
export const fetchProductDetail = async (productId) => {
  const { data } = await apiClient.get(`products/detail/?product_id=${productId}`);
  return data;
};

/**
 * Fetch products for the logged-in seller
 * @returns {Promise<Object>} Response data with products array (filtered by logged-in seller)
 * Response format: { success: true, count: number, data: [...] }
 */
export const fetchSellerProducts = async () => {
  const { data } = await apiClient.get('seller/products/');
  return data;
};

/**
 * Update an existing product
 * @param {Object} payload - Product data to update
 * @param {number} payload.product_id - Product ID (required)
 * @param {string} [payload.product_name] - Product name (optional)
 * @param {string} [payload.category] - Category (optional)
 * @param {string} [payload.brand] - Brand (optional)
 * @param {string} [payload.unit] - Unit (optional)
 * @param {number} [payload.purchase_price] - Purchase price (optional)
 * @param {number} [payload.sale_price] - Selling price (optional)
 * @param {number} [payload.mrp] - MRP (optional)
 * @param {number} [payload.gst] - GST percentage (optional)
 * @param {number} [payload.minimum_stock_alert] - Minimum stock alert (optional)
 * @param {string} [payload.description] - Description (optional)
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string, data: {...} }
 */
export const updateProduct = async (payload) => {
  const { data } = await apiClient.patch('products/', payload);
  return data;
};

