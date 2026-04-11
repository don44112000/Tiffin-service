import { RefreshCw } from 'lucide-react';
import styles from './RefreshButton.module.css';

interface Props {
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export default function RefreshButton({ onRefresh, isRefreshing = false }: Props) {
  return (
    <button
      className={`${styles.btn} ${isRefreshing ? styles.spinning : ''}`}
      onClick={onRefresh}
      disabled={isRefreshing}
      aria-label="Refresh"
    >
      <RefreshCw size={16} />
      <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
    </button>
  );
}
