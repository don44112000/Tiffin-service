import { useLoading } from '../../context/LoadingContext';
import styles from './GlobalLoader.module.css';

export function GlobalLoader() {
  const { isLoading } = useLoading();

  if (!isLoading) return null;

  return (
    <div className={styles.loader}>
      <div className={styles.bar} />
    </div>
  );
}
