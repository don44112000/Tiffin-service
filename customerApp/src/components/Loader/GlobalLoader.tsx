import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLoading } from '../../hooks/useLoading';
import { 
  HomePageSkeleton, 
  CalendarSkeleton, 
  ReportSkeleton, 
  ProfileSkeleton,
  SkeletonCard,
  SkeletonText
} from '../Skeleton/Skeleton';
import { ROUTES } from '../../utils/constants';
import './GlobalLoader.css';

export default function GlobalLoader() {
  const { isLoading } = useLoading();
  const { user } = useAuth();
  const location = useLocation();
  const isLoginPage = location.pathname === ROUTES.LOGIN || location.pathname === ROUTES.REGISTER;

  if (!isLoading || isLoginPage) return null;

  const renderSkeleton = () => {
    switch (location.pathname) {
      case ROUTES.HOME:
        return <HomePageSkeleton />;
      case ROUTES.ORDERS:
        return <CalendarSkeleton />;
      case ROUTES.REPORT:
        return <ReportSkeleton />;
      case ROUTES.PROFILE:
        return <ProfileSkeleton />;
      default:
        return (
          <div style={{ padding: '16px' }}>
            <SkeletonText lines={3} />
            <div style={{ height: '20px' }} />
            <SkeletonCard height={200} />
          </div>
        );
    }
  };

  return (
    <div className={`global-loader-overlay ${!user ? 'no-nav' : ''}`}>
      <div className="skeleton-container">
        {renderSkeleton()}
      </div>
    </div>
  );
}
