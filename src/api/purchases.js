import apiClient from './client';

/**
 * Create a new purchase record (seller only)
 * @param {Object} payload - Purchase data
 * @param {number} payload.supplier - Supplier ID (required)
 * @param {string} payload.invoice_number - Invoice number (required)
 * @param {string} payload.invoice_date - Invoice date in YYYY-MM-DD format (required)
 * @param {File|string} [payload.invoice_file] - Invoice file (File) or path (optional)
 * @param {Array} payload.items - Array of purchase items (required)
 * @param {number} [payload.items[].product] - Product ID (required if product_name not provided)
 * @param {string} [payload.items[].product_name] - Product name (required if product not provided, will auto-create product)
 * @param {string} payload.items[].batch_name - Batch name (required)
 * @param {number} payload.items[].purchase_price - Purchase price (required, must be > 0)
 * @param {number} payload.items[].selling_price - Selling price (required, must be > 0)
 * @param {number} [payload.items[].mrp] - Maximum retail price (optional)
 * @param {number} payload.items[].quantity - Quantity (required, must be > 0)
 * @param {number} payload.items[].gst - GST percentage (required)
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string, product_purchase_id: number, data: {...} }
 */
export const createPurchase = async (payload) => {
  // If invoice_file is a File or Blob, send multipart/form-data
  const hasFile =
    payload &&
    Object.prototype.hasOwnProperty.call(payload, 'invoice_file') &&
    payload.invoice_file instanceof File;

  if (hasFile) {
    const formData = new FormData();
    formData.append('supplier', payload.supplier);
    formData.append('invoice_number', payload.invoice_number);
    formData.append('invoice_date', payload.invoice_date);
    formData.append('invoice_file', payload.invoice_file); // File object

    // Backend accepts items as JSON string when multipart
    formData.append('items', JSON.stringify(payload.items || []));

    const { data } = await apiClient.post('purchases/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  // Fallback: JSON payload (no file)
  const { data } = await apiClient.post('purchases/', payload);
  return data;
};

/**
 * Fetch purchase history
 * @param {number} [supplierId] - Supplier ID (optional, if not provided returns all purchases)
 * @returns {Promise<Object>} Response data with purchases array
 * Response format: { success: true, count: number, data: [...] } or { success: true, supplier_id: number, supplier_name: string, count: number, data: [...] }
 */
export const fetchPurchaseHistory = async (supplierId = null) => {
  let url = 'purchases/';
  if (supplierId) {
    url += `?supplier_id=${supplierId}`;
  }
  const { data } = await apiClient.get(url);
  return data;
};

/**
 * Update a purchase item (Batch/Quantity)
 * @param {Object} payload - Purchase item update data
 * @param {number} payload.item_id - Purchase item ID (required)
 * @param {number} [payload.batch_id] - New batch ID (optional)
 * @param {number} [payload.quantity] - New quantity (optional)
 * @param {number} [payload.purchase_price] - Updated purchase price (optional)
 * @param {number} [payload.selling_price] - Updated selling price (optional)
 * @param {number} [payload.mrp] - Updated MRP (optional)
 * @param {number} [payload.gst] - Updated GST (optional)
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string, data: {...} }
 */
export const updatePurchaseItem = async (payload) => {
  const { data } = await apiClient.patch('purchases/', payload);
  return data;
};

