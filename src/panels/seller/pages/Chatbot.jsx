import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Button,
  Avatar,
  Card,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchCustomerPurchaseHistory, fetchCustomers } from '../../../api/customers';
import { fetchCustomerOutstanding } from '../../../api/outstanding';
import { getInventorySummary } from '../../../api/inventory';
import { fetchSuppliers } from '../../../api/suppliers';

const CHATBOT_STORAGE_KEY = 'seller_chatbot_history';

const predefinedQuestions = [
  "Total Sale",
  "Which products are near expiry?",
  "Which customer has the highest purchases?",
  "Which customers have the highest outstanding payments?",
];

function Chatbot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem(`${CHATBOT_STORAGE_KEY}_${user?.id}`);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setMessages(parsed);
      } catch (error) {
        console.error('Error loading chat history:', error);
        // Initialize with welcome message if loading fails
        setMessages([
          {
            type: 'bot',
            text: 'Welcome to Syntrrix ERP System 👋',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } else {
      // Initialize with welcome message
      setMessages([
        {
          type: 'bot',
          text: 'Welcome to Syntrrix ERP System 👋',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [user?.id]);

  // Save chat history to localStorage whenever messages change
  // This maintains complete history including messages from the widget
  useEffect(() => {
    if (messages.length > 0 && user?.id) {
      localStorage.setItem(`${CHATBOT_STORAGE_KEY}_${user?.id}`, JSON.stringify(messages));
    }
  }, [messages, user?.id]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const getCurrentMonthSales = async () => {
    try {
      const response = await fetchCustomerPurchaseHistory();
      const purchases = response?.data || [];
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const monthlySales = purchases
        .filter((purchase) => {
          if (!purchase.invoice_date) return false;
          const date = new Date(purchase.invoice_date);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
        .reduce((total, purchase) => total + parseFloat(purchase.total_amount || 0), 0);

      return `Your total sales for this month (${new Date().toLocaleString('default', { month: 'long' })}) is ${formatCurrency(Math.round(monthlySales))}.`;
    } catch (error) {
      console.error('Error fetching sales:', error);
      return 'Sorry, I encountered an error while fetching your sales data. Please try again later.';
    }
  };

  const getSalesForMonth = async (monthIndex, year = null) => {
    try {
      const response = await fetchCustomerPurchaseHistory();
      const purchases = response?.data || [];
      
      const targetYear = year || new Date().getFullYear();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      
      const monthlySales = purchases
        .filter((purchase) => {
          if (!purchase.invoice_date) return false;
          const date = new Date(purchase.invoice_date);
          return date.getMonth() === monthIndex && date.getFullYear() === targetYear;
        })
        .reduce((total, purchase) => total + parseFloat(purchase.total_amount || 0), 0);

      return `Your total sales for ${monthNames[monthIndex]} ${targetYear} is ${formatCurrency(Math.round(monthlySales))}.`;
    } catch (error) {
      console.error('Error fetching sales:', error);
      return 'Sorry, I encountered an error while fetching your sales data. Please try again later.';
    }
  };

  const getNearExpiryProducts = async () => {
    try {
      const response = await getInventorySummary({ seller_user: user?.id, batch_wise: true });
      const inventory = response?.data || [];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nearExpiry = [];
      const daysThreshold = 15;

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

      if (nearExpiry.length === 0) {
        return 'Great news! No products are near expiry within the next 15 days.';
      }

      const sorted = nearExpiry.sort((a, b) => a.days - b.days);
      const top5 = sorted.slice(0, 5);
      
      let responseText = `Here are the products near expiry (within 15 days):\n\n`;
      top5.forEach((product, index) => {
        responseText += `${index + 1}. ${product.name} - ${product.days} day${product.days !== 1 ? 's' : ''} remaining\n`;
      });
      
      if (nearExpiry.length > 5) {
        responseText += `\n...and ${nearExpiry.length - 5} more product${nearExpiry.length - 5 !== 1 ? 's' : ''}.`;
      }

      return responseText;
    } catch (error) {
      console.error('Error fetching near expiry products:', error);
      return 'Sorry, I encountered an error while fetching near expiry products. Please try again later.';
    }
  };

  const getTopCustomer = async () => {
    try {
      const response = await fetchCustomerPurchaseHistory();
      const purchases = response?.data || [];
      
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

      const topCustomer = Object.entries(customerMap)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)[0];

      if (!topCustomer) {
        return 'No customer purchase data available yet.';
      }

      return `The customer with the highest purchases is **${topCustomer.name}** with total purchases of ${formatCurrency(Math.round(topCustomer.amount))}.`;
    } catch (error) {
      console.error('Error fetching top customer:', error);
      return 'Sorry, I encountered an error while fetching customer data. Please try again later.';
    }
  };

  const getTopOutstandingCustomers = async () => {
    try {
      const response = await fetchCustomerOutstanding();
      const outstanding = response?.data || [];
      
      const topOutstanding = outstanding
        .filter((item) => parseFloat(item.outstanding || 0) > 0)
        .map((item) => ({
          name: item.customer_name || item.customer,
          pending: parseFloat(item.outstanding || 0),
        }))
        .sort((a, b) => b.pending - a.pending)
        .slice(0, 5);

      if (topOutstanding.length === 0) {
        return 'Great! All customers have cleared their outstanding payments.';
      }

      let responseText = `Here are the customers with the highest outstanding payments:\n\n`;
      topOutstanding.forEach((customer, index) => {
        responseText += `${index + 1}. ${customer.name} - ${formatCurrency(Math.round(customer.pending))}\n`;
      });

      return responseText;
    } catch (error) {
      console.error('Error fetching outstanding customers:', error);
      return 'Sorry, I encountered an error while fetching outstanding payment data. Please try again later.';
    }
  };

  const getLastMonthTopCustomers = async () => {
    try {
      const response = await fetchCustomerPurchaseHistory();
      const purchases = response?.data || [];
      
      const now = new Date();
      const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      
      const customerMap = {};
      purchases.forEach((purchase) => {
        if (purchase.invoice_date) {
          const date = new Date(purchase.invoice_date);
          if (date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear) {
            const customerName = purchase.customer_name || purchase.customer;
            const total = parseFloat(purchase.total_amount || 0);
            if (customerName) {
              if (!customerMap[customerName]) {
                customerMap[customerName] = 0;
              }
              customerMap[customerName] += total;
            }
          }
        }
      });

      const topCustomers = Object.entries(customerMap)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      if (topCustomers.length === 0) {
        const monthName = new Date(lastMonthYear, lastMonth).toLocaleString('default', { month: 'long' });
        return `No sales data available for ${monthName} ${lastMonthYear}.`;
      }

      const monthName = new Date(lastMonthYear, lastMonth).toLocaleString('default', { month: 'long' });
      let responseText = `Top selling customers for ${monthName} ${lastMonthYear}:\n\n`;
      topCustomers.forEach((customer, index) => {
        responseText += `${index + 1}. ${customer.name} - ${formatCurrency(Math.round(customer.amount))}\n`;
      });

      return responseText;
    } catch (error) {
      console.error('Error fetching last month top customers:', error);
      return 'Sorry, I encountered an error while fetching last month customer data. Please try again later.';
    }
  };

  const getCustomerList = async () => {
    try {
      const response = await fetchCustomers();
      const customers = response?.data || [];
      const count = response?.count || customers.length;

      if (customers.length === 0) {
        return 'You have no customers yet.';
      }

      let responseText = `Total Customers: ${count}\n\nCustomer List:\n\n`;
      customers.slice(0, 20).forEach((customer, index) => {
        responseText += `${index + 1}. ${customer.full_name || 'N/A'}`;
        if (customer.mobile_number) {
          responseText += ` (${customer.mobile_number})`;
        }
        responseText += '\n';
      });

      if (customers.length > 20) {
        responseText += `\n...and ${customers.length - 20} more customers.`;
      }

      return responseText;
    } catch (error) {
      console.error('Error fetching customers:', error);
      return 'Sorry, I encountered an error while fetching customer data. Please try again later.';
    }
  };

  const getSupplierList = async () => {
    try {
      const response = await fetchSuppliers();
      const suppliers = response?.data || [];
      const count = response?.count || suppliers.length;

      if (suppliers.length === 0) {
        return 'You have no suppliers yet.';
      }

      let responseText = `Total Suppliers: ${count}\n\nSupplier List:\n\n`;
      suppliers.slice(0, 20).forEach((supplier, index) => {
        const name = supplier.supplier_name || supplier.business_name || 'N/A';
        responseText += `${index + 1}. ${name}`;
        if (supplier.mobile_number) {
          responseText += ` (${supplier.mobile_number})`;
        }
        responseText += '\n';
      });

      if (suppliers.length > 20) {
        responseText += `\n...and ${suppliers.length - 20} more suppliers.`;
      }

      return responseText;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return 'Sorry, I encountered an error while fetching supplier data. Please try again later.';
    }
  };

  const getAllExpiryProducts = async () => {
    try {
      const response = await getInventorySummary({ seller_user: user?.id, batch_wise: true });
      const inventory = response?.data || [];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiryProducts = [];

      inventory.forEach((item) => {
        if (item.batches && Array.isArray(item.batches)) {
          item.batches.forEach((batch) => {
            if (batch.expiry_date && batch.available_quantity > 0) {
              const expiryDate = new Date(batch.expiry_date);
              expiryDate.setHours(0, 0, 0, 0);
              const diffTime = expiryDate - today;
              const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (daysUntilExpiry > 0) {
                expiryProducts.push({
                  name: item.product_name || batch.batch_name,
                  days: daysUntilExpiry,
                  expiryDate: batch.expiry_date,
                  quantity: batch.available_quantity,
                });
              }
            }
          });
        }
      });

      if (expiryProducts.length === 0) {
        return 'No products with expiry dates found in your inventory.';
      }

      const sorted = expiryProducts.sort((a, b) => a.days - b.days);
      
      let responseText = `Total Products with Expiry Dates: ${sorted.length}\n\nExpiry Products List:\n\n`;
      sorted.slice(0, 20).forEach((product, index) => {
        responseText += `${index + 1}. ${product.name} - ${product.days} day${product.days !== 1 ? 's' : ''} remaining`;
        if (product.quantity) {
          responseText += ` (Qty: ${product.quantity})`;
        }
        responseText += '\n';
      });

      if (sorted.length > 20) {
        responseText += `\n...and ${sorted.length - 20} more products.`;
      }

      return responseText;
    } catch (error) {
      console.error('Error fetching expiry products:', error);
      return 'Sorry, I encountered an error while fetching expiry products. Please try again later.';
    }
  };

  const processMessage = async (messageText) => {
    const lowerText = messageText.toLowerCase().trim();

    // Check for month selection (when user selects a month for sales)
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const monthIndex = monthNames.findIndex(month => lowerText.includes(month));
    
    // Check if user is selecting a month after asking about total sale
    if (monthIndex !== -1) {
      const lastBotMessage = messages.filter(m => m.type === 'bot').slice(-1)[0];
      if (lastBotMessage && lastBotMessage.monthSelection) {
        const answer = await getSalesForMonth(monthIndex);
        return { text: answer };
      }
    }

    // Check for navigation intent
    if (lowerText.includes('create') && (lowerText.includes('order') || lowerText.includes('customer order'))) {
      return {
        text: 'Would you like to create a customer order?',
        action: 'navigate',
        actionPath: '/seller/customers/purchase?openSellModal=true',
        actionLabel: 'Go to Customer Sell Flow',
      };
    }

    // Check for "total sale" query (without specific month)
    if ((lowerText.includes('total sale') || lowerText.includes('total sales')) && 
        !lowerText.includes('this month') && 
        !lowerText.includes('current month') &&
        monthIndex === -1) {
      return {
        text: 'Which month would you like to see the sales for?',
        monthSelection: true,
      };
    }

    // Check for last month top customers
    if ((lowerText.includes('top') || lowerText.includes('selling')) && 
        lowerText.includes('customer') && 
        (lowerText.includes('last month') || lowerText.includes('previous month'))) {
      const answer = await getLastMonthTopCustomers();
      return { text: answer };
    }

    // Check for customer list and count
    if ((lowerText.includes('customer') && lowerText.includes('list')) || 
        (lowerText.includes('total customer') && (lowerText.includes('count') || lowerText.includes('list')))) {
      const answer = await getCustomerList();
      return { text: answer };
    }

    // Check for supplier list and count (interpreting "seller" as suppliers)
    if ((lowerText.includes('supplier') && lowerText.includes('list')) ||
        (lowerText.includes('total seller') && (lowerText.includes('count') || lowerText.includes('list'))) ||
        (lowerText.includes('seller count') || lowerText.includes('seller list'))) {
      const answer = await getSupplierList();
      return { text: answer };
    }

    // Check for all expiry products
    if ((lowerText.includes('expiry') || lowerText.includes('expiring')) && 
        (lowerText.includes('list') || lowerText.includes('product'))) {
      const answer = await getAllExpiryProducts();
      return { text: answer };
    }

    // Check for predefined questions
    if (lowerText.includes('total sales') && (lowerText.includes('month') || lowerText.includes('this month'))) {
      const answer = await getCurrentMonthSales();
      return { text: answer };
    }

    if (lowerText.includes('near expiry') || (lowerText.includes('expiry') && lowerText.includes('near'))) {
      const answer = await getNearExpiryProducts();
      return { text: answer };
    }

    if (lowerText.includes('highest purchases') || (lowerText.includes('customer') && lowerText.includes('highest'))) {
      const answer = await getTopCustomer();
      return { text: answer };
    }

    if (lowerText.includes('outstanding') || lowerText.includes('pending payment')) {
      const answer = await getTopOutstandingCustomers();
      return { text: answer };
    }

    // Default response
    return {
      text: "I'm here to help you with your business data. You can ask me about:\n\n• Total sales for this month\n• Top selling customers last month\n• Products near expiry\n• List of expiry products\n• Top customers by purchases\n• Customers with outstanding payments\n• Total customer list and count\n• Total supplier list and count\n\nOr ask me to help you create a customer order!",
    };
  };

  const handleSendMessage = async (text = null) => {
    const messageToSend = text || inputValue.trim();
    if (!messageToSend) return;

    // Add user message
    const userMessage = {
      type: 'user',
      text: messageToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Process message and get bot response
    const botResponse = await processMessage(messageToSend);

    setIsTyping(false);

    // Add bot response
    const botMessage = {
      type: 'bot',
      text: botResponse.text,
      timestamp: new Date().toISOString(),
      action: botResponse.action,
      actionPath: botResponse.actionPath,
      actionLabel: botResponse.actionLabel,
      monthSelection: botResponse.monthSelection,
    };

    setMessages((prev) => [...prev, botMessage]);
  };

  const handleQuestionClick = (question) => {
    handleSendMessage(question);
  };

  const handleActionClick = (path) => {
    navigate(path);
  };

  const clearChat = () => {
    setMessages([
      {
        type: 'bot',
        text: 'Welcome to Syntrrix ERP System 👋',
        timestamp: new Date().toISOString(),
      },
    ]);
    localStorage.removeItem(`${CHATBOT_STORAGE_KEY}_${user?.id}`);
  };

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 3 },
        backgroundColor: '#020617',
        minHeight: '100vh',
        color: '#e5e7eb',
      }}
    >
      <Card
        sx={{
          backgroundColor: '#0f172a',
          borderRadius: 2,
          border: '1px solid rgba(148, 163, 184, 0.25)',
          overflow: 'hidden',
          height: 'calc(100vh - 120px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            backgroundColor: '#1e293b',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                backgroundColor: '#0ea5e9',
                width: 48,
                height: 48,
              }}
            >
              <SmartToyIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ color: '#e5e7eb', fontWeight: 600 }}>
                Syntrrix Web Bot
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                AI Assistant - Chat History
              </Typography>
            </Box>
          </Box>
          {messages.length > 1 && (
            <Button
              variant="outlined"
              onClick={clearChat}
              sx={{
                borderColor: 'rgba(148, 163, 184, 0.25)',
                color: '#9ca3af',
                '&:hover': {
                  borderColor: '#ef4444',
                  color: '#ef4444',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                },
              }}
            >
              Clear Chat
            </Button>
          )}
        </Box>

        {/* Messages Area */}
        <Box
          ref={chatContainerRef}
          sx={{
            flex: 1,
            overflowY: 'auto',
            padding: 3,
            backgroundColor: '#0b1624',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#1e293b',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#475569',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: '#64748b',
              },
            },
          }}
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
                mb: 2,
              }}
            >
              <Box
                sx={{
                  maxWidth: '70%',
                  padding: 2,
                  borderRadius: 2,
                  backgroundColor: message.type === 'user' ? '#0ea5e9' : '#1e293b',
                  color: '#e5e7eb',
                }}
              >
                {message.type === 'bot' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <SmartToyIcon sx={{ fontSize: 18, color: '#0ea5e9' }} />
                    <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                      Bot
                    </Typography>
                  </Box>
                )}
                <Typography
                  variant="body1"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                  }}
                >
                  {message.text}
                </Typography>
                {message.action && message.actionPath && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleActionClick(message.actionPath)}
                    sx={{
                      mt: 1.5,
                      backgroundColor: '#0ea5e9',
                      color: 'white',
                      textTransform: 'none',
                      '&:hover': {
                        backgroundColor: '#0284c7',
                      },
                    }}
                  >
                    {message.actionLabel || 'Go'}
                  </Button>
                )}
                {message.monthSelection && (
                  <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month) => (
                      <Button
                        key={month}
                        variant="outlined"
                        size="small"
                        onClick={() => handleSendMessage(month)}
                        sx={{
                          textTransform: 'none',
                          borderColor: 'rgba(148, 163, 184, 0.25)',
                          color: '#e5e7eb',
                          fontSize: '0.85rem',
                          '&:hover': {
                            borderColor: '#0ea5e9',
                            backgroundColor: 'rgba(14, 165, 233, 0.1)',
                          },
                        }}
                      >
                        {month}
                      </Button>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          ))}

          {isTyping && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
              <Box
                sx={{
                  padding: 2,
                  borderRadius: 2,
                  backgroundColor: '#1e293b',
                  color: '#e5e7eb',
                }}
              >
                <Typography variant="body2" sx={{ color: '#9ca3af', fontStyle: 'italic' }}>
                  Typing...
                </Typography>
              </Box>
            </Box>
          )}

          {/* Show predefined questions if it's the welcome message */}
          {messages.length === 1 && messages[0].type === 'bot' && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2, fontWeight: 500 }}>
                Suggested questions:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {predefinedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outlined"
                    onClick={() => handleQuestionClick(question)}
                    sx={{
                      textAlign: 'left',
                      textTransform: 'none',
                      justifyContent: 'flex-start',
                      borderColor: 'rgba(148, 163, 184, 0.25)',
                      color: '#e5e7eb',
                      padding: 1.5,
                      '&:hover': {
                        borderColor: '#0ea5e9',
                        backgroundColor: 'rgba(14, 165, 233, 0.1)',
                      },
                    }}
                  >
                    {question}
                  </Button>
                ))}
              </Box>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>

        {/* Input Area */}
        <Box
          sx={{
            padding: 2,
            borderTop: '1px solid rgba(148, 163, 184, 0.25)',
            backgroundColor: '#0f172a',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isTyping}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#1e293b',
                  color: '#e5e7eb',
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
                '& .MuiInputBase-input::placeholder': {
                  color: '#9ca3af',
                  opacity: 1,
                },
              }}
            />
            <IconButton
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isTyping}
              sx={{
                backgroundColor: '#0ea5e9',
                color: 'white',
                width: 56,
                height: 56,
                '&:hover': {
                  backgroundColor: '#0284c7',
                },
                '&:disabled': {
                  backgroundColor: '#475569',
                  color: '#64748b',
                },
              }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}

export default Chatbot;

