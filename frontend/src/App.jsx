import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import SalesTPV from './pages/SalesTPV';
import Inventory from './pages/Inventory';
import Production from './pages/Production';
import Payroll from './pages/Payroll';
import Finance from './pages/Finance';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="sales" element={<SalesTPV />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="production" element={<Production />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="finance" element={<Finance />} />
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
