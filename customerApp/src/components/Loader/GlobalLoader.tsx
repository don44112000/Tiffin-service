import { useLocation } from 'react-router-dom';
import { useLoading } from '../../hooks/useLoading';
import { ROUTES } from '../../utils/constants';
import './GlobalLoader.css';

export default function GlobalLoader() {
  const { isLoading } = useLoading();
  const location = useLocation();
  const isLoginPage = location.pathname === ROUTES.LOGIN || location.pathname === ROUTES.REGISTER;

  if (!isLoading || isLoginPage) return null;

  return (
    <div className="global-progress-container">
      <div className="global-progress-bar" />
    </div>
  );
}
