import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  TextField,
  InputAdornment,
  Grid,
  MenuItem,
  Divider,
  Stack,
  Pagination,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { fetchProducts, fetchSellerProducts, updateProduct } from '../../../api/products';
import { getInventorySummary, stockIn, stockOut, getInventoryTransactions } from '../../../api/inventory';
import { fetchBatchesByProduct, fetchStockOutBatches } from '../../../api/batches';
import { fetchCategories } from '../../../api/categories';
import Swal from 'sweetalert2';

function ProductList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [productQuantities, setProductQuantities] = useState({});
  const [latestBatchPricing, setLatestBatchPricing] = useState({}); // { productId: { purchase_price, selling_price, mrp } }
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productBatches, setProductBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStockTab, setActiveStockTab] = useState('stock'); // 'stock', 'stockIn', 'stockOut'
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  const [stockInHistory, setStockInHistory] = useState([]);
  const [stockOutHistory, setStockOutHistory] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
  // Edit Product Modal States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    product_id: '',
    product_name: '',
    category: '',
    purchase_price: '',
    sale_price: '',
    mrp: '',
    available_quantity: '',
    created_at: '',
  });
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  
  // Stock In Modal States
  const [stockInModalOpen, setStockInModalOpen] = useState(false);
  const [stockInFormData, setStockInFormData] = useState({
    product: '',
    category: '',
    batch: '',
    batch_id: '',
    quantity: '',
    manufacturing_date: '',
    expiry_date: '',
    reason: 'Purchase',
    reference_id: '',
    date: new Date().toISOString().slice(0, 10),
  });
  const [stockInBatches, setStockInBatches] = useState([]);
  const [selectedBatchStock, setSelectedBatchStock] = useState(null);
  const [loadingStockIn, setLoadingStockIn] = useState(false);
  const [loadingStockInData, setLoadingStockInData] = useState(false);
  const [loadingStockInBatches, setLoadingStockInBatches] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [stockInError, setStockInError] = useState('');
  const [stockInProducts, setStockInProducts] = useState([]);
  const [selectedProductName, setSelectedProductName] = useState('');
  const [categories, setCategories] = useState([]);
  
  // Stock Out Modal States
  const [stockOutModalOpen, setStockOutModalOpen] = useState(false);
  const [stockOutFormData, setStockOutFormData] = useState({
    product: '',
    batch: '',
    batch_id: '',
    quantity: '',
    reason: 'Damaged',
    date: new Date().toISOString().slice(0, 10),
  });
  const [availableStock, setAvailableStock] = useState(null);
  const [stockOutBatches, setStockOutBatches] = useState([]);
  const [selectedBatchStockOut, setSelectedBatchStockOut] = useState(null);
  const [loadingStockOut, setLoadingStockOut] = useState(false);
  const [loadingStockOutData, setLoadingStockOutData] = useState(false);
  const [loadingStockOutBatches, setLoadingStockOutBatches] = useState(false);
  const [loadingAvailableStock, setLoadingAvailableStock] = useState(false);
  const [stockOutError, setStockOutError] = useState('');
  const [quantityError, setQuantityError] = useState('');
  const [stockOutProducts, setStockOutProducts] = useState([]);
  
  const stockOutReasons = ['Damaged', 'Expired', 'Lost', 'Return', 'Sale', 'Other'];

  useEffect(() => {
    loadProducts();
    loadInventorySummary();
    loadLatestBatchPricing();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const sellerUserId = user?.id || null;
      const [productsRes, inventoryRes, stockInRes] = await Promise.all([
        fetchSellerProducts(),
        sellerUserId ? getInventorySummary({ seller_user: sellerUserId, batch_wise: true }) : Promise.resolve(null),
        getInventoryTransactions({ transaction_type: 'in' }).catch(() => ({ success: false, data: [] })),
      ]);

      if (productsRes && productsRes.success && Array.isArray(productsRes.data)) {
        const list = productsRes.data || [];
        setProducts(list);

        // Refresh-safe quantity map:
        // Only sum batches that appear in Stock In History.
        // (Do NOT include Stock tab batches in Product List quantity.)
        const batchQtyMap = {};

        const stockInByProduct = new Map(); // product_id -> { ids:Set, names:Set }
        if (stockInRes?.success && Array.isArray(stockInRes.data)) {
          stockInRes.data.forEach((t) => {
            const pid = t?.product;
            if (!pid) return;
            if (!stockInByProduct.has(pid)) {
              stockInByProduct.set(pid, { ids: new Set(), names: new Set() });
            }
            const entry = stockInByProduct.get(pid);
            const bid = t?.batch || t?.batch_info?.batch_id;
            const bname = t?.batch_name || t?.batch_info?.batch_name;
            if (bid) entry.ids.add(String(bid));
            if (bname) entry.names.add(String(bname));
          });
        }

        if (inventoryRes?.success && Array.isArray(inventoryRes.data)) {
          inventoryRes.data.forEach((row) => {
            const pid = row?.product_id;
            if (!pid) return;
            const batches = Array.isArray(row?.batches) ? row.batches : [];
            const stockInKey = stockInByProduct.get(pid);
            if (!stockInKey) {
              batchQtyMap[pid] = 0;
              return;
            }
            const sumQty = batches.reduce((sum, b) => {
              const bid = b?.batch_id != null ? String(b.batch_id) : '';
              const bname = b?.batch_name != null ? String(b.batch_name) : '';
              const isStockInBatch =
                (bid && stockInKey.ids.has(bid)) || (bname && stockInKey.names.has(bname));
              if (!isStockInBatch) return sum;
              const q = Number(b?.available_quantity ?? 0);
              return sum + (Number.isFinite(q) && q > 0 ? q : 0);
            }, 0);
            batchQtyMap[pid] = Math.max(sumQty, 0);
          });
        }

        const qtyMap = {};
        list.forEach((p) => {
          const pid = p.product_id;
          if (Object.prototype.hasOwnProperty.call(batchQtyMap, pid)) {
            qtyMap[pid] = Number(batchQtyMap[pid] || 0);
          } else {
            qtyMap[pid] = Number(p?.available_stock ?? 0);
          }
        });
        setProductQuantities(qtyMap);
      } else {
        setProducts([]);
        setProductQuantities({});
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch products.');
      setProducts([]);
      setProductQuantities({});
    } finally {
      setLoading(false);
    }
  };

  const loadInventorySummary = async () => {
    try {
      const sellerUserId = user?.id || null;
      if (!sellerUserId) {
        return;
      }
      
      // Fetch all necessary data in parallel
      const [inventoryResponse, stockInResponse, stockOutResponse] = await Promise.all([
        getInventorySummary({ seller_user: sellerUserId, batch_wise: true }),
        getInventoryTransactions({ transaction_type: 'in' }),
        getInventoryTransactions({ transaction_type: 'out' })
      ]);

      if (!inventoryResponse || !inventoryResponse.success || !Array.isArray(inventoryResponse.data)) {
        return;
      }

      // Calculate quantities using only Stock In history batches.
      const quantitiesMap = {};

      const stockInByProduct = new Map(); // product_id -> { ids:Set, names:Set }
      if (stockInResponse && stockInResponse.success && Array.isArray(stockInResponse.data)) {
        stockInResponse.data.forEach((t) => {
          const pid = t?.product;
          if (!pid) return;
          if (!stockInByProduct.has(pid)) {
            stockInByProduct.set(pid, { ids: new Set(), names: new Set() });
          }
          const entry = stockInByProduct.get(pid);
          const bid = t?.batch || t?.batch_info?.batch_id;
          const bname = t?.batch_name || t?.batch_info?.batch_name;
          if (bid) entry.ids.add(String(bid));
          if (bname) entry.names.add(String(bname));
        });
      }

      inventoryResponse.data.forEach((productData) => {
        const productId = productData.product_id;
        const productBatches = productData.batches || [];
        const stockInKey = stockInByProduct.get(productId);
        if (!stockInKey) {
          quantitiesMap[productId] = 0;
          return;
        }
        const totalAvailableQty = productBatches.reduce((sum, b) => {
          const bid = b?.batch_id != null ? String(b.batch_id) : '';
          const bname = b?.batch_name != null ? String(b.batch_name) : '';
          const isStockInBatch =
            (bid && stockInKey.ids.has(bid)) || (bname && stockInKey.names.has(bname));
          if (!isStockInBatch) return sum;
          const q = Number(b?.available_quantity ?? 0);
          return sum + (Number.isFinite(q) && q > 0 ? q : 0);
        }, 0);
        quantitiesMap[productId] = totalAvailableQty;
      });

      setProductQuantities(quantitiesMap);
    } catch (err) {
      console.error('Failed to load inventory summary:', err);
    }
  };

  const loadLatestBatchPricing = async () => {
    try {
      const sellerUserId = user?.id || null;
      if (!sellerUserId) {
        return;
      }
      
      // Get all Stock In transactions to find batches that were added through Stock In
      const stockInTransactionsResponse = await getInventoryTransactions({ 
        transaction_type: 'in' 
      });
      
      if (!stockInTransactionsResponse || !stockInTransactionsResponse.success || !Array.isArray(stockInTransactionsResponse.data)) {
        setLatestBatchPricing({});
        return;
      }
      
      // Get unique product IDs from Stock In transactions
      const productIds = [...new Set(stockInTransactionsResponse.data.map(t => t.product))];
      
      if (productIds.length === 0) {
        setLatestBatchPricing({});
        return;
      }
      
      // Get inventory summary with batch_wise for products that have Stock In transactions
      const response = await getInventorySummary({ 
        seller_user: sellerUserId,
        batch_wise: true 
      });
      
      if (response && response.success && Array.isArray(response.data)) {
        const pricingMap = {};
        
        // Create a set of batch IDs/names that have been added through Stock In
        const stockInBatchIds = new Set();
        const stockInBatchNames = new Set();
        
        stockInTransactionsResponse.data.forEach(transaction => {
          if (transaction.batch || transaction.batch_info?.batch_id) {
            const batchId = transaction.batch || transaction.batch_info?.batch_id;
            stockInBatchIds.add(batchId);
          }
          if (transaction.batch_name) {
            stockInBatchNames.add(transaction.batch_name);
          }
          if (transaction.batch_info?.batch_name) {
            stockInBatchNames.add(transaction.batch_info.batch_name);
          }
        });
        
        response.data.forEach((productData) => {
          const productId = productData.product_id;
          
          // Only process products that have Stock In transactions
          if (!productIds.includes(productId)) {
            return;
          }
          
          if (productData.batches && Array.isArray(productData.batches) && productData.batches.length > 0) {
            // Filter batches to only include those added through Stock In
            const stockInBatches = productData.batches.filter(batch => {
              // Check if batch was added through Stock In
              return (
                (batch.batch_id && stockInBatchIds.has(batch.batch_id)) ||
                (batch.batch_name && stockInBatchNames.has(batch.batch_name))
              );
            });
            
            if (stockInBatches.length > 0) {
              // Find the latest batch by created_at (most recent)
              const sortedBatches = [...stockInBatches].sort((a, b) => {
                const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
                const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
                return dateB - dateA; // Sort descending (newest first)
              });
              
              const latestBatch = sortedBatches[0];
              
              if (latestBatch) {
                pricingMap[productId] = {
                  purchase_price: latestBatch.purchase_price,
                  selling_price: latestBatch.selling_price,
                  mrp: latestBatch.mrp,
                };
              }
            }
          }
        });
        
        setLatestBatchPricing(pricingMap);
      }
    } catch (err) {
      console.error('Failed to load latest batch pricing:', err);
      setLatestBatchPricing({});
    }
  };

  // Helper function to refresh product modal data
  const refreshProductModalData = async (product) => {
    if (!product || !product.product_id) return;

    setLoadingBatches(true);
    setLoadingTransactions(true);

    // Fetch transaction history first to get stock out batches and stock in batches
    let stockOutBatchesToExclude = new Set();
    let stockInBatchesToExclude = new Set();
    let filteredStockInHistory = [];
    let filteredBatches = [];
    try {
      const [stockInResponse, stockOutResponse] = await Promise.all([
        getInventoryTransactions({ product_id: product.product_id, transaction_type: 'in' }),
        getInventoryTransactions({ product_id: product.product_id, transaction_type: 'out' })
      ]);

      // First, collect batch IDs and batch names from stock out history
      if (stockOutResponse && stockOutResponse.success && Array.isArray(stockOutResponse.data)) {
        setStockOutHistory(stockOutResponse.data);
        
        // Collect batch IDs and batch names from stock out history to exclude from Stock table and Stock In History
        stockOutResponse.data.forEach(transaction => {
          // Add batch_id if available
          if (transaction.batch || transaction.batch_info?.batch_id) {
            const batchId = transaction.batch || transaction.batch_info?.batch_id;
            stockOutBatchesToExclude.add(batchId);
          }
          // Also add batch_name for matching (in case batch_id is not available)
          if (transaction.batch_name) {
            stockOutBatchesToExclude.add(transaction.batch_name);
          }
          if (transaction.batch_info?.batch_name) {
            stockOutBatchesToExclude.add(transaction.batch_info.batch_name);
          }
        });
      } else {
        setStockOutHistory([]);
      }

      // Collect batch IDs and batch names from stock in history to exclude from Stock table
      if (stockInResponse && stockInResponse.success && Array.isArray(stockInResponse.data)) {
        stockInResponse.data.forEach(transaction => {
          // Add batch_id if available
          if (transaction.batch || transaction.batch_info?.batch_id) {
            const batchId = transaction.batch || transaction.batch_info?.batch_id;
            stockInBatchesToExclude.add(batchId);
          }
          // Also add batch_name for matching (in case batch_id is not available)
          if (transaction.batch_name) {
            stockInBatchesToExclude.add(transaction.batch_name);
          }
          if (transaction.batch_info?.batch_name) {
            stockInBatchesToExclude.add(transaction.batch_info.batch_name);
          }
        });

        // Keep Stock In history visible even after partial stock-out.
        filteredStockInHistory = stockInResponse.data;
        setStockInHistory(filteredStockInHistory);
      } else {
        setStockInHistory([]);
      }
    } catch (err) {
      console.error('Error loading transaction history:', err);
      setStockInHistory([]);
      setStockOutHistory([]);
    }

    try {
      // Fetch batch-wise inventory summary for the product
      const response = await getInventorySummary({ 
        product_id: product.product_id,
        batch_wise: true 
      });
      
      if (response && response.success && Array.isArray(response.data) && response.data.length > 0) {
        // Extract batches from the first product (since we filtered by product_id)
        const productData = response.data[0];
        if (productData.batches && Array.isArray(productData.batches)) {
          // Show currently available batches only.
          // Batches that are present in Stock In history should not appear in Stock tab.
          filteredBatches = productData.batches.filter(batch => {
            const availableQty = batch.available_quantity !== undefined && batch.available_quantity !== null 
              ? Number(batch.available_quantity) 
              : 0;
            
            // Exclude if available_quantity is 0
            if (availableQty <= 0) {
              return false;
            }

            const batchId = batch.batch_id;
            const batchName = batch.batch_name;
            if (batchId && stockInBatchesToExclude.has(batchId)) {
              return false;
            }
            if (batchName && stockInBatchesToExclude.has(batchName)) {
              return false;
            }
            
            return true;
          });
          setProductBatches(filteredBatches);
        } else {
          setProductBatches([]);
        }
      } else {
        setProductBatches([]);
      }
    } catch (err) {
      console.error('Error loading batch-wise inventory:', err);
      setProductBatches([]);
    } finally {
      setLoadingBatches(false);
      setLoadingTransactions(false);
      
      // Keep Product List quantity stable; do not override it from modal refresh.
    }
  };

  const handleViewProduct = async (product) => {
    setSelectedProduct(product);
    setViewModalOpen(true);
    setProductBatches([]);
    setStockInHistory([]);
    setStockOutHistory([]);
    setActiveStockTab('stock');
    await refreshProductModalData(product);
  };

  const handleCloseModal = () => {
    setViewModalOpen(false);
    setSelectedProduct(null);
    setProductBatches([]);
    setStockInHistory([]);
    setStockOutHistory([]);
    setActiveStockTab('stock');
  };

  const handleEditProduct = async (product) => {
    setEditError('');
    setLoadingEdit(true);
    
    try {
      // Fetch available quantity from inventory summary
      let availableQty = 0;
      try {
        const inventoryResponse = await getInventorySummary({ 
          product_id: product.product_id,
          seller_user: user?.id 
        });
        if (inventoryResponse && inventoryResponse.success && Array.isArray(inventoryResponse.data) && inventoryResponse.data.length > 0) {
          const rawQty = parseFloat(inventoryResponse.data[0].available_stock) || 0;
          // Backend ensures available_stock never goes below 0, but keep frontend clamping as safety measure
          availableQty = Math.max(0, rawQty);
        }
      } catch (err) {
        console.error('Error fetching available quantity:', err);
      }
      
      // Set form data with product details
      setEditFormData({
        product_id: product.product_id,
        product_name: product.product_name || '',
        category: product.category || '',
        purchase_price: product.purchase_price || '',
        sale_price: product.sale_price || '',
        mrp: product.mrp || '',
        available_quantity: availableQty,
        created_at: product.created_at || '',
      });
      
      setSelectedProduct(product);
      setEditModalOpen(true);
    } catch (err) {
      console.error('Error loading product for edit:', err);
      setEditError('Failed to load product details.');
    } finally {
      setLoadingEdit(false);
    }
  };
  
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
    setEditError('');
  };
  
  const handleEditSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    if (!editFormData.product_name || editFormData.product_name.trim() === '') {
      setEditError('Product name is required');
      return;
    }
    
    setLoadingEdit(true);
    setEditError('');
    
    try {
      const payload = {
        product_id: editFormData.product_id,
        product_name: editFormData.product_name.trim(),
        category: editFormData.category?.trim() || '',
        purchase_price: editFormData.purchase_price ? parseFloat(editFormData.purchase_price) : null,
        sale_price: editFormData.sale_price ? parseFloat(editFormData.sale_price) : null,
        mrp: editFormData.mrp ? parseFloat(editFormData.mrp) : null,
      };
      
      const response = await updateProduct(payload);
      
      if (response && response.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: response.message || 'Product updated successfully.',
          confirmButtonColor: '#10b981',
        });
        
        // Close modal and reload products
        setEditModalOpen(false);
        setEditFormData({
          product_id: '',
          product_name: '',
          category: '',
          purchase_price: '',
          sale_price: '',
          mrp: '',
          available_quantity: '',
          created_at: '',
        });
        loadProducts();
        loadInventorySummary();
        loadLatestBatchPricing();
      } else {
        throw new Error(response?.message || 'Failed to update product.');
      }
    } catch (err) {
      let errorMessage = 'Failed to update product.';
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        if (errorData.errors) {
          const errorFields = Object.keys(errorData.errors);
          errorMessage = errorFields.map(field => 
            `${field}: ${Array.isArray(errorData.errors[field]) ? errorData.errors[field].join(', ') : errorData.errors[field]}`
          ).join('\n');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setEditError(errorMessage);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#d32f2f',
      });
    } finally {
      setLoadingEdit(false);
    }
  };
  
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditFormData({
      product_id: '',
      product_name: '',
      category: '',
      purchase_price: '',
      sale_price: '',
      mrp: '',
      available_quantity: '',
      created_at: '',
    });
    setEditError('');
  };

  const generateBillNumber = () => `BILL-${Math.floor(100000 + Math.random() * 900000)}`;

  const handleStockIn = async (product) => {
        // Pre-select the clicked product in the form
        const productId = product.product_id.toString();
        const productName = product.product_name || '';
        
        // Store product name immediately for display
        setSelectedProductName(productName);
        
        setStockInFormData({
          product: productId,
          category: '',
          batch: '',
          batch_id: '',
          quantity: '',
          manufacturing_date: '',
          expiry_date: '',
          reason: 'Purchase',
          reference_id: generateBillNumber(),
          date: new Date().toISOString().slice(0, 10),
        });
    setStockInBatches([]);
    setSelectedBatchStock(null);
    setStockInError('');
    setStockInModalOpen(true);
    
    // Load products list (for display purposes only, product is pre-selected)
    setLoadingStockInData(true);
    try {
      const productsRes = await fetchSellerProducts().catch(() => ({ success: false, data: [] }));
      if (productsRes && productsRes.success && Array.isArray(productsRes.data)) {
        setStockInProducts(productsRes.data);
      }
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoadingStockInData(false);
    }
    
    // Load batches for the pre-selected product
    if (productId) {
      const productIdNum = parseInt(productId);
      if (!isNaN(productIdNum) && productIdNum > 0) {
        loadStockInBatches(productIdNum);
      }
    }
    
    // Load categories when modal opens
    loadCategories();
  };
  
  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await fetchCategories();
      if (response && response.success && Array.isArray(response.data)) {
        setCategories(response.data || []);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleStockOut = async (product) => {
    setStockOutFormData({
      product: product.product_id.toString(),
      batch: '',
      batch_id: '',
      quantity: '',
      reason: 'Damaged',
      date: new Date().toISOString().slice(0, 10),
    });
    setAvailableStock(null);
    setStockOutBatches([]);
    setSelectedBatchStockOut(null);
    setStockOutError('');
    setQuantityError('');
    setStockOutModalOpen(true);
    
    // Load products list
    setLoadingStockOutData(true);
    try {
      const productsRes = await fetchSellerProducts().catch(() => ({ success: false, data: [] }));
      if (productsRes && productsRes.success && Array.isArray(productsRes.data)) {
        setStockOutProducts(productsRes.data);
      }
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoadingStockOutData(false);
    }
    
    // Load batches for the selected product
    const productId = product.product_id;
    if (productId) {
      await loadStockOutBatches(productId);
      loadAvailableStock(productId);
    }
  };

  const loadStockInBatches = async (productId) => {
    setLoadingStockInBatches(true);
    try {
      const res = await fetchBatchesByProduct(productId);
      if (res && res.success && Array.isArray(res.data)) {
        // Filter out batches with available quantity = 0
        // Only show batches with available quantity > 0 in the dropdown
        const filteredBatches = res.data.filter(batch => {
          const availableQty = batch.available_quantity ?? batch.quantity ?? batch.current_stock;
          return availableQty !== undefined && availableQty !== null && Number(availableQty) > 0;
        });
        setStockInBatches(filteredBatches);
      } else {
        setStockInBatches([]);
      }
    } catch (err) {
      console.error('Failed to load batches', err);
      setStockInBatches([]);
    } finally {
      setLoadingStockInBatches(false);
    }
  };

  const loadStockOutBatches = async (productId) => {
    setLoadingStockOutBatches(true);
    try {
      // Get transaction history to identify batches
      let stockOutBatchesToExclude = new Set();
      let stockInTransactions = [];
      
      try {
        const [stockInResponse, stockOutResponse] = await Promise.all([
          getInventoryTransactions({ product_id: productId, transaction_type: 'in' }),
          getInventoryTransactions({ product_id: productId, transaction_type: 'out' })
        ]);

        // Collect batch IDs and batch names from stock out history (to exclude from Stock section)
        if (stockOutResponse && stockOutResponse.success && Array.isArray(stockOutResponse.data)) {
          stockOutResponse.data.forEach(transaction => {
            if (transaction.batch || transaction.batch_info?.batch_id) {
              const batchId = transaction.batch || transaction.batch_info?.batch_id;
              stockOutBatchesToExclude.add(batchId);
            }
            if (transaction.batch_name) {
              stockOutBatchesToExclude.add(transaction.batch_name);
            }
            if (transaction.batch_info?.batch_name) {
              stockOutBatchesToExclude.add(transaction.batch_info.batch_name);
            }
          });
        }

        // Collect stock in transactions (for Stock In History section)
        if (stockInResponse && stockInResponse.success && Array.isArray(stockInResponse.data)) {
          // Filter stock in history to exclude batches that have been stock out (same as Stock In History section)
          stockInTransactions = stockInResponse.data.filter(transaction => {
            const batchId = transaction.batch || transaction.batch_info?.batch_id;
            const batchName = transaction.batch_name || transaction.batch_info?.batch_name;
            
            // Exclude if batch_id or batch_name appears in stock out history
            if (batchId && stockOutBatchesToExclude.has(batchId)) {
              return false;
            }
            if (batchName && stockOutBatchesToExclude.has(batchName)) {
              return false;
            }
            
            return true;
          });
        }
      } catch (err) {
        console.error('Error loading transaction history for stock out batches:', err);
      }

      // Fetch batch-wise inventory summary (for Stock section batches)
      const response = await getInventorySummary({ 
        product_id: productId,
        batch_wise: true 
      });
      
      const allBatches = [];
      const batchMap = new Map(); // To deduplicate batches by batch_id or batch_name
      
      // 1. Add batches from Stock section (same filtering as Product Details modal)
      if (response && response.success && Array.isArray(response.data) && response.data.length > 0) {
        const productData = response.data[0];
        if (productData.batches && Array.isArray(productData.batches)) {
          productData.batches.forEach(batch => {
            const availableQty = batch.available_quantity !== undefined && batch.available_quantity !== null 
              ? Number(batch.available_quantity) 
              : 0;
            
            // Only include batches with available_quantity > 0
            if (availableQty <= 0) {
              return;
            }
            
            const batchId = batch.batch_id;
            const batchName = batch.batch_name;

            // Keep batch visible; only dedupe if also present in Stock In section.
            // We'll add Stock In History batches separately below.
            const stockInBatchId = batchId;
            const stockInBatchName = batchName;
            const isInStockInHistory = stockInTransactions.some(t => 
              (stockInBatchId && (t.batch === stockInBatchId || t.batch_info?.batch_id === stockInBatchId)) ||
              (stockInBatchName && (t.batch_name === stockInBatchName || t.batch_info?.batch_name === stockInBatchName))
            );
            
            if (isInStockInHistory) {
              return; // Skip, will be added from Stock In History below
            }
            
            // Add to map for deduplication
            const key = batchId || batchName;
            if (key && !batchMap.has(key)) {
              batchMap.set(key, batch);
              allBatches.push(batch);
            }
          });
        }
      }
      
      // 2. Add batches from Stock In History section
      // Get batch details from inventory summary for Stock In History batches
      if (stockInTransactions.length > 0 && response && response.success && Array.isArray(response.data) && response.data.length > 0) {
        const productData = response.data[0];
        if (productData.batches && Array.isArray(productData.batches)) {
          stockInTransactions.forEach(transaction => {
            const batchId = transaction.batch || transaction.batch_info?.batch_id;
            const batchName = transaction.batch_name || transaction.batch_info?.batch_name;
            
            // Find matching batch from inventory summary
            const matchingBatch = productData.batches.find(b => 
              (batchId && b.batch_id === batchId) || 
              (batchName && b.batch_name === batchName)
            );
            
            if (matchingBatch) {
              // Check if batch has available quantity > 0 (same filter as Stock In History section)
              const availableQty = matchingBatch.available_quantity !== undefined && matchingBatch.available_quantity !== null 
                ? Number(matchingBatch.available_quantity) 
                : (transaction.batch_info?.available_quantity !== undefined 
                    ? transaction.batch_info.available_quantity 
                    : transaction.quantity);
              
              if (availableQty !== undefined && availableQty !== null && Number(availableQty) > 0) {
                const key = batchId || batchName;
                if (key && !batchMap.has(key)) {
                  batchMap.set(key, matchingBatch);
                  allBatches.push(matchingBatch);
                }
              }
            } else {
              // If batch not found in inventory summary, create batch object from transaction
              const availableQty = transaction.batch_info?.available_quantity !== undefined 
                ? transaction.batch_info.available_quantity 
                : transaction.quantity;
              
              if (availableQty !== undefined && availableQty !== null && Number(availableQty) > 0) {
                const key = batchId || batchName;
                if (key && !batchMap.has(key)) {
                  const batchFromTransaction = {
                    batch_id: batchId,
                    batch_name: batchName || transaction.batch_name,
                    available_quantity: availableQty,
                    purchase_price: transaction.batch_info?.purchase_price,
                    selling_price: transaction.batch_info?.selling_price,
                    mrp: transaction.batch_info?.mrp,
                    expiry_date: transaction.batch_info?.expiry_date || transaction.expiry_date,
                    created_at: transaction.created_at,
                  };
                  batchMap.set(key, batchFromTransaction);
                  allBatches.push(batchFromTransaction);
                }
              }
            }
          });
        }
      }
      
      setStockOutBatches(allBatches);
      console.log('Loaded batches for stock out (Stock section + Stock In History):', allBatches);
    } catch (err) {
      console.error('Failed to load batches for stock out', err);
      setStockOutBatches([]);
    } finally {
      setLoadingStockOutBatches(false);
    }
  };

  const loadAvailableStock = async (productId) => {
    if (!productId) {
      setAvailableStock(null);
      return;
    }
    setLoadingAvailableStock(true);
    try {
      const response = await getInventorySummary({ 
        product_id: productId,
        seller_user: user?.id 
      });
      if (response && response.success && Array.isArray(response.data) && response.data.length > 0) {
        const productStock = response.data[0];
        setAvailableStock({
          available: parseFloat(productStock.available_stock) || 0,
          unit: productStock.unit || 'unit',
        });
      } else {
        setAvailableStock({ available: 0, unit: 'unit' });
      }
    } catch (err) {
      console.error('Error loading available stock:', err);
      setAvailableStock(null);
    } finally {
      setLoadingAvailableStock(false);
    }
  };

  const handleStockInChange = (e) => {
    const { name, value } = e.target;
    
    // Prevent editing quantity if batch is selected (quantity is auto-filled and read-only)
    if (name === 'quantity' && stockInFormData.batch && stockInFormData.batch.trim() !== '') {
      return;
    }
    
    setStockInFormData((prev) => ({ ...prev, [name]: value }));
    setStockInError('');

    // When product changes, fetch batches for that product and enable category field
    if (name === 'product') {
      setStockInFormData((prev) => ({
        ...prev,
        category: '',
        batch: '',
        batch_id: '',
        quantity: '',
      }));
      setStockInBatches([]);
      setSelectedBatchStock(null);
      const productIdNum = parseInt(value);
      if (!isNaN(productIdNum) && productIdNum > 0) {
        loadStockInBatches(productIdNum);
      }
    }

    // When batch changes, automatically fetch and set the available quantity
    // Quantity field becomes read-only when batch is selected
    if (name === 'batch') {
      if (value && value.trim() !== '') {
        const found = stockInBatches.find((b) => b.batch_name === value);
        if (found) {
          const availableQty = found.available_quantity ?? found.quantity ?? found.current_stock ?? 0;
          setSelectedBatchStock(availableQty !== undefined && availableQty !== null ? availableQty : null);
          // Auto-fill quantity with available quantity from selected batch
          setStockInFormData((prev) => ({
            ...prev,
            batch_id: found.batch_id ? found.batch_id.toString() : '',
            quantity: availableQty !== undefined && availableQty !== null ? availableQty.toString() : '0',
          }));
        } else {
          setSelectedBatchStock(null);
          setStockInFormData((prev) => ({
            ...prev,
            quantity: '',
            batch_id: '',
          }));
        }
      } else {
        // Batch cleared - clear quantity field
        setSelectedBatchStock(null);
        setStockInFormData((prev) => ({
          ...prev,
          quantity: '',
          batch_id: '',
        }));
      }
    }
  };

  const handleStockOutChange = (e) => {
    const { name, value } = e.target;
    
    // Prevent editing quantity if batch is selected (quantity is auto-filled and read-only)
    if (name === 'quantity' && stockOutFormData.batch && stockOutFormData.batch.trim() !== '') {
      return;
    }
    
    setStockOutFormData((prev) => ({ ...prev, [name]: value }));
    setStockOutError('');
    
    // If product is changed, fetch batches and available stock
    if (name === 'product') {
      setAvailableStock(null);
      setStockOutBatches([]);
      setSelectedBatchStockOut(null);
      setQuantityError('');
      setStockOutFormData((prev) => ({
        ...prev,
        batch: '',
        batch_id: '',
        quantity: '',
      }));
      if (value) {
        const productId = parseInt(value, 10);
        if (!isNaN(productId)) {
          loadStockOutBatches(productId);
          loadAvailableStock(productId);
        }
      }
    }
    
    // When batch changes, automatically fetch and set the available quantity
    if (name === 'batch') {
      if (value && value.trim() !== '') {
        // Find batch by batch_name or batch_id (in case value is batch_id string)
        const found = stockOutBatches.find(
          (b) => b.batch_name === value || b.batch_id?.toString() === value.toString()
        );
        if (found) {
          // Stock Out Batches API returns available_quantity directly
          const availableQty = found.available_quantity ?? 0;
          setSelectedBatchStockOut(availableQty !== undefined && availableQty !== null ? availableQty : null);
          // Auto-fill quantity with available quantity from selected batch
          setStockOutFormData((prev) => ({
            ...prev,
            batch_id: found.batch_id ? found.batch_id.toString() : '',
            // Ensure batch_name is stored, not batch_id
            batch: found.batch_name || value,
            quantity: availableQty !== undefined && availableQty !== null ? availableQty.toString() : '0',
          }));
        } else {
          console.warn('Batch not found in stockOutBatches:', value, stockOutBatches);
          setSelectedBatchStockOut(null);
          setStockOutFormData((prev) => ({
            ...prev,
            quantity: '',
            batch_id: '',
          }));
        }
      } else {
        // Batch cleared - clear quantity field
        setSelectedBatchStockOut(null);
        setStockOutFormData((prev) => ({
          ...prev,
          quantity: '',
          batch_id: '',
        }));
      }
    }
    
    // If quantity is changed, validate against available stock
    if (name === 'quantity') {
      validateStockOutQuantity(value);
    }
  };

  const validateStockOutQuantity = (quantityValue) => {
    if (!quantityValue || quantityValue.trim() === '') {
      setQuantityError('');
      return;
    }

    const qty = parseFloat(quantityValue);
    if (isNaN(qty) || qty <= 0) {
      setQuantityError('Quantity must be greater than 0');
      return;
    }

    // Only validate against overall product stock if no batch is selected
    // When a batch is selected, validate against the batch's available quantity
    if (!stockOutFormData.batch || stockOutFormData.batch.trim() === '') {
      if (availableStock && qty > availableStock.available) {
        setQuantityError(`Quantity cannot exceed available stock (${availableStock.available.toFixed(2)} ${availableStock.unit})`);
        return;
      }
    } else if (selectedBatchStockOut !== null && qty > selectedBatchStockOut) {
      setQuantityError(`Quantity cannot exceed available batch quantity (${selectedBatchStockOut.toFixed(2)})`);
      return;
    }

    setQuantityError('');
  };

  const handleStockInSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!stockInFormData.product) {
      setStockInError('Please select a product');
      return;
    }
    if (!stockInFormData.batch || stockInFormData.batch.trim() === '') {
      setStockInError('Please select a batch');
      return;
    }
    if (!stockInFormData.quantity || parseFloat(stockInFormData.quantity) <= 0) {
      setStockInError('Please enter a valid quantity greater than 0');
      return;
    }
    if (!stockInFormData.date) {
      setStockInError('Please enter a date');
      return;
    }
    if (!stockInFormData.manufacturing_date || stockInFormData.manufacturing_date.trim() === '') {
      setStockInError('Please enter a manufacturing date');
      return;
    }
    if (!stockInFormData.expiry_date || stockInFormData.expiry_date.trim() === '') {
      setStockInError('Please enter an expiry date');
      return;
    }

    setLoadingStockIn(true);
    setStockInError('');

    try {
      const productId = parseInt(stockInFormData.product);
      if (isNaN(productId) || productId <= 0) {
        throw new Error('Invalid product selected');
      }

      // Prepare payload according to API documentation
      // Required: product, quantity, date
      // Optional: batch (batch_id), batch_name, reason, reference_id, expiry_date, manufacturing_date, category
      const payload = {
        product: productId,
        quantity: parseFloat(stockInFormData.quantity),
        date: stockInFormData.date,
      };

      // Add batch_id or batch_name (required field)
      // Prefer batch_id if available for more reliable batch updates
      if (stockInFormData.batch_id && stockInFormData.batch_id.trim() !== '') {
        payload.batch = parseInt(stockInFormData.batch_id);
      } else if (stockInFormData.batch && stockInFormData.batch.trim() !== '') {
        payload.batch_name = stockInFormData.batch.trim();
      }

      // Add reason if provided (optional field)
      if (stockInFormData.reason && stockInFormData.reason.trim() !== '') {
        payload.reason = stockInFormData.reason.trim();
      }

      // Add reference_id if provided (optional field)
      if (stockInFormData.reference_id && stockInFormData.reference_id.trim() !== '') {
        payload.reference_id = stockInFormData.reference_id.trim();
      }

      // Add expiry_date (required field)
      payload.expiry_date = stockInFormData.expiry_date.trim();

      // Add manufacturing_date (required field)
      payload.manufacturing_date = stockInFormData.manufacturing_date.trim();

      // Add category if provided (optional field - updates product's category)
      if (stockInFormData.category && stockInFormData.category.trim() !== '') {
        payload.category = stockInFormData.category.trim();
      }

      const response = await stockIn(payload);

      if (response && response.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: response.message || 'Stock in recorded successfully.',
          confirmButtonColor: '#0ea5e9',
        });

        // Refresh Product Details modal if it's open for the same product
        if (viewModalOpen && selectedProduct && selectedProduct.product_id === productId) {
          await refreshProductModalData(selectedProduct);
        }

        // Reset form and close modal
        // Note: The backend API now automatically excludes batches used in Stock In operations
        // So when the modal is reopened, the used batch won't appear in the dropdown
        setStockInFormData({
          product: '',
          category: '',
          batch: '',
          batch_id: '',
          quantity: '',
          manufacturing_date: '',
          expiry_date: '',
          reason: 'Purchase',
          reference_id: generateBillNumber(),
          date: new Date().toISOString().slice(0, 10),
        });
        setStockInBatches([]);
        setSelectedBatchStock(null);
        setStockInModalOpen(false);
        
        // Reload inventory summary and latest batch pricing
        loadInventorySummary();
        loadLatestBatchPricing();
      } else {
        throw new Error(response?.message || 'Failed to record stock in.');
      }
    } catch (err) {
      let errorMessage = 'Failed to record stock in.';
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        if (errorData.errors) {
          const errorFields = Object.keys(errorData.errors);
          errorMessage = errorFields.map(field => 
            `${field}: ${Array.isArray(errorData.errors[field]) ? errorData.errors[field].join(', ') : errorData.errors[field]}`
          ).join('\n');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setStockInError(errorMessage);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#d32f2f',
      });
    } finally {
      setLoadingStockIn(false);
    }
  };

  const handleStockOutSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!stockOutFormData.product) {
      setStockOutError('Please select a product');
      return;
    }
    
    if (!stockOutFormData.batch || stockOutFormData.batch.trim() === '') {
      setStockOutError('Please select a batch');
      return;
    }
    
    const quantity = parseFloat(stockOutFormData.quantity);
    if (!stockOutFormData.quantity || isNaN(quantity) || quantity <= 0) {
      setStockOutError('Please enter a valid quantity');
      return;
    }
    
    // Validate quantity against batch available quantity if batch is selected
    if (selectedBatchStockOut !== null && quantity > selectedBatchStockOut) {
      setStockOutError(`Quantity (${quantity}) cannot exceed available batch quantity (${selectedBatchStockOut.toFixed(2)})`);
      return;
    }
    
    // Only validate against overall product stock if no batch is selected
    // When a batch is selected, we validate against the batch's available quantity above
    if (!stockOutFormData.batch || stockOutFormData.batch.trim() === '') {
      if (availableStock && quantity > availableStock.available) {
        setStockOutError(`Quantity (${quantity}) cannot exceed available stock (${availableStock.available.toFixed(2)} ${availableStock.unit})`);
        return;
      }
    }
    
    if (!stockOutFormData.reason || stockOutFormData.reason.trim() === '') {
      setStockOutError('Please select a reason');
      return;
    }
    if (!stockOutFormData.date) {
      setStockOutError('Please enter a date');
      return;
    }

    setLoadingStockOut(true);
    setStockOutError('');

    try {
      const productId = parseInt(stockOutFormData.product);
      if (isNaN(productId) || productId <= 0) {
        throw new Error('Invalid product selected');
      }

      // Validate batch_id exists before proceeding
      if (!stockOutFormData.batch_id || stockOutFormData.batch_id.trim() === '') {
        throw new Error('Batch ID is required for stock out operation');
      }

      const batchId = parseInt(stockOutFormData.batch_id);
      if (isNaN(batchId) || batchId <= 0) {
        throw new Error('Invalid batch ID');
      }

      // Prepare payload according to API documentation
      // Required: product, quantity, reason, date
      // Optional: batch (batch_id), reference_id
      const payload = {
        product: productId,
        batch: batchId, // batch_id is required when batch is selected
        quantity: parseFloat(stockOutFormData.quantity),
        reason: stockOutFormData.reason.trim(),
        date: stockOutFormData.date,
      };

      // Add reference_id if provided (optional field)
      if (stockOutFormData.reference_id && stockOutFormData.reference_id.trim() !== '') {
        payload.reference_id = stockOutFormData.reference_id.trim();
      }

      const response = await stockOut(payload);

      // Validate response success
      if (!response.success) {
        throw new Error(response.message || 'Failed to record stock out.');
      }

      // Show success message with batch update info if available
      let successMessage = response.message || 'Stock out recorded successfully.';
      if (response.batch_updated) {
        successMessage += `\nBatch "${response.batch_updated.batch_name}" updated. New available quantity: ${response.batch_updated.new_available_quantity}`;
      }

      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: successMessage,
        confirmButtonColor: '#22d3ee',
      });

      // Refresh Product Details modal if it's open for the same product
      if (viewModalOpen && selectedProduct && selectedProduct.product_id === productId) {
        await refreshProductModalData(selectedProduct);
      }

      // Reset form and close modal
      setStockOutFormData({
        product: '',
        batch: '',
        batch_id: '',
        quantity: '',
        reason: 'Damaged',
        date: new Date().toISOString().slice(0, 10),
      });
      setAvailableStock(null);
      setStockOutBatches([]);
      setSelectedBatchStockOut(null);
      setQuantityError('');
      setStockOutModalOpen(false);
      
      // Reload inventory summary and latest batch pricing
      loadInventorySummary();
      loadLatestBatchPricing();
    } catch (err) {
      // Parse error response from API
      let errorMessage = 'Failed to record stock out.';
      
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        // Handle API error response format: { success: false, message: "..." }
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.errors) {
          // Handle validation errors
          const errorFields = Object.keys(errorData.errors);
          errorMessage = errorFields.map(field => 
            `${field}: ${Array.isArray(errorData.errors[field]) ? errorData.errors[field].join(', ') : errorData.errors[field]}`
          ).join('\n');
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setStockOutError(errorMessage);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#d32f2f',
      });
    } finally {
      setLoadingStockOut(false);
    }
  };

  const handleCloseStockInModal = () => {
    setStockInModalOpen(false);
    setStockInFormData({
      product: '',
      category: '',
      batch: '',
      batch_id: '',
      quantity: '',
      manufacturing_date: '',
      expiry_date: '',
      reason: 'Purchase',
      reference_id: generateBillNumber(),
      date: new Date().toISOString().slice(0, 10),
    });
    setStockInBatches([]);
    setSelectedBatchStock(null);
    setSelectedProductName('');
    setStockInError('');
  };

  const handleCloseStockOutModal = () => {
    setStockOutModalOpen(false);
    setStockOutFormData({
      product: '',
      batch: '',
      batch_id: '',
      quantity: '',
      reason: 'Damaged',
      date: new Date().toISOString().slice(0, 10),
    });
    setAvailableStock(null);
    setStockOutBatches([]);
    setSelectedBatchStockOut(null);
    setQuantityError('');
    setStockOutError('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  // Filter products based on search term
  const filteredProducts = products.filter((product) =>
    product.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset page to 1 when search term changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  // Calculate paginated data
  const paginatedProducts = filteredProducts.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  // Calculate total pages
  const totalPages = Math.ceil(filteredProducts.length / rowsPerPage);

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 3 },
        backgroundColor: '#020617',
        height: 'calc(100vh - 64px)',
        overflow: 'hidden',
        color: '#e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <Card
        sx={{
          backgroundColor: '#020617',
          borderRadius: 2,
          border: '1px solid rgba(148, 163, 184, 0.25)',
          boxShadow: '0 20px 45px rgba(15,23,42,0.85)',
          p: { xs: 2, md: 3 },
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            flexShrink: 0,
          }}
        >
          <Typography variant="h5" fontWeight={700} sx={{ color: '#e5e7eb' }}>
            Product List
          </Typography>
        </Box>

        {/* Search Bar */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexShrink: 0 }}>
              <TextField
                fullWidth
            placeholder="Search by Product Name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#9ca3af' }} />
                    </InputAdornment>
                  ),
              sx: {
                  color: '#e5e7eb',
                backgroundColor: '#0f2339',
                borderRadius: 1,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(148, 163, 184, 0.3)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(148, 163, 184, 0.5)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#0ea5e9',
                },
              },
            }}
          />
        </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

        {/* Products Table */}
        <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <TableContainer
            component={Paper}
            sx={{
              backgroundColor: '#0f172a',
              borderRadius: 2,
              border: '1px solid rgba(148, 163, 184, 0.25)',
              flexGrow: 1,
              overflow: 'auto',
              minHeight: 0,
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    backgroundColor: '#1e293b',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  Sr. No.
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: '#1e293b',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  Product Name
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: '#1e293b',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  Category
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: '#1e293b',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  Available Quantity
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: '#1e293b',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  Purchase Price
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: '#1e293b',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  Selling Price
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: '#1e293b',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  MRP
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: '#1e293b',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  Created Date
                </TableCell>
                <TableCell
                  sx={{
                    backgroundColor: '#1e293b',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                    textAlign: 'center',
                  }}
                >
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
          {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={40} sx={{ color: '#0ea5e9' }} />
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4, color: '#9ca3af' }}>
                    {searchTerm ? `No products found matching "${searchTerm}"` : 'No products found'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProducts.map((product, index) => (
                  <TableRow
                    key={product.product_id}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(148, 163, 184, 0.05)',
                      },
                      borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                    }}
                  >
                    <TableCell sx={{ color: '#e5e7eb' }}>
                      {(page - 1) * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell sx={{ color: '#e5e7eb' }}>
                      {product.product_name || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ color: '#e5e7eb' }}>
                      {product.category || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ color: '#e5e7eb' }}>
                      {productQuantities[product.product_id] !== undefined
                        ? `${productQuantities[product.product_id].toFixed(2)} ${product.unit || ''}`
                        : 'Loading...'}
                    </TableCell>
                    <TableCell sx={{ color: '#e5e7eb' }}>
                      {latestBatchPricing[product.product_id]?.purchase_price !== undefined && latestBatchPricing[product.product_id]?.purchase_price !== null
                        ? `₹${parseFloat(latestBatchPricing[product.product_id].purchase_price).toFixed(2)}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell sx={{ color: '#e5e7eb' }}>
                      {latestBatchPricing[product.product_id]?.selling_price !== undefined && latestBatchPricing[product.product_id]?.selling_price !== null
                        ? `₹${parseFloat(latestBatchPricing[product.product_id].selling_price).toFixed(2)}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell sx={{ color: '#e5e7eb' }}>
                      {latestBatchPricing[product.product_id]?.mrp !== undefined && latestBatchPricing[product.product_id]?.mrp !== null
                        ? `₹${parseFloat(latestBatchPricing[product.product_id].mrp).toFixed(2)}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell sx={{ color: '#e5e7eb' }}>
                      {formatDate(product.created_at)}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleViewProduct(product)}
                          sx={{
                            textTransform: 'none',
                            color: '#0ea5e9',
                            borderColor: '#0ea5e9',
                            '&:hover': {
                              borderColor: '#0284c7',
                              backgroundColor: 'rgba(14, 165, 233, 0.1)',
                            },
                          }}
                        >
                          View
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditProduct(product)}
                          sx={{
                            textTransform: 'none',
                            color: '#10b981',
                            borderColor: '#10b981',
                            '&:hover': {
                              borderColor: '#059669',
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            },
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<InventoryIcon />}
                          onClick={() => handleStockIn(product)}
                          sx={{
                            textTransform: 'none',
                            color: '#3b82f6',
                            borderColor: '#3b82f6',
                            '&:hover': {
                              borderColor: '#2563eb',
                              backgroundColor: 'rgba(192, 193, 194, 0.1)',
                            },
                          }}
                        >
                          Stock In
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<LocalShippingIcon />}
                          onClick={() => handleStockOut(product)}
                          sx={{
                            textTransform: 'none',
                            color: '#f59e0b',
                            borderColor: '#f59e0b',
                            '&:hover': {
                              borderColor: '#d97706',
                              backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            },
                          }}
                        >
                          Stock Out
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        </Box>

        {/* Pagination */}
        {!loading && filteredProducts.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              mt: 3,
              mb: 2,
              flexShrink: 0,
            }}
          >
            <Pagination
              count={totalPages}
              page={page}
              onChange={(event, value) => setPage(value)}
              color="primary"
              sx={{
                '& .MuiPaginationItem-root': {
                  color: '#e5e7eb',
                  '&.Mui-selected': {
                    backgroundColor: '#0ea5e9',
                    color: '#fff',
                    '&:hover': {
                      backgroundColor: '#0284c7',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(148, 163, 184, 0.1)',
                  },
                },
                '& .MuiPaginationItem-ellipsis': {
                  color: '#9ca3af',
                },
              }}
            />
          </Box>
        )}
      </Card>

      {/* Product Detail Modal */}
      <Dialog
        open={viewModalOpen}
        onClose={handleCloseModal}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#0f172a',
            color: '#e5e7eb',
            borderRadius: 2,
            border: '1px solid rgba(148, 163, 184, 0.25)',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            pb: 2,
            color: '#e5e7eb',
            fontWeight: 600,
          }}
        >
          <Typography variant="h6" fontWeight={700} sx={{ color: '#e5e7eb' }}>
            Product Details
          </Typography>
          <IconButton
            onClick={handleCloseModal}
            sx={{
              color: '#9ca3af',
              '&:hover': {
                backgroundColor: 'rgba(148, 163, 184, 0.1)',
                color: '#e5e7eb',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            pt: 3,
            overflowY: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {selectedProduct && (
            <>
              <Box sx={{ mb: 3, mt: 2, pb: 2, borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>
                  Product: <strong style={{ color: '#e5e7eb' }}>{selectedProduct.product_name}</strong> | 
                  Category: <strong style={{ color: '#e5e7eb' }}>{selectedProduct.category || 'N/A'}</strong> | 
                  MRP: <strong style={{ color: '#22d3ee' }}>₹{selectedProduct.mrp ? parseFloat(selectedProduct.mrp).toFixed(2) : 'N/A'}</strong>
                </Typography>
              </Box>

              {/* Tab Buttons */}
              <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant={activeStockTab === 'stock' ? 'contained' : 'outlined'}
                  onClick={() => setActiveStockTab('stock')}
                  sx={{
                    textTransform: 'none',
                    backgroundColor: activeStockTab === 'stock' ? '#0ea5e9' : 'transparent',
                    color: activeStockTab === 'stock' ? '#ffffff' : '#9ca3af',
                    borderColor: '#0ea5e9',
                    '&:hover': {
                      backgroundColor: activeStockTab === 'stock' ? '#0284c7' : 'rgba(14, 165, 233, 0.1)',
                      borderColor: '#0ea5e9',
                    },
                  }}
                >
                  Stock
                </Button>
                <Button
                  variant={activeStockTab === 'stockIn' ? 'contained' : 'outlined'}
                  onClick={() => setActiveStockTab('stockIn')}
                  sx={{
                    textTransform: 'none',
                    backgroundColor: activeStockTab === 'stockIn' ? '#0ea5e9' : 'transparent',
                    color: activeStockTab === 'stockIn' ? '#ffffff' : '#9ca3af',
                    borderColor: '#0ea5e9',
                    '&:hover': {
                      backgroundColor: activeStockTab === 'stockIn' ? '#0284c7' : 'rgba(14, 165, 233, 0.1)',
                      borderColor: '#0ea5e9',
                    },
                  }}
                >
                  Stock In History
                </Button>
                <Button
                  variant={activeStockTab === 'stockOut' ? 'contained' : 'outlined'}
                  onClick={() => setActiveStockTab('stockOut')}
                  sx={{
                    textTransform: 'none',
                    backgroundColor: activeStockTab === 'stockOut' ? '#0ea5e9' : 'transparent',
                    color: activeStockTab === 'stockOut' ? '#ffffff' : '#9ca3af',
                    borderColor: '#0ea5e9',
                    '&:hover': {
                      backgroundColor: activeStockTab === 'stockOut' ? '#0284c7' : 'rgba(14, 165, 233, 0.1)',
                      borderColor: '#0ea5e9',
                    },
                  }}
                >
                  Stock Out History
                </Button>
              </Box>

              {/* Stock Tab - Current Stock */}
              {activeStockTab === 'stock' && (
                <>
                  {loadingBatches ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress size={40} sx={{ color: '#0ea5e9' }} />
                    </Box>
                  ) : productBatches.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                        No batch-wise inventory available for this product
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer
                      component={Paper}
                      sx={{
                        backgroundColor: '#0f172a',
                        borderRadius: 2,
                        border: '1px solid rgba(148, 163, 184, 0.25)',
                      }}
                    >
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                              Date and Time
                            </TableCell>
                            <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                              Batch Name
                            </TableCell>
                            <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                              Available Quantity
                            </TableCell>
                            <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                              MRP
                            </TableCell>
                            <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                              Purchase Price
                            </TableCell>
                            <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                              Selling Price
                            </TableCell>
                            <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                              Expiry Date
                            </TableCell>
                            <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                              Status
                            </TableCell>
                            <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                              Action
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {productBatches.map((batch, index) => (
                            <TableRow
                              key={batch.batch_id || index}
                              sx={{
                                '&:hover': { backgroundColor: 'rgba(148, 163, 184, 0.05)' },
                                borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                                backgroundColor: batch.is_expired ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                              }}
                            >
                              <TableCell sx={{ color: '#e5e7eb' }}>
                                {batch.created_at ? new Date(batch.created_at).toLocaleString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'N/A'}
                              </TableCell>
                              <TableCell sx={{ color: '#e5e7eb' }}>
                                {batch.batch_name || 'N/A'}
                              </TableCell>
                              <TableCell sx={{ color: '#e5e7eb', fontWeight: 500 }}>
                                {batch.available_quantity !== undefined 
                                  ? `${Number(batch.available_quantity).toFixed(2)} ${selectedProduct.unit || ''}`
                                  : 'N/A'}
                              </TableCell>
                              <TableCell sx={{ color: '#e5e7eb' }}>
                                {batch.mrp ? `₹${Number(batch.mrp).toFixed(2)}` : 'N/A'}
                              </TableCell>
                              <TableCell sx={{ color: '#e5e7eb' }}>
                                {batch.purchase_price ? `₹${Number(batch.purchase_price).toFixed(2)}` : 'N/A'}
                              </TableCell>
                              <TableCell sx={{ color: '#e5e7eb' }}>
                                {batch.selling_price ? `₹${Number(batch.selling_price).toFixed(2)}` : 'N/A'}
                              </TableCell>
                              <TableCell sx={{ color: batch.is_expired ? '#ef4444' : '#e5e7eb' }}>
                                {batch.expiry_date ? formatDate(batch.expiry_date) : 'N/A'}
                              </TableCell>
                              <TableCell sx={{ color: '#e5e7eb' }}>
                                {batch.is_expired ? (
                                  <Typography variant="body2" sx={{ color: '#ef4444', fontWeight: 500 }}>
                                    Expired
                                  </Typography>
                                ) : batch.days_until_expiry !== null && batch.days_until_expiry < 15 ? (
                                  <Typography variant="body2" sx={{ color: '#f59e0b', fontWeight: 500 }}>
                                    Near Expiry
                                  </Typography>
                                ) : (
                                  <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 500 }}>
                                    Active
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell sx={{ color: '#e5e7eb' }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    textTransform: 'none',
                                    borderColor: '#0ea5e9',
                                    color: '#0ea5e9',
                                    '&:hover': {
                                      borderColor: '#0284c7',
                                      backgroundColor: 'rgba(14, 165, 233, 0.1)',
                                    },
                                  }}
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              )}

              {/* Stock In History Tab */}
              {activeStockTab === 'stockIn' && (() => {
                // Filter stock in history to only show batches with available quantity > 0
                const filteredStockInHistory = stockInHistory.filter((transaction) => {
                  const batchInfo = transaction.batch_info || {};
                  // Find the corresponding batch from productBatches to get current available_quantity
                  const batchId = transaction.batch || batchInfo.batch_id;
                  const batchName = transaction.batch_name || batchInfo.batch_name;
                  const matchingBatch = productBatches.find(b => 
                    (batchId && b.batch_id === batchId) || 
                    (batchName && b.batch_name === batchName)
                  );
                  // Use available_quantity from matching batch, fallback to batch_info, then transaction quantity
                  const availableQty = matchingBatch?.available_quantity !== undefined 
                    ? matchingBatch.available_quantity 
                    : (batchInfo.available_quantity !== undefined 
                        ? batchInfo.available_quantity 
                        : transaction.quantity);
                  // Only show batches with available quantity greater than 0
                  return availableQty !== undefined && availableQty !== null && Number(availableQty) > 0;
                });

                return (
                  <>
                    {loadingTransactions ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={40} sx={{ color: '#0ea5e9' }} />
                      </Box>
                    ) : filteredStockInHistory.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                          No stock in history available for this product
                        </Typography>
                      </Box>
                    ) : (
                      <TableContainer
                        component={Paper}
                        sx={{
                          backgroundColor: '#0f172a',
                          borderRadius: 2,
                          border: '1px solid rgba(148, 163, 184, 0.25)',
                        }}
                      >
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                                Date and Time
                              </TableCell>
                              <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                                Batch Name
                              </TableCell>
                              <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                                Available Quantity
                              </TableCell>
                              <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                                MRP
                              </TableCell>
                              <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                                Purchase Price
                              </TableCell>
                              <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                                Selling Price
                              </TableCell>
                              <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                                Expiry Date
                              </TableCell>
                              <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                                Status
                              </TableCell>
                              <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                                Action
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {filteredStockInHistory.map((transaction, index) => {
                            const batchInfo = transaction.batch_info || {};
                            // Find the corresponding batch from productBatches to get current available_quantity
                            const batchId = transaction.batch || batchInfo.batch_id;
                            const batchName = transaction.batch_name || batchInfo.batch_name;
                            const matchingBatch = productBatches.find(b => 
                              (batchId && b.batch_id === batchId) || 
                              (batchName && b.batch_name === batchName)
                            );
                            // Use available_quantity from matching batch, fallback to batch_info, then transaction quantity
                            const availableQty = matchingBatch?.available_quantity !== undefined 
                              ? matchingBatch.available_quantity 
                              : (batchInfo.available_quantity !== undefined 
                                  ? batchInfo.available_quantity 
                                  : transaction.quantity);
                            return (
                              <TableRow
                                key={transaction.transaction_id || index}
                                sx={{
                                  '&:hover': { backgroundColor: 'rgba(148, 163, 184, 0.05)' },
                                  borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                                }}
                              >
                                <TableCell sx={{ color: '#e5e7eb' }}>
                                  {transaction.created_at ? new Date(transaction.created_at).toLocaleString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : 'N/A'}
                                </TableCell>
                                <TableCell sx={{ color: '#e5e7eb' }}>
                                  {transaction.batch_name || batchInfo.batch_name || 'N/A'}
                                </TableCell>
                                <TableCell sx={{ color: '#e5e7eb', fontWeight: 500 }}>
                                  {availableQty !== undefined && availableQty !== null 
                                    ? `${Number(availableQty).toFixed(2)} ${selectedProduct.unit || ''}` 
                                    : 'N/A'}
                                </TableCell>
                                <TableCell sx={{ color: '#e5e7eb' }}>
                                  {batchInfo.mrp ? `₹${Number(batchInfo.mrp).toFixed(2)}` : 'N/A'}
                                </TableCell>
                                <TableCell sx={{ color: '#e5e7eb' }}>
                                  {batchInfo.purchase_price ? `₹${Number(batchInfo.purchase_price).toFixed(2)}` : 'N/A'}
                                </TableCell>
                                <TableCell sx={{ color: '#e5e7eb' }}>
                                  {batchInfo.selling_price ? `₹${Number(batchInfo.selling_price).toFixed(2)}` : 'N/A'}
                                </TableCell>
                                <TableCell sx={{ color: '#e5e7eb' }}>
                                  {batchInfo.expiry_date ? formatDate(batchInfo.expiry_date) : 'N/A'}
                                </TableCell>
                                <TableCell sx={{ color: '#e5e7eb' }}>
                                  {(() => {
                                    // Calculate days until expiry for status
                                    let daysUntilExpiry = null;
                                    const expiryDate = matchingBatch?.expiry_date || batchInfo.expiry_date;
                                    
                                    if (expiryDate) {
                                      const expiry = new Date(expiryDate);
                                      const today = new Date();
                                      today.setHours(0, 0, 0, 0);
                                      expiry.setHours(0, 0, 0, 0);
                                      const diffTime = expiry - today;
                                      daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    }
                                    
                                    const isExpired = matchingBatch?.is_expired || (daysUntilExpiry !== null && daysUntilExpiry < 0);
                                    
                                    if (isExpired) {
                                      return (
                                        <Typography variant="body2" sx={{ color: '#ef4444', fontWeight: 500 }}>
                                          Expired
                                        </Typography>
                                      );
                                    } else if (daysUntilExpiry !== null && daysUntilExpiry < 15) {
                                      return (
                                        <Typography variant="body2" sx={{ color: '#f59e0b', fontWeight: 500 }}>
                                          Near Expiry
                                        </Typography>
                                      );
                                    } else {
                                      return (
                                        <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 500 }}>
                                          Active
                                        </Typography>
                                      );
                                    }
                                  })()}
                                </TableCell>
                                <TableCell sx={{ color: '#e5e7eb' }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      textTransform: 'none',
                                      borderColor: '#0ea5e9',
                                      color: '#0ea5e9',
                                      '&:hover': {
                                        borderColor: '#0284c7',
                                        backgroundColor: 'rgba(14, 165, 233, 0.1)',
                                      },
                                    }}
                                  >
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </>
                );
              })()}

              {/* Stock Out History Tab */}
              {activeStockTab === 'stockOut' && (
                <>
                  {loadingTransactions ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress size={40} sx={{ color: '#0ea5e9' }} />
                    </Box>
                  ) : stockOutHistory.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                        No stock out history available for this product
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer
                      component={Paper}
                      sx={{
                        backgroundColor: '#0f172a',
                        borderRadius: 2,
                        border: '1px solid rgba(148, 163, 184, 0.25)',
                      }}
                    >
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                              Date and Time
                            </TableCell>
                            <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                              Batch Name
                            </TableCell>
                            <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                              Available Quantity
                            </TableCell>
                            <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                              MRP
                            </TableCell>
                            <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                              Purchase Price
                            </TableCell>
                            <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                              Selling Price
                            </TableCell>
                            <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                              Expiry Date
                            </TableCell>
                            <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                              Status
                            </TableCell>
                            <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                              Reason
                            </TableCell>
                            <TableCell sx={{ backgroundColor: '#1e293b', color: '#e5e7eb', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                              Action
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {stockOutHistory.map((transaction, index) => {
                            const batchInfo = transaction.batch_info || {};
                            return (
                              <TableRow
                                key={transaction.transaction_id || index}
                                sx={{
                                  '&:hover': { backgroundColor: 'rgba(148, 163, 184, 0.05)' },
                                  borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                                }}
                              >
                                <TableCell sx={{ color: '#e5e7eb' }}>
                                  {transaction.created_at ? new Date(transaction.created_at).toLocaleString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : 'N/A'}
                                </TableCell>
                                <TableCell sx={{ color: '#e5e7eb' }}>
                                  {transaction.batch_name || batchInfo.batch_name || 'N/A'}
                                </TableCell>
                                <TableCell sx={{ color: '#e5e7eb', fontWeight: 500 }}>
                                  {transaction.quantity ? `${Number(transaction.quantity).toFixed(2)} ${selectedProduct.unit || ''}` : 'N/A'}
                                </TableCell>
                                <TableCell sx={{ color: '#e5e7eb' }}>
                                  {batchInfo.mrp ? `₹${Number(batchInfo.mrp).toFixed(2)}` : 'N/A'}
                                </TableCell>
                                <TableCell sx={{ color: '#e5e7eb' }}>
                                  {batchInfo.purchase_price ? `₹${Number(batchInfo.purchase_price).toFixed(2)}` : 'N/A'}
                                </TableCell>
                                <TableCell sx={{ color: '#e5e7eb' }}>
                                  {batchInfo.selling_price ? `₹${Number(batchInfo.selling_price).toFixed(2)}` : 'N/A'}
                                </TableCell>
                                <TableCell sx={{ color: '#e5e7eb' }}>
                                  {batchInfo.expiry_date ? formatDate(batchInfo.expiry_date) : 'N/A'}
                                </TableCell>
                                <TableCell sx={{ color: '#e5e7eb' }}>
                                  <Typography variant="body2" sx={{ color: '#ef4444', fontWeight: 500 }}>
                                    Stock Out
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ color: '#e5e7eb' }}>
                                  {transaction.reason || 'N/A'}
                                </TableCell>
                                <TableCell sx={{ color: '#e5e7eb' }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      textTransform: 'none',
                                      borderColor: '#0ea5e9',
                                      color: '#0ea5e9',
                                      '&:hover': {
                                        borderColor: '#0284c7',
                                        backgroundColor: 'rgba(14, 165, 233, 0.1)',
                                      },
                                    }}
                                  >
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button
            onClick={handleCloseModal}
            variant="contained"
            sx={{
              textTransform: 'none',
              backgroundColor: '#0ea5e9',
              '&:hover': { backgroundColor: '#0284c7' },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stock In Modal */}
      <Dialog
        open={stockInModalOpen}
        onClose={handleCloseStockInModal}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#0f172a',
            color: '#e5e7eb',
            borderRadius: 2,
            border: '1px solid rgba(148, 163, 184, 0.25)',
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            color: '#e5e7eb',
            fontWeight: 600,
            pb: 2,
            fontSize: '1.25rem',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
          <Typography variant="h6" fontWeight={700} sx={{ color: '#e5e7eb' }}>
            STOCK IN
          </Typography>
          <IconButton
            onClick={handleCloseStockInModal}
            sx={{
              color: '#9ca3af',
              '&:hover': {
                backgroundColor: 'rgba(148, 163, 184, 0.1)',
                color: '#e5e7eb',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            pt: 3,
            px: 3,
            overflowY: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {stockInError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setStockInError('')}>
              {stockInError}
            </Alert>
          )}

          {loadingStockInData ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box
              component="form"
              onSubmit={handleStockInSubmit}
                  sx={{
                    display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {/* Product - Pre-selected and disabled */}
              <Box>
                <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>
                  Product <span style={{ color: '#ef4444' }}>*</span>
                </Typography>
                <TextField
                  select
                  fullWidth
                  name="product"
                  value={stockInFormData.product}
                  onChange={handleStockInChange}
                  size="small"
                  required
                  disabled={true}
                  SelectProps={{
                    sx: { color: '#e5e7eb' },
                    displayEmpty: true,
                    renderValue: (selected) => {
                      if (!selected) {
                        return <em style={{ color: '#9ca3af' }}>Select Product</em>;
                      }
                      // First try to use the stored product name (set immediately on modal open)
                      const productNameToDisplay = selectedProductName || (() => {
                        // Fallback: Find product name from stockInProducts array
                        const selectedProduct = stockInProducts.find(p => 
                          p.product_id.toString() === selected.toString() || 
                          p.product_id === parseInt(selected)
                        );
                        return selectedProduct ? selectedProduct.product_name : selected || 'Product';
                      })();
                      
                      // Return product name with white color styling
                      return <span style={{ color: '#ffffff' }}>{productNameToDisplay}</span>;
                    },
                    MenuProps: {
                      PaperProps: {
                        sx: {
                          backgroundColor: '#1e293b',
                          color: '#e5e7eb',
                        },
                      },
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#0f2339',
                      color: '#ffffff',
                      borderRadius: 1,
                      cursor: 'not-allowed',
                      '& .MuiOutlinedInput-input': {
                        color: '#ffffff !important',
                      },
                      '& .MuiSelect-select': {
                        color: '#ffffff !important',
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(148, 163, 184, 0.3)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(148, 163, 184, 0.3)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(148, 163, 184, 0.3)',
                      },
                      '&.Mui-disabled': {
                        color: '#ffffff !important',
                        '& .MuiOutlinedInput-input': {
                          color: '#ffffff !important',
                          '-webkit-text-fill-color': '#ffffff !important',
                        },
                        '& .MuiSelect-select': {
                          color: '#ffffff !important',
                          '-webkit-text-fill-color': '#ffffff !important',
                        },
                      },
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>Select Product</em>
                  </MenuItem>
                  {stockInProducts.map((p) => (
                    <MenuItem key={p.product_id} value={p.product_id}>
                      {p.product_name}
                    </MenuItem>
                  ))}
                </TextField>
                </Box>

              <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.4)' }} />

              {/* Category - Active after product selection */}
              {stockInFormData.product && (
                <Box>
                  <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>
                    Category (Optional)
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    name="category"
                    value={stockInFormData.category}
                    onChange={handleStockInChange}
                    size="small"
                    disabled={loadingCategories}
                    SelectProps={{
                      sx: { color: '#e5e7eb' },
                      displayEmpty: true,
                      renderValue: (selected) => {
                        if (!selected) {
                          return <em style={{ color: '#9ca3af' }}>Select Category</em>;
                        }
                        return selected;
                      },
                      MenuProps: {
                        PaperProps: {
                          sx: {
                            backgroundColor: '#1e293b',
                            color: '#e5e7eb',
                          },
                        },
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#0f2339',
                        borderRadius: 1,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(148, 163, 184, 0.3)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(148, 163, 184, 0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#10b981',
                        },
                      },
                    }}
                  >
                    <MenuItem value="">
                      <em>Select Category</em>
                    </MenuItem>
                    {categories.map((cat) => (
                      <MenuItem key={cat.category_id} value={cat.category_name}>
                        {cat.category_name}
                      </MenuItem>
                    ))}
                    {categories.length === 0 && !loadingCategories && (
                      <MenuItem value="" disabled>
                        No categories found
                      </MenuItem>
                    )}
                  </TextField>
                </Box>
              )}

              <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.4)' }} />

              {/* Batch and Quantity */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                <Box>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>
                      Batch <span style={{ color: '#ef4444' }}>*</span>
                  </Typography>
                    <TextField
                      select
                      fullWidth
                      name="batch"
                      value={stockInFormData.batch}
                      onChange={handleStockInChange}
                      size="small"
                      required
                      disabled={loadingStockInBatches || !stockInFormData.product}
                      SelectProps={{
                        sx: { color: '#e5e7eb' },
                        displayEmpty: true,
                        renderValue: (selected) => {
                          if (!selected) {
                            return <em style={{ color: '#9ca3af' }}>Select Batch</em>;
                          }
                          return selected;
                        },
                        MenuProps: {
                          PaperProps: {
                            sx: {
                              backgroundColor: '#1e293b',
                              color: '#e5e7eb',
                            },
                          },
                        },
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#0f2339',
                          borderRadius: 1,
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(148, 163, 184, 0.3)',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(148, 163, 184, 0.5)',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#10b981',
                          },
                        },
                      }}
                    >
                      <MenuItem value="">
                        <em>Select Batch</em>
                      </MenuItem>
                      {stockInBatches.map((b, idx) => {
                          const availableQty = b.available_quantity ?? b.quantity ?? b.current_stock;
                          return (
                            <MenuItem 
                              key={`${b.batch_name}-${idx}`} 
                              value={b.batch_name}
                            >
                              {b.batch_name} {availableQty !== undefined ? `(Available: ${Number(availableQty).toFixed(2)})` : ''}
                            </MenuItem>
                          );
                        })}
                      {stockInBatches.length === 0 && !loadingStockInBatches && (
                        <MenuItem value="" disabled>
                          No batches available for this product
                        </MenuItem>
                      )}
                    </TextField>
                    {selectedBatchStock !== null && (
                      <Typography variant="body2" sx={{ color: '#9ca3af', mt: 0.5 }}>
                        Available quantity for batch: {Number(selectedBatchStock).toFixed(2)}
                  </Typography>
                    )}
                </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>
                      Quantity <span style={{ color: '#ef4444' }}>*</span>
                    </Typography>
                    <TextField
                      fullWidth
                      name="quantity"
                      type="number"
                      size="small"
                      value={stockInFormData.quantity}
                      onChange={handleStockInChange}
                      required
                      disabled={!stockInFormData.batch || stockInFormData.batch.trim() === ''}
                      readOnly={stockInFormData.batch && stockInFormData.batch.trim() !== ''}
                      InputProps={{
                        readOnly: stockInFormData.batch && stockInFormData.batch.trim() !== '',
                        sx: {
                          color: '#e5e7eb',
                          backgroundColor: '#0f2339',
                          borderRadius: 1,
                          cursor: 'not-allowed',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(148, 163, 184, 0.3)',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(148, 163, 184, 0.3)',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#10b981',
                          },
                        },
                      }}
                      helperText={
                        !stockInFormData.batch || stockInFormData.batch.trim() === ''
                          ? 'Please select a batch first'
                          : 'Quantity is automatically fetched from the selected batch (read-only)'
                      }
                      FormHelperTextProps={{
                        sx: { color: '#9ca3af', fontSize: '0.75rem' },
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>

              {/* Manufacturing Date and Expiry Date */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>
                      Manufacturing Date <span style={{ color: '#ef4444' }}>*</span>
                    </Typography>
                    <TextField
                      fullWidth
                      name="manufacturing_date"
                      type="date"
                      size="small"
                      value={stockInFormData.manufacturing_date}
                      onChange={handleStockInChange}
                      required
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        sx: {
                          color: '#e5e7eb',
                          backgroundColor: '#0f2339',
                          borderRadius: 1,
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(148, 163, 184, 0.3)',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(148, 163, 184, 0.5)',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#10b981',
                          },
                        },
                      }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>
                      Expiry Date <span style={{ color: '#ef4444' }}>*</span>
                    </Typography>
                    <TextField
                      fullWidth
                      name="expiry_date"
                      type="date"
                      size="small"
                      value={stockInFormData.expiry_date}
                      onChange={handleStockInChange}
                      required
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        sx: {
                          color: '#e5e7eb',
                          backgroundColor: '#0f2339',
                          borderRadius: 1,
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(148, 163, 184, 0.3)',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(148, 163, 184, 0.5)',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#10b981',
                          },
                        },
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>

              {/* Reason and Reference ID */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>
                      Reason
                    </Typography>
                    <TextField
                      select
                      fullWidth
                      name="reason"
                      value={stockInFormData.reason}
                      onChange={handleStockInChange}
                      size="small"
                      SelectProps={{
                        sx: { color: '#e5e7eb' },
                        MenuProps: {
                          PaperProps: {
                            sx: {
                              backgroundColor: '#1e293b',
                              color: '#e5e7eb',
                            },
                          },
                        },
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#0f2339',
                          borderRadius: 1,
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(148, 163, 184, 0.3)',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(148, 163, 184, 0.5)',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#10b981',
                          },
                        },
                      }}
                    >
                      <MenuItem value="Purchase">Purchase</MenuItem>
                      <MenuItem value="Manual Adjustment">Manual Adjustment</MenuItem>
                      <MenuItem value="Return">Return</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </TextField>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>
                      Reference ID (Optional)
                    </Typography>
                    <TextField
                      fullWidth
                      name="reference_id"
                      placeholder="e.g., Invoice number"
                      size="small"
                      value={stockInFormData.reference_id}
                      onChange={handleStockInChange}
                      InputProps={{
                        sx: {
                          color: '#e5e7eb',
                          backgroundColor: '#0f2339',
                          borderRadius: 1,
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(148, 163, 184, 0.3)',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(148, 163, 184, 0.5)',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#10b981',
                          },
                        },
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>

              {/* Date */}
              <Box>
                <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>
                  Date <span style={{ color: '#ef4444' }}>*</span>
                </Typography>
                <TextField
                  fullWidth
                  name="date"
                  type="date"
                  size="small"
                  value={stockInFormData.date}
                  onChange={handleStockInChange}
                  required
                  InputProps={{
                    sx: {
                      color: '#e5e7eb',
                      backgroundColor: '#0f2339',
                      borderRadius: 1,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(148, 163, 184, 0.3)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(148, 163, 184, 0.5)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#10b981',
                      },
                    },
                  }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
                  <Button
            onClick={handleCloseStockInModal}
            variant="outlined"
            sx={{
              textTransform: 'none',
              color: '#e5e7eb',
              borderColor: 'rgba(148, 163, 184, 0.3)',
              '&:hover': {
                borderColor: '#0ea5e9',
                color: '#0ea5e9',
              },
            }}
          >
            Cancel
                  </Button>
                  <Button
            type="submit"
            variant="contained"
            onClick={handleStockInSubmit}
            disabled={loadingStockIn}
            sx={{
              textTransform: 'none',
              backgroundColor: '#0ea5e9',
              '&:hover': { backgroundColor: '#0284c7' },
            }}
          >
            {loadingStockIn ? 'Adding...' : 'Add Stock'}
                  </Button>
        </DialogActions>
      </Dialog>

      {/* Stock Out Modal */}
      <Dialog
        open={stockOutModalOpen}
        onClose={handleCloseStockOutModal}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#0f172a',
            color: '#e5e7eb',
            borderRadius: 2,
            border: '1px solid rgba(148, 163, 184, 0.25)',
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            color: '#e5e7eb',
            fontWeight: 600,
            pb: 2,
            fontSize: '1.25rem',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6" fontWeight={700} sx={{ color: '#e5e7eb' }}>
            STOCK OUT
          </Typography>
          <IconButton
            onClick={handleCloseStockOutModal}
            sx={{
              color: '#9ca3af',
              '&:hover': {
                backgroundColor: 'rgba(148, 163, 184, 0.1)',
                color: '#e5e7eb',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            pt: 3,
            px: 3,
            overflowY: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {stockOutError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setStockOutError('')}>
              {stockOutError}
            </Alert>
          )}

          {loadingStockOutData ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box
              component="form"
              onSubmit={handleStockOutSubmit}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {/* Product */}
              <Box>
                <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>
                  Product <span style={{ color: '#ef4444' }}>*</span>
                </Typography>
                <TextField
                  select
                  fullWidth
                  name="product"
                  value={stockOutFormData.product}
                  onChange={handleStockOutChange}
                    size="small"
                  required
                  SelectProps={{
                    sx: { color: '#e5e7eb' },
                    MenuProps: {
                      PaperProps: {
                        sx: {
                          backgroundColor: '#1e293b',
                          color: '#e5e7eb',
                        },
                      },
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#0f2339',
                      color: '#e5e7eb',
                      borderRadius: 1,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(148, 163, 184, 0.3)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(148, 163, 184, 0.5)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#f59e0b',
                      },
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>Select Product</em>
                  </MenuItem>
                  {stockOutProducts.map((p) => (
                    <MenuItem key={p.product_id} value={p.product_id}>
                      {p.product_name} (ID: {p.product_id})
                    </MenuItem>
                  ))}
                </TextField>
                </Box>

              <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.4)' }} />

              {/* Batch and Quantity */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>
                      Batch <span style={{ color: '#ef4444' }}>*</span>
                    </Typography>
                    <TextField
                      select
                      fullWidth
                      name="batch"
                      value={stockOutFormData.batch}
                      onChange={handleStockOutChange}
                      size="small"
                      required
                      disabled={loadingStockOutBatches || !stockOutFormData.product}
                      SelectProps={{
                        sx: { color: '#e5e7eb' },
                        displayEmpty: true,
                        renderValue: (selected) => {
                          if (!selected) {
                            return <em style={{ color: '#9ca3af' }}>Select Batch</em>;
                          }
                          return selected;
                        },
                        MenuProps: {
                          PaperProps: {
                            sx: {
                              backgroundColor: '#1e293b',
                              color: '#e5e7eb',
                            },
                          },
                        },
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#0f2339',
                          borderRadius: 1,
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(148, 163, 184, 0.3)',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(148, 163, 184, 0.5)',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#f59e0b',
                          },
                        },
                      }}
                    >
                      <MenuItem value="">
                        <em>Select Batch</em>
                      </MenuItem>
                      {loadingStockOutBatches ? (
                        <MenuItem value="" disabled>
                          Loading batches...
                        </MenuItem>
                      ) : stockOutBatches.length > 0 ? (
                        stockOutBatches.map((b, idx) => {
                          // Stock Out Batches API returns batch_id, batch_name, available_quantity, and expiry_date
                          // These are all batches that have been stocked in (available_quantity > 0)
                          const availableQty = b.available_quantity ?? 0;
                          const batchDisplayName = b.batch_name || `Batch ${b.batch_id || idx + 1}`;
                          
                          // Format expiry date if available
                          let expiryInfo = '';
                          if (b.expiry_date) {
                            const expiryDate = new Date(b.expiry_date);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            expiryDate.setHours(0, 0, 0, 0);
                            
                            const formattedDate = expiryDate.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            });
                            
                            // Check if expired
                            if (expiryDate < today) {
                              expiryInfo = ` - Expired: ${formattedDate}`;
                            } else {
                              expiryInfo = ` - Exp: ${formattedDate}`;
                            }
                          } else {
                            expiryInfo = ' - No expiry date';
                          }
                          
                          return (
                            <MenuItem 
                              key={b.batch_id ? `batch-${b.batch_id}` : `batch-${idx}`} 
                              value={b.batch_name || b.batch_id?.toString() || ''}
                            >
                              {batchDisplayName} (Available: {Number(availableQty).toFixed(2)}){expiryInfo}
                            </MenuItem>
                          );
                        })
                      ) : stockOutFormData.product ? (
                        <MenuItem value="" disabled>
                          No batches with available stock for this product
                        </MenuItem>
                      ) : (
                        <MenuItem value="" disabled>
                          Please select a product first
                        </MenuItem>
                      )}
                    </TextField>
                    {selectedBatchStockOut !== null && (
                      <Typography variant="body2" sx={{ color: '#9ca3af', mt: 0.5 }}>
                        Available quantity for batch: {Number(selectedBatchStockOut).toFixed(2)}
                      </Typography>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>
                      Quantity <span style={{ color: '#ef4444' }}>*</span>
                    </Typography>
                    <TextField
                      fullWidth
                      name="quantity"
                      type="number"
                      size="small"
                      value={stockOutFormData.quantity}
                      onChange={handleStockOutChange}
                      required
                      error={!!quantityError}
                      disabled={loadingAvailableStock || !stockOutFormData.product || !stockOutFormData.batch || stockOutFormData.batch.trim() === ''}
                      readOnly={stockOutFormData.batch && stockOutFormData.batch.trim() !== ''}
                      inputProps={{
                        min: 0,
                        max: selectedBatchStockOut !== null ? selectedBatchStockOut : (availableStock ? availableStock.available : undefined),
                        step: 0.01,
                      }}
                      InputProps={{
                        readOnly: stockOutFormData.batch && stockOutFormData.batch.trim() !== '',
                        sx: {
                          color: '#e5e7eb',
                          backgroundColor: '#0f2339',
                          borderRadius: 1,
                          cursor: stockOutFormData.batch && stockOutFormData.batch.trim() !== '' ? 'not-allowed' : 'text',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: quantityError ? '#ef4444' : 'rgba(148, 163, 184, 0.3)',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: quantityError ? '#ef4444' : (stockOutFormData.batch && stockOutFormData.batch.trim() !== '' ? 'rgba(148, 163, 184, 0.3)' : 'rgba(148, 163, 184, 0.5)'),
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: quantityError ? '#ef4444' : '#f59e0b',
                          },
                        },
                      }}
                      helperText={
                        quantityError ||
                        (!stockOutFormData.batch || stockOutFormData.batch.trim() === ''
                          ? 'Please select a batch first'
                          : stockOutFormData.batch && stockOutFormData.batch.trim() !== ''
                          ? 'Quantity is automatically fetched from the selected batch (read-only)'
                          : availableStock !== null
                          ? `Available: ${availableStock.available.toFixed(2)} ${availableStock.unit}`
                          : loadingAvailableStock
                          ? 'Loading available stock...'
                          : stockOutFormData.product
                          ? 'Select a product to see available stock'
                          : '')
                      }
                      FormHelperTextProps={{
                        sx: {
                          color: quantityError ? '#ef4444' : '#9ca3af',
                          fontSize: '0.75rem',
                        },
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>

              {/* Reason and Date */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>
                      Reason <span style={{ color: '#ef4444' }}>*</span>
                    </Typography>
                    <TextField
                      select
                      fullWidth
                      name="reason"
                      value={stockOutFormData.reason}
                      onChange={handleStockOutChange}
                      size="small"
                      required
                      SelectProps={{
                        sx: { color: '#e5e7eb' },
                        MenuProps: {
                          PaperProps: {
                            sx: {
                              backgroundColor: '#1e293b',
                              color: '#e5e7eb',
                            },
                          },
                        },
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#0f2339',
                          borderRadius: 1,
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(148, 163, 184, 0.3)',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(148, 163, 184, 0.5)',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#f59e0b',
                          },
                        },
                      }}
                    >
                      {stockOutReasons.map((r) => (
                        <MenuItem key={r} value={r}>
                          {r}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>
                      Date <span style={{ color: '#ef4444' }}>*</span>
                    </Typography>
                    <TextField
                      fullWidth
                      name="date"
                      type="date"
                      size="small"
                      value={stockOutFormData.date}
                      onChange={handleStockOutChange}
                      required
                      InputProps={{
                        sx: {
                          color: '#e5e7eb',
                          backgroundColor: '#0f2339',
                          borderRadius: 1,
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(148, 163, 184, 0.3)',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(148, 163, 184, 0.5)',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#f59e0b',
                          },
                        },
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
          <Button
            onClick={handleCloseStockOutModal}
            variant="outlined"
            sx={{
              textTransform: 'none',
              color: '#e5e7eb',
              borderColor: 'rgba(148, 163, 184, 0.3)',
              '&:hover': {
                borderColor: '#f59e0b',
                color: '#f59e0b',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            onClick={handleStockOutSubmit}
            disabled={loadingStockOut}
            sx={{
              textTransform: 'none',
              backgroundColor: '#f59e0b',
              '&:hover': { backgroundColor: '#d97706' },
            }}
          >
            {loadingStockOut ? 'Removing...' : 'Remove Stock'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Product Modal */}
      <Dialog
        open={editModalOpen}
        onClose={handleCloseEditModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#0f172a',
            color: '#e5e7eb',
            borderRadius: 2,
            border: '1px solid rgba(148, 163, 184, 0.25)',
          },
        }}
      >
        <DialogTitle 
          sx={{ 
            color: '#e5e7eb', 
            fontWeight: 600, 
            pb: 2,
            fontSize: '1.25rem',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6" fontWeight={700} sx={{ color: '#e5e7eb' }}>
            Edit Product
          </Typography>
          <IconButton
            onClick={handleCloseEditModal}
            sx={{
              color: '#9ca3af',
              '&:hover': {
                backgroundColor: 'rgba(148, 163, 184, 0.1)',
                color: '#e5e7eb',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent 
          sx={{ 
            pt: 3, 
            px: 3,
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {editError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setEditError('')}>
              {editError}
            </Alert>
          )}
          <form onSubmit={handleEditSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Product Name"
                name="product_name"
                value={editFormData.product_name}
                onChange={handleEditChange}
                required
                fullWidth
                InputLabelProps={{
                  sx: { color: '#9ca3af', mt: 2 },
                }}
                InputProps={{
                  sx: {
                    color: '#e5e7eb',
                    mt: 2,
                    backgroundColor: '#0f2339',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(148, 163, 184, 0.3)',
                    },
                  },
                }}
              />
              <TextField
                label="Category"
                name="category"
                value={editFormData.category}
                onChange={handleEditChange}
                fullWidth
                InputLabelProps={{
                  sx: { color: '#e5e7eb' },
                }}
                InputProps={{
                  sx: {
                    color: '#e5e7eb',
                    backgroundColor: '#0f2339',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(148, 163, 184, 0.3)',
                    },
                  },
                }}
              />
              <TextField
                label="Available Quantity"
                name="available_quantity"
                value={editFormData.available_quantity !== undefined ? `${Number(editFormData.available_quantity).toFixed(2)} ${selectedProduct?.unit || ''}` : 'N/A'}
                disabled
                fullWidth
                InputLabelProps={{
                  sx: { 
                    color: '#e5e7eb',
                    '&.Mui-disabled': {
                      color: '#e5e7eb',
                      opacity: 1,
                    },
                  },
                }}
                InputProps={{
                  sx: {
                    color: '#e5e7eb',
                    backgroundColor: '#0f2339',
                    cursor: 'not-allowed',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(148, 163, 184, 0.3)',
                    },
                    '&.Mui-disabled': {
                      color: '#e5e7eb',
                      opacity: 1,
                      WebkitTextFillColor: '#e5e7eb',
                      '& .MuiInputBase-input': {
                        color: '#e5e7eb',
                        WebkitTextFillColor: '#e5e7eb',
                      },
                    },
                  },
                }}
              />
              <TextField
                label="Purchase Price"
                name="purchase_price"
                type="number"
                value={editFormData.purchase_price}
                onChange={handleEditChange}
                fullWidth
                inputProps={{
                  step: 1,
                  min: 0,
                }}
                InputProps={{
                  startAdornment: <InputAdornment position="start" sx={{ color: '#9ca3af' }}>₹</InputAdornment>,
                  sx: {
                    color: '#e5e7eb',
                    backgroundColor: '#0f2339',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(148, 163, 184, 0.3)',
                    },
                  },
                }}
                InputLabelProps={{
                  sx: { color: '#9ca3af' },
                }}
              />
              <TextField
                label="Selling Price"
                name="sale_price"
                type="number"
                value={editFormData.sale_price}
                onChange={handleEditChange}
                fullWidth
                inputProps={{
                  step: 1,
                  min: 0,
                }}
                InputProps={{
                  startAdornment: <InputAdornment position="start" sx={{ color: '#9ca3af' }}>₹</InputAdornment>,
                  sx: {
                    color: '#e5e7eb',
                    backgroundColor: '#0f2339',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(148, 163, 184, 0.3)',
                    },
                  },
                }}
                InputLabelProps={{
                  sx: { color: '#9ca3af' },
                }}
              />
              <TextField
                label="MRP"
                name="mrp"
                type="number"
                value={editFormData.mrp}
                onChange={handleEditChange}
                fullWidth
                inputProps={{
                  step: 1,
                  min: 0,
                }}
                InputProps={{
                  startAdornment: <InputAdornment position="start" sx={{ color: '#9ca3af' }}>₹</InputAdornment>,
                  sx: {
                    color: '#e5e7eb',
                    backgroundColor: '#0f2339',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(148, 163, 184, 0.3)',
                    },
                  },
                }}
                InputLabelProps={{
                  sx: { color: '#9ca3af' },
                }}
              />
              <TextField
                label="Created Date"
                name="created_at"
                value={editFormData.created_at ? formatDate(editFormData.created_at) : 'N/A'}
                disabled
                fullWidth
                InputLabelProps={{
                  sx: { 
                    color: '#e5e7eb',
                    '&.Mui-disabled': {
                      color: '#e5e7eb',
                      opacity: 1,
                    },
                  },
                }}
                InputProps={{
                  sx: {
                    color: '#e5e7eb',
                    backgroundColor: '#0f2339',
                    cursor: 'not-allowed',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(148, 163, 184, 0.3)',
                    },
                    '&.Mui-disabled': {
                      color: '#e5e7eb',
                      opacity: 1,
                      WebkitTextFillColor: '#e5e7eb',
                      '& .MuiInputBase-input': {
                        color: '#e5e7eb',
                        WebkitTextFillColor: '#e5e7eb',
                      },
                    },
                  },
                }}
              />
            </Stack>
          </form>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button
            onClick={handleCloseEditModal}
            sx={{ color: '#9ca3af', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleEditSubmit}
            disabled={loadingEdit}
            variant="contained"
            size="large"
            sx={{
              textTransform: 'none',
              backgroundColor: '#0ea5e9',
              '&:hover': { backgroundColor: '#0284c7' },
            }}
          >
            {loadingEdit ? 'Updating Product...' : 'Update Product'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ProductList;
