import apiClient from './client';

/**
 * Fetch all customers for the authenticated seller
 * @returns {Promise<Object>} Response data with customers array
 * Response format: { success: true, count: number, data: [...] }
 */
export const fetchCustomers = async () => {
  const { data } = await apiClient.get('seller/customers/');
  return data;
};

/**
 * Fetch customers created via bot ("Online Entry")
 * @returns {Promise<Object>} Response data with customers array
 */
export const fetchBotCustomers = async () => {
  const { data } = await apiClient.get('seller/customers/?created_via_bot=1');
  return data;
};

/**
 * Create a new customer for the authenticated seller
 * @param {Object} payload - Customer data
 * @param {string} payload.full_name - Full name (required)
 * @param {string} payload.email - Email (required)
 * @param {string} payload.mobile_number - Mobile number (required)
 * @param {string} [payload.whatsapp_number] - WhatsApp number (optional)
 * @param {string} [payload.address] - Address (optional)
 * @param {string} [payload.gst_number] - GST number (optional)
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string, data: {...} }
 */
export const createCustomer = async (payload) => {
  const { data } = await apiClient.post('seller/customers/', payload);
  return data;
};

/**
 * Update an existing customer
 * @param {number} customerId - Customer ID (required)
 * @param {Object} payload - Customer data to update
 * @param {string} [payload.full_name] - Full name (optional)
 * @param {string} [payload.email] - Email (optional)
 * @param {string} [payload.mobile_number] - Mobile number (optional)
 * @param {string} [payload.whatsapp_number] - WhatsApp number (optional)
 * @param {string} [payload.address] - Address (optional)
 * @param {string} [payload.gst_number] - GST number (optional)
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string, data: {...} }
 */
export const updateCustomer = async (customerId, payload) => {
  const { data } = await apiClient.patch(`seller/customers/?customer_id=${customerId}`, payload);
  return data;
};

/**
 * Fetch customer purchase history
 * @param {number} customerId - Customer ID (optional, if not provided returns all)
 * @returns {Promise<Object>} Response data with purchases array
 * Response format: { success: true, count: number, data: [...] }
 */
export const fetchCustomerPurchaseHistory = async (customerId = null) => {
  let url = 'purchases/customer/';
  if (customerId) {
    url += `?customer_id=${customerId}`;
  }
  const { data } = await apiClient.get(url);
  return data;
};

/**
 * Delete a single product line from a customer purchase invoice.
 * This will:
 * - Remove the line item from the invoice
 * - Restore the batch quantity back to inventory
 * - Reduce the invoice total amount (and thus the customer's outstanding)
 *
 * @param {Object} payload
 * @param {number} payload.purchase_id - Customer purchase ID
 * @param {number} payload.item_id - Line item ID to delete
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string, data: {...updated purchase...} }
 */
export const deleteCustomerPurchaseItem = async (payload) => {
  const { data } = await apiClient.delete('purchases/customer/', { data: payload });
  return data;
};

/**
 * Place an order from cart items
 * @param {Object} payload - Order data
 * @param {number} payload.customer_id - Customer ID (required)
 * @returns {Promise<Object>} Response data with purchase details
 * Response format: { success: true, message: string, data: {...} }
 */
export const placeCustomerOrder = async (payload) => {
  const { data } = await apiClient.post('purchases/customer/', payload);
  return data;
};

/**
 * Get seller's products with stock information
 * @returns {Promise<Object>} Response data with products array including stock
 * Response format: { success: true, count: number, data: [...] }
 */
export const fetchSellerProducts = async () => {
  const { data } = await apiClient.get('seller/products/');
  return data;
};

/**
 * Get cart items for a customer
 * @param {number} customerId - Customer ID (required)
 * @returns {Promise<Object>} Response data with cart items
 * Response format: { success: true, count: number, data: [...] }
 */
export const fetchCustomerCart = async (customerId) => {
  const { data } = await apiClient.get(`cart/?customer_id=${customerId}`);
  return data;
};

/**
 * Add product to cart
 * @param {Object} payload - Cart item data
 * @param {number} payload.customer - Customer ID (required)
 * @param {number} payload.product - Product ID (required)
 * @param {number} payload.quantity - Quantity (required)
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string, data: {...} }
 */
export const addToCart = async (payload) => {
  const { data } = await apiClient.post('cart/', payload);
  return data;
};

/**
 * Update cart item quantity
 * @param {Object} payload - Update data
 * @param {number} payload.cart_id - Cart item ID (required)
 * @param {number} payload.quantity - New quantity (required)
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string, data: {...} }
 */
