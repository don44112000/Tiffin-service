import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ToastContainer from './components/Toast/Toast';
import BottomNav from './components/BottomNav/BottomNav';

import LoginPage from './pages/Login/LoginPage';
import RegisterPage from './pages/Register/RegisterPage';
import HomePage from './pages/Home/HomePage';
import MyOrdersPage from './pages/MyOrders/MyOrdersPage';
import AddMealPage from './pages/AddMeal/AddMealPage';
import ExtendPlanPage from './pages/ExtendPlan/ExtendPlanPage';
import ReportPage from './pages/Report/ReportPage';
import ProfilePage from './pages/Profile/ProfilePage';

import { ROUTES } from './utils/constants';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />;
  return <>{children}</>;
}

function AppLayout() {
  const { user } = useAuth();

  return (
    <>
      <ToastContainer />
      <Routes>
        {/* Public */}
        <Route path={ROUTES.LOGIN} element={user ? <Navigate to={ROUTES.HOME} replace /> : <LoginPage />} />
        <Route path={ROUTES.REGISTER} element={user ? <Navigate to={ROUTES.HOME} replace /> : <RegisterPage />} />

        {/* Protected */}
        <Route path={ROUTES.HOME} element={
          <ProtectedRoute><HomePage /></ProtectedRoute>
        } />
        <Route path={ROUTES.ORDERS} element={
          <ProtectedRoute><MyOrdersPage /></ProtectedRoute>
        } />
        <Route path={ROUTES.ADD_MEAL} element={
          <ProtectedRoute><AddMealPage /></ProtectedRoute>
        } />
        <Route path={ROUTES.EXTEND_PLAN} element={
          <ProtectedRoute><ExtendPlanPage /></ProtectedRoute>
        } />
        <Route path={ROUTES.REPORT} element={
          <ProtectedRoute><ReportPage /></ProtectedRoute>
        } />
        <Route path={ROUTES.PROFILE} element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={user ? ROUTES.HOME : ROUTES.LOGIN} replace />} />
      </Routes>

      {/* Bottom nav shown only for authenticated users on non-auth pages */}
      {user && <BottomNav />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppLayout />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
