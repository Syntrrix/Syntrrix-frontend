import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './panels/admin/AdminLayout';
import BuyerLayout from './panels/buyer/BuyerLayout';
import AdminDashboard from './panels/admin/pages/AdminDashboard';
import BuyerSeller from './panels/admin/pages/BuyerSeller';
import SellerManagement from './panels/admin/pages/SellerManagement';
import BuyerManagement from './panels/admin/pages/BuyerManagement';
import CreateBuyer from './panels/admin/pages/CreateBuyer';
import CreateSeller from './panels/admin/pages/CreateSeller';
import CreatePlan from './panels/admin/pages/CreatePlan';
import BuyerDashboard from './panels/buyer/pages/BuyerDashboard';
import Orders from './panels/buyer/pages/Orders';
import Vendors from './panels/buyer/pages/Vendors';
import SellerLayout from './panels/seller/SellerLayout';
import Inventory from './panels/seller/pages/Inventory';
import SellerDashboard from './panels/seller/pages/SellerDashboard';
import Shipments from './panels/seller/pages/Shipments';
import Suppliers from './panels/seller/pages/Suppliers';
import NewPurchase from './panels/seller/pages/NewPurchase';
import PurchaseHistory from './panels/seller/pages/PurchaseHistory';
import CustomerPurchase from './panels/seller/pages/CustomerPurchase';
import CustomerSell from './panels/seller/pages/CustomerSell';
import CustomerPayment from './panels/seller/pages/CustomerPayment';
import CustomerOutstanding from './panels/seller/pages/CustomerOutstanding';
import Customers from './panels/seller/pages/Customers';
import Invoice from './panels/seller/pages/Invoice';
import SupplierPayment from './panels/seller/pages/SupplierPayment';
import Outstanding from './panels/seller/pages/Outstanding';
import AddProduct from './panels/seller/pages/AddProduct';
import ProductList from './panels/seller/pages/ProductList';
import StockIn from './panels/seller/pages/StockIn';
import StockOut from './panels/seller/pages/StockOut';
import Billing from './panels/seller/pages/Billing';
import Categories from './panels/seller/pages/Categories';
import SellerProfile from './panels/seller/pages/SellerProfile';
import Chatbot from './panels/seller/pages/Chatbot';
import CreateBoat from './panels/seller/pages/CreateBoat';
import BotList from './panels/seller/pages/BotList';
import BotDetails from './panels/seller/pages/BotDetails';
import OnlineEntry from './panels/seller/pages/OnlineEntry';
import WhatsAppIntegration from './panels/seller/pages/WhatsAppIntegration';
import DataHubCollections from './panels/seller/pages/DataHubCollections';
import OnlineOrders from './panels/seller/pages/OnlineOrders';
import LeadPipeline from './panels/seller/pages/LeadPipeline';
import BotWidget from './panels/widget/BotWidget';
import LiveChatSession from './panels/seller/pages/LiveChatSession';
import Reports from './panels/seller/pages/Reports';
import BotTester from './panels/seller/pages/BotTester';
import UserManagement from './panels/seller/pages/UserManagement';
import TeamMemberLayout from './panels/team/TeamMemberLayout';
import TeamManagerDashboard from './panels/team/TeamManagerDashboard';
import AgentDashboard from './panels/team/AgentDashboard';
import TeamProfile from './panels/team/TeamProfile';
import LiveChatSupport from './panels/seller/pages/LiveChatSupport';
import ProtectedRoute from './components/routing/ProtectedRoute';
import Login from './pages/Login';
import { ROLE_IDS } from './constants/roles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2f855a',
    },
    secondary: {
      main: '#6b46c1',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route index element={<Navigate to="/login" replace />} />

          <Route path="/login" element={<Login />} />
          <Route path="/widget/bot" element={<BotWidget />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={[ROLE_IDS.ADMIN]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="create-seller" element={<CreateSeller />} />
            <Route path="create-buyer" element={<CreateBuyer />} />
            <Route path="buyer-seller" element={<BuyerSeller />} />
            <Route path="seller-management" element={<SellerManagement />} />
            <Route path="buyer-management" element={<BuyerManagement />} />
            <Route path="create-plan" element={<CreatePlan />} />
          </Route>

          <Route
            path="/seller"
            element={
              <ProtectedRoute allowedRoles={[ROLE_IDS.SELLER]}>
                <SellerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<SellerDashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="shipments" element={<Shipments />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="purchases/new" element={<NewPurchase />} />
            <Route path="purchases/history" element={<PurchaseHistory />} />
            <Route path="payments" element={<SupplierPayment />} />
            <Route path="outstanding" element={<Outstanding />} />
            <Route path="products/add" element={<AddProduct />} />
            <Route path="products/list" element={<ProductList />} />
            <Route path="stock-in" element={<StockIn />} />
            <Route path="stock-out" element={<StockOut />} />
            <Route path="billing" element={<Billing />} />
            <Route path="categories" element={<Categories />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/purchase" element={<CustomerPurchase />} />
            <Route path="customers/sell" element={<CustomerSell />} />
            <Route path="customers/payment" element={<CustomerPayment />} />
            <Route path="customers/outstanding" element={<CustomerOutstanding />} />
            <Route path="customers/invoice" element={<Invoice />} />
            <Route path="chatbot" element={<Chatbot />} />
            <Route path="create-boat" element={<CreateBoat />} />
            <Route path="bots" element={<BotList />} />
            <Route path="bots/:botId" element={<BotDetails />} />
            <Route path="whatsapp" element={<WhatsAppIntegration />} />
            <Route path="whatsapp/online-entry" element={<OnlineEntry />} />
            <Route path="data-hub" element={<DataHubCollections />} />
            <Route path="lead-pipeline" element={<LeadPipeline />} />
            <Route path="online-orders" element={<OnlineOrders />} />
            <Route path="live-chat/:customerId" element={<LiveChatSession />} />
            <Route path="live-chat-support" element={<LiveChatSupport />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/bot" element={<BotTester />} />
            <Route path="user-management" element={<UserManagement />} />
            <Route path="profile" element={<SellerProfile />} />
          </Route>

          <Route
            path="/team-manager"
            element={
              <ProtectedRoute allowedRoles={[ROLE_IDS.TEAM_MANAGER]}>
                <TeamMemberLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<TeamManagerDashboard />} />
            <Route path="live-chat-support" element={<LiveChatSupport />} />
            <Route path="lead-pipeline" element={<LeadPipeline />} />
            <Route path="data-hub" element={<DataHubCollections />} />
            <Route path="profile" element={<TeamProfile />} />
          </Route>

          <Route
            path="/agent"
            element={
              <ProtectedRoute allowedRoles={[ROLE_IDS.AGENT]}>
                <TeamMemberLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AgentDashboard />} />
            <Route path="live-chat-support" element={<LiveChatSupport />} />
            <Route path="lead-pipeline" element={<LeadPipeline />} />
            <Route path="data-hub" element={<DataHubCollections />} />
            <Route path="profile" element={<TeamProfile />} />
          </Route>

          <Route
            path="/buyer"
            element={
              <ProtectedRoute allowedRoles={[ROLE_IDS.BUYER]}>
                <BuyerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<BuyerDashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="vendors" element={<Vendors />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