export const updateCartItem = async (payload) => {
  const { data } = await apiClient.patch('cart/', payload);
  return data;
};

/**
 * Remove item from cart
 * @param {number} cartId - Cart item ID (required)
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string }
 */
export const removeFromCart = async (cartId) => {
  const { data } = await apiClient.delete('cart/', { data: { cart_id: cartId } });
  return data;
};

/**
 * Get invoice details
 * @param {number|string} purchaseId - Purchase ID (optional)
 * @param {string} invoiceNumber - Invoice number (optional)
 * @returns {Promise<Object>} Response data with invoice details
 * Response format: { success: true, data: {...} }
 */
export const fetchInvoiceDetail = async (purchaseId = null, invoiceNumber = null) => {
  let url = 'invoice/detail/';
  const params = [];
  if (purchaseId) {
    params.push(`purchase_id=${purchaseId}`);
  }
  if (invoiceNumber) {
    params.push(`invoice_number=${invoiceNumber}`);
  }
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  const { data } = await apiClient.get(url);
  return data;
};

/**
 * Record customer payment
 * @param {FormData|Object} payload - Payment data (FormData if file upload, Object if JSON)
 * @param {string} payload.invoice_number - Invoice number (required)
 * @param {number} payload.customer_purchase - Customer purchase ID (required)
 * @param {number} payload.amount - Payment amount (required)
 * @param {string} payload.payment_mode - Payment mode: 'cash', 'online', 'cheque', 'bank_transfer' (required)
 * @param {string} payload.payment_date - Payment date in YYYY-MM-DD format (required)
 * @param {File} payload.payment_proof - Payment proof file (required, PDF, JPG, PNG, JPEG)
 * @param {string} payload.note - Note/remark (required)
 * @returns {Promise<Object>} Response data
 * Response format: { success: true, message: string, data: {...} }
 */
export const createCustomerPayment = async (payload) => {
  // NEW APPROACH: Accept FormData directly from component
  // If payload is already FormData, send it directly
  // Use EXACT same pattern as createPayment
  if (payload instanceof FormData) {
    console.log('createCustomerPayment: Received FormData directly, sending to API');
    console.log('FormData instanceof check:', payload instanceof FormData);
    // Verify file is in FormData
    for (let [key, value] of payload.entries()) {
      console.log(`FormData[${key}]:`, value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value);
    }
    // Use EXACT same pattern as createPayment (line 39-41)
    const { data } = await apiClient.post('customer/payments/', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  // Fallback: If payload is a regular object with File, create FormData
  const hasFile =
    payload &&
    Object.prototype.hasOwnProperty.call(payload, 'payment_proof') &&
    payload.payment_proof instanceof File;

  if (hasFile) {
    console.log('createCustomerPayment: Creating FormData from object with file');
    const formData = new FormData();
    formData.append('invoice_number', payload.invoice_number);
    formData.append('customer_purchase', payload.customer_purchase);
    formData.append('amount', payload.amount);
    formData.append('payment_mode', payload.payment_mode);
    formData.append('payment_date', payload.payment_date);
    formData.append('payment_proof', payload.payment_proof);

    if (payload.note) {
      formData.append('note', payload.note);
    }

    // Use EXACT same pattern as createPayment
    const { data } = await apiClient.post('customer/payments/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  // Fallback: JSON payload (no file) - Should not happen if file is required
  const { data } = await apiClient.post('customer/payments/', payload);
  return data;
};

/**
 * Fetch customer payments
 * @param {number} customerId - Customer ID (optional)
 * @param {string} invoiceNumber - Invoice number (optional)
 * @param {string} action - Action type: 'history' to get payment history (optional)
 * @returns {Promise<Object>} Response data with payments array
 * Response format: { success: true, count: number, data: [...] }
 */
export const fetchCustomerPayments = async (customerId = null, invoiceNumber = null, action = null) => {
  let url = 'customer/payments/';
  const params = [];
  if (customerId) {
    params.push(`customer_id=${customerId}`);
  }
  if (invoiceNumber) {
    params.push(`invoice_number=${invoiceNumber}`);
  }
  if (action) {
    params.push(`action=${action}`);
  }
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  const { data } = await apiClient.get(url);
  return data;
};

/**
 * Fetch customer payment history (individual payment records)
 * @param {number} customerId - Customer ID (required)
 * @returns {Promise<Object>} Response data with payment history records
 * Response format: { success: true, data: [...] }
 */
export const fetchCustomerPaymentHistory = async (customerId) => {
  const { data } = await apiClient.get(`customer/payments/?action=history&customer_id=${customerId}`);
  return data;
};



