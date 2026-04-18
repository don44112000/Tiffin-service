import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AdminAuthProvider, useAuth } from './context/AuthContext';
import { LoadingProvider } from './context/LoadingContext';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/Toast/ToastContainer';
import { GlobalLoader } from './components/GlobalLoader/GlobalLoader';
import { AppLayout } from './components/AppLayout/AppLayout';
import { ROUTES } from './utils/constants';

import { DeliveryPage } from './pages/DeliveryPage/DeliveryPage';
import { AdminLoginPage } from './pages/AdminLogin/AdminLoginPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { CustomerDirectoryPage } from './pages/Customers/CustomerDirectoryPage';
import { CustomerDetailPage } from './pages/CustomerDetail/CustomerDetailPage';
import { MenuPage } from './pages/Menu/MenuPage';
import { ReconciliationPage } from './pages/Reconciliation/ReconciliationPage';

function ProtectedRoute() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to={ROUTES.ADMIN_LOGIN} replace />;
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <LoadingProvider>
          <ToastProvider>
            <Routes>
              {/* Public routes */}
              <Route path={ROUTES.DELIVERY} element={<DeliveryPage />} />
              <Route path={ROUTES.ADMIN_LOGIN} element={<AdminLoginPage />} />

              {/* Protected admin routes */}
              <Route path="/admin" element={<ProtectedRoute />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="delivery" element={<DeliveryPage />} />
                <Route path="customers" element={<CustomerDirectoryPage />} />
                <Route path="customers/:userId" element={<CustomerDetailPage />} />
                <Route path="menu" element={<MenuPage />} />
                <Route path="reconciliation" element={<ReconciliationPage />} />
                <Route index element={<Navigate to="dashboard" replace />} />
              </Route>

              <Route path="*" element={<Navigate to={ROUTES.DELIVERY} replace />} />
            </Routes>
            <ToastContainer />
            <GlobalLoader />
          </ToastProvider>
        </LoadingProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
