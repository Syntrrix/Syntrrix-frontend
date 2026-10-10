import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  TrendingUp,
  ShoppingCart,
  AttachMoney,
  LocalShipping,
  CheckCircle,
  Inventory,
} from '@mui/icons-material';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';

// KPI Card Component
const KPICard = ({ title, value, change, icon, color }) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 2,
        border: `1px solid ${alpha(color, 0.2)}`,
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: `0 4px 12px ${alpha(color, 0.2)}`,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              backgroundColor: alpha(color, 0.1),
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
          <Chip
            label={change}
            size="small"
            icon={<TrendingUp sx={{ fontSize: 14 }} />}
            color="success"
            sx={{ fontWeight: 600, height: 24 }}
          />
        </Box>
        <Typography variant="h4" fontWeight={700} color="text.primary" gutterBottom>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {title}
        </Typography>
      </CardContent>
    </Card>
  );
};

// Chart Card Component
const ChartCard = ({ title, children, height = 320 }) => {
  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom color="text.primary" mb={2}>
          {title}
        </Typography>
        <Box sx={{ flexGrow: 1 }}>{children}</Box>
      </CardContent>
    </Card>
  );
};

// Data
const spendData = [
  { month: 'Jan', budget: 12, actual: 10 },
  { month: 'Feb', budget: 13, actual: 12 },
  { month: 'Mar', budget: 14, actual: 15 },
  { month: 'Apr', budget: 15, actual: 13 },
  { month: 'May', budget: 16, actual: 18 },
  { month: 'Jun', budget: 18, actual: 17 },
];

const fulfillmentSplit = [
  { name: 'On Time', value: 72, fill: '#10b981' },
  { name: 'Delayed', value: 18, fill: '#f59e0b' },
  { name: 'Cancelled', value: 10, fill: '#ef4444' },
];

const qualityTrend = [
  { week: 'W1', freshness: 92 },
  { week: 'W2', freshness: 88 },
  { week: 'W3', freshness: 94 },
  { week: 'W4', freshness: 91 },
];

const orderTrend = [
  { month: 'Jan', orders: 45, deliveries: 42 },
  { month: 'Feb', orders: 52, deliveries: 50 },
  { month: 'Mar', orders: 48, deliveries: 46 },
  { month: 'Apr', orders: 61, deliveries: 59 },
  { month: 'May', orders: 55, deliveries: 53 },
  { month: 'Jun', orders: 67, deliveries: 65 },
];

const kpiData = [
  {
    title: 'Total Orders',
    value: '1,234',
    change: '+15.3%',
    icon: <ShoppingCart />,
    color: '#8b5cf6',
  },
  {
    title: 'Total Spend',
    value: '₹89.5L',
    change: '+12.1%',
    icon: <AttachMoney />,
    color: '#f59e0b',
  },
  {
    title: 'Active Vendors',
    value: '24',
    change: '+8.2%',
    icon: <LocalShipping />,
    color: '#10b981',
  },
  {
    title: 'On-Time Delivery',
    value: '92%',
    change: '+5.4%',
    icon: <CheckCircle />,
    color: '#3b82f6',
  },
];

function BuyerDashboard() {
  const theme = useTheme();

  return (
    <Box sx={{ width: '100%', height: '100%', p: 3 }}>
      {/* Header Section */}
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700} gutterBottom color="text.primary">
          Buyer Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor procurement health and KPIs
        </Typography>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2.5} mb={3}>
        {kpiData.map((kpi, index) => (
          <Grid item xs={12} sm={6} md={6} lg={3} key={index}>
            <KPICard {...kpi} />
          </Grid>
        ))}
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} md={8}>
          <ChartCard title="Monthly Spend vs Budget (₹ crores)" height={320}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                <XAxis dataKey="month" stroke={theme.palette.text.secondary} fontSize={12} />
                <YAxis stroke={theme.palette.text.secondary} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="budget"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorBudget)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorActual)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <ChartCard title="Fulfillment Split" height={320}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fulfillmentSplit}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {fulfillmentSplit.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard title="Freshness Ratings" height={320}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={qualityTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                <XAxis dataKey="week" stroke={theme.palette.text.secondary} fontSize={12} />
                <YAxis domain={[80, 100]} stroke={theme.palette.text.secondary} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="freshness"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Freshness (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard title="Orders & Deliveries Trend" height={320}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                <XAxis dataKey="month" stroke={theme.palette.text.secondary} fontSize={12} />
                <YAxis stroke={theme.palette.text.secondary} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="deliveries" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}

export default BuyerDashboard;
