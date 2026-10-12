import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Grid,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  TextField,
} from '@mui/material';
import {
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { useAuth } from '../../../context/AuthContext';
import { useThemeContext } from '../../../context/ThemeContext';
import { getInventorySummary } from '../../../api/inventory';
import { fetchCustomerPurchaseHistory } from '../../../api/customers';
import { fetchCustomerOutstanding } from '../../../api/outstanding';
import { fetchProducts } from '../../../api/products';
import ChatbotWidget from '../../../components/chatbot/ChatbotWidget';

const COLORS = [
  '#14b8a6', // Teal
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#f59e0b', // Orange
  '#ef4444', // Red
  '#10b981', // Green
  '#f97316', // Orange Red
  '#6366f1', // Indigo
];

// LocalStorage key prefixes for persisting filter values (will be combined with user ID)
const LOW_STOCK_THRESHOLD_KEY_PREFIX = 'sellerDashboard_lowStockThreshold_';
const NEAR_EXPIRY_DAYS_KEY_PREFIX = 'sellerDashboard_nearExpiryDays_';
const OUTSTANDING_AMOUNT_KEY_PREFIX = 'sellerDashboard_outstandingAmount_';

function SellerDashboard() {
  const { user } = useAuth();
  const { isDark } = useThemeContext();
  const [loading, setLoading] = useState(true);
  const [monthlySales, setMonthlySales] = useState([]);
  const [productWiseSales, setProductWiseSales] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [highSellingProducts, setHighSellingProducts] = useState([]);
  const [nearExpiryProducts, setNearExpiryProducts] = useState([]);
  const [topSellingCustomers, setTopSellingCustomers] = useState([]);
  const [topOutstandingCustomers, setTopOutstandingCustomers] = useState([]);
  
  // Load persisted low stock threshold from localStorage, default to 5
  const getPersistedLowStockThreshold = () => {
    if (!user?.id) return 5; // Default if no user ID
    try {
      const key = `${LOW_STOCK_THRESHOLD_KEY_PREFIX}${user.id}`;
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error loading persisted low stock threshold:', error);
    }
    return 5; // Default value
  };
  
  // Load persisted near expiry days from localStorage, default to 15
  const getPersistedNearExpiryDays = () => {
    if (!user?.id) return 15; // Default if no user ID
    try {
      const key = `${NEAR_EXPIRY_DAYS_KEY_PREFIX}${user.id}`;
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error loading persisted near expiry days:', error);
    }
    return 15; // Default value
  };
  
  // Load persisted outstanding amount from localStorage, default to Infinity (show all)
  const getPersistedOutstandingAmount = () => {
    if (!user?.id) return Infinity; // Default if no user ID
    try {
      const key = `${OUTSTANDING_AMOUNT_KEY_PREFIX}${user.id}`;
      const saved = localStorage.getItem(key);
      if (saved !== null && saved !== '') {
        // Check if it's the special "Infinity" marker
        if (saved === 'Infinity') {
          return Infinity;
        }
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error loading persisted outstanding amount:', error);
    }
    return Infinity; // Default value (show all)
  };
  
  // Initialize with persisted values (call once)
  const initialLowStockThreshold = getPersistedLowStockThreshold();
  const initialNearExpiryDays = getPersistedNearExpiryDays();
  const initialOutstandingAmount = getPersistedOutstandingAmount();
  const [lowStockThreshold, setLowStockThreshold] = useState(initialLowStockThreshold);
  const [lowStockInputValue, setLowStockInputValue] = useState(initialLowStockThreshold.toString());
  const [nearExpiryDaysThreshold, setNearExpiryDaysThreshold] = useState(initialNearExpiryDays);
  const [nearExpiryInputValue, setNearExpiryInputValue] = useState(initialNearExpiryDays.toString());
  const [outstandingAmountThreshold, setOutstandingAmountThreshold] = useState(initialOutstandingAmount);
  const [outstandingInputValue, setOutstandingInputValue] = useState(
    initialOutstandingAmount === Infinity ? '' : initialOutstandingAmount.toString()
  );
  const [allInventoryData, setAllInventoryData] = useState([]);
  const [allOutstandingData, setAllOutstandingData] = useState([]);

  // Reload persisted values when user changes
  useEffect(() => {
    if (user?.id) {
      const persistedLowStock = getPersistedLowStockThreshold();
      const persistedNearExpiry = getPersistedNearExpiryDays();
      const persistedOutstanding = getPersistedOutstandingAmount();
      
      setLowStockThreshold(persistedLowStock);
      setLowStockInputValue(persistedLowStock.toString());
      setNearExpiryDaysThreshold(persistedNearExpiry);
      setNearExpiryInputValue(persistedNearExpiry.toString());
      setOutstandingAmountThreshold(persistedOutstanding);
      setOutstandingInputValue(persistedOutstanding === Infinity ? '' : persistedOutstanding.toString());
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load all data in parallel
      const [
        inventoryResponse,
        purchaseHistoryResponse,
        outstandingResponse,
        productsResponse,
      ] = await Promise.all([
        getInventorySummary({ seller_user: user?.id, batch_wise: true }),
        fetchCustomerPurchaseHistory(),
        fetchCustomerOutstanding(),
        fetchProducts(user?.id),
      ]);

      // Process Monthly Sales
      processMonthlySales(purchaseHistoryResponse?.data || []);

      // Process Product Wise Sales
      processProductWiseSales(purchaseHistoryResponse?.data || []);

      // Store all inventory data for filtering
      setAllInventoryData(inventoryResponse?.data || []);

      // Process Low Stock Products
      processLowStockProducts(inventoryResponse?.data || [], lowStockThreshold);

      // Process High Selling Products
      processHighSellingProducts(purchaseHistoryResponse?.data || []);

      // Process Near Expiry Products
      processNearExpiryProducts(inventoryResponse?.data || [], nearExpiryDaysThreshold);

      // Process Top Selling Customers
      processTopSellingCustomers(purchaseHistoryResponse?.data || []);

      // Store all outstanding data for filtering
      setAllOutstandingData(outstandingResponse?.data || []);

      // Process Top Outstanding Customers (use persisted threshold)
      processTopOutstandingCustomers(outstandingResponse?.data || [], outstandingAmountThreshold);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const processMonthlySales = (purchases) => {
    const monthlyMap = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    purchases.forEach((purchase) => {
      if (purchase.invoice_date) {
        const date = new Date(purchase.invoice_date);
        const monthIndex = date.getMonth();
        const monthName = months[monthIndex];
        const total = parseFloat(purchase.total_amount || 0);

        if (!monthlyMap[monthName]) {
          monthlyMap[monthName] = 0;
        }
        monthlyMap[monthName] += total;
      }
    });

    const salesData = months.slice(0, 7).map((month) => ({
      month,
      sales: Math.round(monthlyMap[month] || 0),
    }));

    setMonthlySales(salesData);
  };

  const processProductWiseSales = (purchases) => {
    const productMap = {};

    purchases.forEach((purchase) => {
      if (purchase.items && Array.isArray(purchase.items)) {
        purchase.items.forEach((item) => {
          const productName = item.product_name || item.product?.product_name || 'Unknown Product';
          const amount = parseFloat(item.total || item.line_total || item.line || 0);

          if (!productMap[productName]) {
            productMap[productName] = 0;
          }
          productMap[productName] += amount;
        });
      }
    });

    // Get top products by sales amount
    const productData = Object.entries(productMap)
      .map(([name, value]) => ({
        name,
        value: Math.round(value),
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Show top 8 products

    setProductWiseSales(productData);
  };

  const processLowStockProducts = (inventory, threshold = 5) => {
    const lowStock = inventory
      .filter((item) => {
        const availableStock = parseFloat(item.available_stock || 0);
        return availableStock > 0 && availableStock <= threshold;
      })
      .map((item) => ({
        name: item.product_name,
        quantity: Math.floor(parseFloat(item.available_stock || 0)),
      }));

    setLowStockProducts(lowStock);
  };

  const handleLowStockThresholdChange = (event) => {
    const inputValue = event.target.value;
    setLowStockInputValue(inputValue);
  };

  const handleLowStockThresholdFocus = () => {
    setLowStockInputValue('');
  };

  const handleLowStockThresholdBlur = (event) => {
    const value = parseInt(event.target.value) || 0;
    if (value >= 0 && event.target.value.trim() !== '') {
      setLowStockThreshold(value);
      setLowStockInputValue(value.toString());
      processLowStockProducts(allInventoryData, value);
      
      // Persist the value to localStorage with seller-specific key
      if (user?.id) {
        try {
          const key = `${LOW_STOCK_THRESHOLD_KEY_PREFIX}${user.id}`;
          localStorage.setItem(key, value.toString());
        } catch (error) {
          console.error('Error saving low stock threshold to localStorage:', error);
        }
      }
    } else {
      // Revert to current threshold if invalid or empty
      setLowStockInputValue(lowStockThreshold.toString());
    }
  };

  const processHighSellingProducts = (purchases) => {
    const productMap = {};

    purchases.forEach((purchase) => {
      if (purchase.items && Array.isArray(purchase.items)) {
        purchase.items.forEach((item) => {
          const productName = item.product_name || item.product;
          const amount = parseFloat(item.total || item.line_total || 0);

          if (!productMap[productName]) {
            productMap[productName] = 0;
          }
          productMap[productName] += amount;
        });
      }
    });

    const highSelling = Object.entries(productMap)
      .map(([name, value]) => ({
        name,
        amount: Math.round(value),
      }))
      .sort((a, b) => b.amount - a.amount);

    setHighSellingProducts(highSelling);
  };

  const processNearExpiryProducts = (inventory, daysThreshold = 15) => {
    const nearExpiry = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    inventory.forEach((item) => {
      if (item.batches && Array.isArray(item.batches)) {
        item.batches.forEach((batch) => {
          if (batch.expiry_date && batch.available_quantity > 0) {
            const expiryDate = new Date(batch.expiry_date);
            expiryDate.setHours(0, 0, 0, 0);
            const diffTime = expiryDate - today;
            const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (daysUntilExpiry > 0 && daysUntilExpiry <= daysThreshold) {
              nearExpiry.push({
                name: item.product_name || batch.batch_name,
                days: daysUntilExpiry,
              });
            }
          }
        });
      }
    });

    const sortedNearExpiry = nearExpiry.sort((a, b) => a.days - b.days);

    setNearExpiryProducts(sortedNearExpiry);
  };

  const handleNearExpiryDaysChange = (event) => {
    const inputValue = event.target.value;
    setNearExpiryInputValue(inputValue);
  };

  const handleNearExpiryDaysFocus = () => {
    setNearExpiryInputValue('');
  };

  const handleNearExpiryDaysBlur = (event) => {
    const value = parseInt(event.target.value) || 0;
    if (value >= 0 && event.target.value.trim() !== '') {
      setNearExpiryDaysThreshold(value);
      setNearExpiryInputValue(value.toString());
      processNearExpiryProducts(allInventoryData, value);
      
      // Persist the value to localStorage with seller-specific key
      if (user?.id) {
        try {
          const key = `${NEAR_EXPIRY_DAYS_KEY_PREFIX}${user.id}`;
          localStorage.setItem(key, value.toString());
        } catch (error) {
          console.error('Error saving near expiry days to localStorage:', error);
        }
      }
    } else {
      // Revert to current threshold if invalid or empty
      setNearExpiryInputValue(nearExpiryDaysThreshold.toString());
    }
  };

  const processTopSellingCustomers = (purchases) => {
    const customerMap = {};

    purchases.forEach((purchase) => {
      const customerName = purchase.customer_name || purchase.customer;
      const total = parseFloat(purchase.total_amount || 0);

      if (customerName) {
        if (!customerMap[customerName]) {
          customerMap[customerName] = 0;
        }
        customerMap[customerName] += total;
      }
    });

    const topCustomers = Object.entries(customerMap)
      .map(([name, amount]) => ({
        name,
        amount: Math.round(amount),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Limit to top 5 customers only

    setTopSellingCustomers(topCustomers);
  };

  const processTopOutstandingCustomers = (outstanding, maxAmount = Infinity) => {
    const topOutstanding = outstanding
      .filter((item) => {
        const pendingAmount = parseFloat(item.outstanding || 0);
        return pendingAmount > 0 && pendingAmount <= maxAmount;
      })
      .map((item) => ({
        name: item.customer_name || item.customer,
        pending: Math.round(parseFloat(item.outstanding || 0)),
      }))
      .sort((a, b) => b.pending - a.pending);

    setTopOutstandingCustomers(topOutstanding);
  };

  const handleOutstandingAmountChange = (event) => {
    const inputValue = event.target.value;
    setOutstandingInputValue(inputValue);
  };

  const handleOutstandingAmountFocus = () => {
    setOutstandingInputValue('');
  };

  const handleOutstandingAmountBlur = (event) => {
    const inputValue = event.target.value.trim();
    if (inputValue === '') {
      // Show all customers if input is empty
      setOutstandingAmountThreshold(Infinity);
      setOutstandingInputValue('');
      processTopOutstandingCustomers(allOutstandingData, Infinity);
      
      // Persist Infinity value to localStorage with seller-specific key
      if (user?.id) {
        try {
          const key = `${OUTSTANDING_AMOUNT_KEY_PREFIX}${user.id}`;
          localStorage.setItem(key, 'Infinity');
        } catch (error) {
          console.error('Error saving outstanding amount to localStorage:', error);
        }
      }
    } else {
      const value = parseFloat(inputValue);
      if (!isNaN(value) && value >= 0) {
        setOutstandingAmountThreshold(value);
        setOutstandingInputValue(value.toString());
        processTopOutstandingCustomers(allOutstandingData, value);
        
        // Persist the value to localStorage with seller-specific key
        if (user?.id) {
          try {
            const key = `${OUTSTANDING_AMOUNT_KEY_PREFIX}${user.id}`;
            localStorage.setItem(key, value.toString());
          } catch (error) {
            console.error('Error saving outstanding amount to localStorage:', error);
          }
        }
      } else {
        // Revert to current threshold if invalid
        if (outstandingAmountThreshold === Infinity) {
          setOutstandingInputValue('');
        } else {
          setOutstandingInputValue(outstandingAmountThreshold.toString());
        }
      }
    }
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: isDark ? '#020617' : '#f8fafc',
        }}
      >
        <CircularProgress sx={{ color: '#0ea5e9' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 3 },
        backgroundColor: isDark ? '#020617' : '#f8fafc',
        minHeight: '100vh',
        color: isDark ? '#e5e7eb' : '#0f172a',
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
    >
      {/* First Row: Monthly Sales and Product Wise Sales */}
      <Grid container spacing={4} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={6}>
          <Card
            sx={{
              backgroundColor: '#0f172a',
              borderRadius: 2,
              border: '1px solid rgba(148, 163, 184, 0.25)',
              p: 2,
              height: 350,
              width: 1400,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography variant="h6" sx={{ color: '#e5e7eb', fontWeight: 600, mb: 2 }}>
              Monthly Sales
            </Typography>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySales} margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#9ca3af" tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(14, 165, 233, 0.1)' }}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      borderRadius: 8,
                      color: '#e5e7eb',
                    }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Bar dataKey="sales" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>

        {/* <Grid item xs={12} sm={6} md={6}>
          <Card
            sx={{
              backgroundColor: '#0f172a',
              borderRadius: 2,
              border: '1px solid rgba(148, 163, 184, 0.25)',
              p: 2,
              height: 320,
              width: 400,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#e5e7eb', fontWeight: 600 }}>
                Product Wise Sales
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', maxWidth: '100%' }}>
                {productWiseSales.slice(0, 4).map((item, index) => (
                  <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                    <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                      {item.name.length > 15 ? `${item.name.substring(0, 15)}...` : item.name}
                    </Typography>
                  </Box>
                ))}
                {productWiseSales.length > 4 && (
                  <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                    +{productWiseSales.length - 4} more
                  </Typography>
                )}
              </Box>
            </Box>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productWiseSales}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => {
                      const displayName = name.length > 10 ? `${name.substring(0, 10)}...` : name;
                      return `${displayName} ${(percent * 100).toFixed(0)}%`;
                    }}
                    outerRadius={80}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {productWiseSales.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      borderRadius: 8,
                      color: '#e5e7eb',
                    }}
                    formatter={(value, name) => [formatCurrency(value), name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid> */}
      </Grid>

      {/* Second Row: Low Stock Products, High Selling Products, Near Expiry Products */}
      <Grid container spacing={4} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card
            sx={{
              backgroundColor: '#0f172a',
              borderRadius: 2,
              border: '1px solid rgba(148, 163, 184, 0.25)',
              p: 2,
              height: 400,
              width: 450,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#e5e7eb', fontWeight: 600 }}>
                Low Stock Products
              </Typography>
              <TextField
                type="number"
                value={lowStockInputValue}
                onChange={handleLowStockThresholdChange}
                onFocus={handleLowStockThresholdFocus}
                onBlur={handleLowStockThresholdBlur}
                inputProps={{
                  min: 0,
                  style: {
                    color: '#e5e7eb',
                    fontSize: '0.875rem',
                    padding: '4px 8px',
                    width: '60px',
                    textAlign: 'center',
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: '32px',
                    width: '70px',
                    backgroundColor: '#1e293b',
                    '& fieldset': {
                      borderColor: 'rgba(148, 163, 184, 0.25)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(148, 163, 184, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#0ea5e9',
                    },
                  },
                }}
              />
            </Box>
            <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {lowStockProducts.length > 0 ? (
                <>
                  <Box sx={{ textAlign: 'center', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                      Total: {lowStockProducts.length} product{lowStockProducts.length !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                  <Box 
                    sx={{ 
                      flex: 1, 
                      overflowY: 'auto',
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-track': {
                        backgroundColor: '#1e293b',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: '#475569',
                        borderRadius: '3px',
                        '&:hover': {
                          backgroundColor: '#64748b',
                        },
                      },
                    }}
                  >
                    <Paper
                      sx={{
                        backgroundColor: '#1e293b',
                        borderRadius: 1,
                        overflow: 'hidden',
                      }}
                    >
                      <Box sx={{ display: 'flex', px: 2, py: 1, borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <Typography variant="body2" sx={{ color: '#9ca3af', fontWeight: 600, flex: 1 }}>
                          Product
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#9ca3af', fontWeight: 600, flex: 1, textAlign: 'right' }}>
                          Quantity
                        </Typography>
                      </Box>
                      {lowStockProducts.map((product, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: 'flex',
                            px: 2,
                            py: 1.5,
                            borderBottom: index < lowStockProducts.length - 1 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none',
                          }}
                        >
                          <Typography variant="body2" sx={{ color: '#e5e7eb', flex: 1 }}>
                            {product.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#ef4444', flex: 1, textAlign: 'right', fontWeight: 500 }}>
                            {product.quantity}
                          </Typography>
                        </Box>
                      ))}
                    </Paper>
                  </Box>
                </>
              ) : (
                <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', mt: 2 }}>
                  No low stock products
                </Typography>
              )}
            </Box>
          </Card>
        </Grid>

        
        

        <Grid item xs={12} sm={6} md={4}>
          <Card
            sx={{
              backgroundColor: '#0f172a',
              borderRadius: 2,
              border: '1px solid rgba(148, 163, 184, 0.25)',
              p: 2,
              height: 400,
              width: 450,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#e5e7eb', fontWeight: 600 }}>
                Near Expiry Products
              </Typography>
              <TextField
                type="number"
                value={nearExpiryInputValue}
                onChange={handleNearExpiryDaysChange}
                onFocus={handleNearExpiryDaysFocus}
                onBlur={handleNearExpiryDaysBlur}
                inputProps={{
                  min: 0,
                  style: {
                    color: '#e5e7eb',
                    fontSize: '0.875rem',
                    padding: '4px 8px',
                    width: '60px',
                    textAlign: 'center',
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: '32px',
                    width: '70px',
                    backgroundColor: '#1e293b',
                    '& fieldset': {
                      borderColor: 'rgba(148, 163, 184, 0.25)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(148, 163, 184, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#0ea5e9',
                    },
                  },
                }}
              />
            </Box>
            <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {nearExpiryProducts.length > 0 ? (
                <>
                  <Box sx={{ textAlign: 'center', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                      Total: {nearExpiryProducts.length} product{nearExpiryProducts.length !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                  <Box 
                    sx={{ 
                      flex: 1, 
                      overflowY: 'auto',
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-track': {
                        backgroundColor: '#1e293b',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: '#475569',
                        borderRadius: '3px',
                        '&:hover': {
                          backgroundColor: '#64748b',
                        },
                      },
                    }}
                  >
                    <Paper
                      sx={{
                        backgroundColor: '#1e293b',
                        borderRadius: 1,
                        overflow: 'hidden',
                      }}
                    >
                      <Box sx={{ display: 'flex', px: 2, py: 1, borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <Typography variant="body2" sx={{ color: '#9ca3af', fontWeight: 600, flex: 1 }}>
                          Product
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#9ca3af', fontWeight: 600, flex: 1, textAlign: 'right' }}>
                          Days
                        </Typography>
                      </Box>
                      {nearExpiryProducts.map((product, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: 'flex',
                            px: 2,
                            py: 1.5,
                            borderBottom: index < nearExpiryProducts.length - 1 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none',
                          }}
                        >
                          <Typography variant="body2" sx={{ color: '#e5e7eb', flex: 1 }}>
                            {product.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#ef4444', flex: 1, textAlign: 'right', fontWeight: 500 }}>
                            {`${product.days} days`}
                          </Typography>
                        </Box>
                      ))}
                    </Paper>
                  </Box>
                </>
              ) : (
                <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', mt: 2 }}>
                  No near expiry products
                </Typography>
              )}
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={6}>
          <Card
            sx={{
              backgroundColor: '#0f172a',
              borderRadius: 2,
              border: '1px solid rgba(148, 163, 184, 0.25)',
              p: 2,
              height: 400,
              width: 450,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#e5e7eb', fontWeight: 600 }}>
                Top Outstanding Customers
              </Typography>
              <TextField
                type="number"
                value={outstandingInputValue}
                onChange={handleOutstandingAmountChange}
                onFocus={handleOutstandingAmountFocus}
                onBlur={handleOutstandingAmountBlur}
                placeholder="Min Amount"
                inputProps={{
                  min: 0,
                  style: {
                    color: '#e5e7eb',
                    fontSize: '0.875rem',
                    padding: '4px 8px',
                    width: '80px',
                    textAlign: 'center',
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: '32px',
                    width: '100px',
                    backgroundColor: '#1e293b',
                    '& fieldset': {
                      borderColor: 'rgba(148, 163, 184, 0.25)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(148, 163, 184, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#0ea5e9',
                    },
                  },
                }}
              />
            </Box>
            <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {topOutstandingCustomers.length > 0 ? (
                <>
                  <Box sx={{ textAlign: 'center', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                      Total: {topOutstandingCustomers.length} customer{topOutstandingCustomers.length !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                  <Box 
                    sx={{ 
                      flex: 1, 
                      overflowY: 'auto',
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-track': {
                        backgroundColor: '#1e293b',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: '#475569',
                        borderRadius: '3px',
                        '&:hover': {
                          backgroundColor: '#64748b',
                        },
                      },
                    }}
                  >
                    <Paper
                      sx={{
                        backgroundColor: '#1e293b',
                        borderRadius: 1,
                        overflow: 'hidden',
                      }}
                    >
                      <Box sx={{ display: 'flex', px: 2, py: 1, borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <Typography variant="body2" sx={{ color: '#9ca3af', fontWeight: 600, flex: 1 }}>
                          Name
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#9ca3af', fontWeight: 600, flex: 1, textAlign: 'right' }}>
                          Pending
                        </Typography>
                      </Box>
                      {topOutstandingCustomers.map((customer, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: 'flex',
                            px: 2,
                            py: 1.5,
                            borderBottom: index < topOutstandingCustomers.length - 1 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none',
                          }}
                        >
                          <Typography variant="body2" sx={{ color: '#e5e7eb', flex: 1 }}>
                            {customer.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#ef4444', flex: 1, textAlign: 'right', fontWeight: 500 }}>
                            {formatCurrency(customer.pending)}
                          </Typography>
                        </Box>
                      ))}
                    </Paper>
                  </Box>
                </>
              ) : (
                <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', mt: 2 }}>
                  No outstanding customers
                </Typography>
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Third Row: Top Selling Customers and Top Outstanding Customers */}
      <Grid container spacing={4}>
        <Grid item xs={12} sm={6} md={6}>
          <Card
            sx={{
              backgroundColor: '#0f172a',
              borderRadius: 2,
              border: '1px solid rgba(148, 163, 184, 0.25)',
              p: 2,
              height: 380,
              width: 700,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography variant="h6" sx={{ color: '#e5e7eb', fontWeight: 600, mb: 2 }}>
              Top Selling Customers
            </Typography>
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              {topSellingCustomers.length > 0 ? (
                <Paper
                  sx={{
                    backgroundColor: '#1e293b',
                    borderRadius: 1,
                    overflow: 'hidden',
                  }}
                >
                  <Box sx={{ display: 'flex', px: 2, py: 1, borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                    <Typography variant="body2" sx={{ color: '#9ca3af', fontWeight: 600, flex: 1 }}>
                      Name
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af', fontWeight: 600, flex: 1, textAlign: 'right' }}>
                      Amount
                    </Typography>
                  </Box>
                  {topSellingCustomers.map((customer, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        px: 2,
                        py: 1.5,
                        borderBottom: index < topSellingCustomers.length - 1 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none',
                      }}
                    >
                      <Typography variant="body2" sx={{ color: '#e5e7eb', flex: 1 }}>
                        {customer.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#14b8a6', flex: 1, textAlign: 'right', fontWeight: 500 }}>
                        {formatCurrency(customer.amount)}
                      </Typography>
                    </Box>
                  ))}
                </Paper>
              ) : (
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                  No customer sales data available
                </Typography>
              )}
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card
            sx={{
              backgroundColor: '#0f172a',
              borderRadius: 2,
              border: '1px solid rgba(148, 163, 184, 0.25)',
              p: 2,
              height: 380,
              width: 700,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography variant="h6" sx={{ color: '#e5e7eb', fontWeight: 600, mb: 2 }}>
              High Selling Products
            </Typography>
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              {highSellingProducts.length > 0 ? (
                <Paper
                  sx={{
                    backgroundColor: '#1e293b',
                    borderRadius: 1,
                    overflow: 'hidden',
                  }}
                >
                  <Box sx={{ display: 'flex', px: 2, py: 1, borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                    <Typography variant="body2" sx={{ color: '#9ca3af', fontWeight: 600, flex: 1 }}>
                      Product
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af', fontWeight: 600, flex: 1, textAlign: 'right' }}>
                      Amount
                    </Typography>
                  </Box>
                  {highSellingProducts.map((product, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        px: 2,
                        py: 1.5,
                        borderBottom: index < highSellingProducts.length - 1 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none',
                      }}
                    >
                      <Typography variant="body2" sx={{ color: '#e5e7eb', flex: 1 }}>
                        {product.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#14b8a6', flex: 1, textAlign: 'right', fontWeight: 500 }}>
                        {formatCurrency(product.amount)}
                      </Typography>
                    </Box>
                  ))}
                </Paper>
              ) : (
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                  No sales data available
                </Typography>
              )}
            </Box>
          </Card>
        </Grid>

    
      </Grid>

      {/* Floating Chatbot Widget */}
      <ChatbotWidget />
    </Box>
  );
}

export default SellerDashboard;
