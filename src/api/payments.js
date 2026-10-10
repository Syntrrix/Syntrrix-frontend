import apiClient from './client';

/**
 * Create a new payment record (seller only)
 * @param {Object} payload - Payment data
 * @param {string} payload.invoice_number - Invoice number (required)
 * @param {number} payload.product_purchase - Product purchase ID (required)
 * @param {number} payload.amount - Payment amount (required, must be > 0)
 * @param {string} payload.payment_mode - Payment mode: 'cash', 'online', 'cheque', 'bank_transfer' (required)
 * @param {string} payload.payment_date - Payment date in YYYY-MM-DD format (required)
 * @returns {Promise<Object>} Response data
 */
export const createPayment = async (payload) => {
  // NEW APPROACH: Accept FormData directly from component
  // If payload is already FormData, send it directly
  // Use EXACT same pattern as createPurchase
  if (payload instanceof FormData) {
    console.log('createPayment: Received FormData directly, sending to API');
    console.log('FormData instanceof check:', payload instanceof FormData);
    // Verify file is in FormData
    for (let [key, value] of payload.entries()) {
      console.log(`FormData[${key}]:`, value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value);
    }
    // Use EXACT same pattern as createPurchase (line 39-41)
    const { data } = await apiClient.post('payments/', payload, {
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
    console.log('createPayment: Creating FormData from object with file');
    const formData = new FormData();
    formData.append('invoice_number', payload.invoice_number);
    formData.append('product_purchase', payload.product_purchase);
    formData.append('amount', payload.amount);
    formData.append('payment_mode', payload.payment_mode);
    formData.append('payment_date', payload.payment_date);
    formData.append('payment_proof', payload.payment_proof);

    if (payload.note) {
      formData.append('note', payload.note);
    }

    // Don't set Content-Type - let axios handle it automatically
    const { data } = await apiClient.post('payments/', formData);
    return data;
  }

  // Fallback: JSON payload (no file)
  const { data } = await apiClient.post('payments/', payload);
  return data;
};

/**
 * Fetch all invoices/purchases with payment status for a specific supplier
 * @param {number} supplierId - Supplier ID (required)
 * @returns {Promise<Object>} Response data with purchases array including payment status
 */
export const fetchSupplierPayments = async (supplierId) => {
  const { data } = await apiClient.get(`payments/?supplier_id=${supplierId}`);
  return data;
};

/**
 * Fetch individual payment records (payment history) for a specific supplier
 * @param {number} supplierId - Supplier ID (required)
 * @returns {Promise<Object>} Response data with individual payment records
 */
export const fetchSupplierPaymentHistory = async (supplierId) => {
  const { data } = await apiClient.get(`payments/?action=history&supplier_id=${supplierId}`);
  return data;
};

