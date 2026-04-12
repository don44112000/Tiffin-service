import styles from './VegIndicator.module.css';

interface Props {
  type: 'veg' | 'non-veg';
  size?: 'sm' | 'md';
}

export default function VegIndicator({ type, size = 'md' }: Props) {
  return (
    <div
      className={`${styles.indicator} ${type === 'veg' ? styles.veg : styles.nonveg} ${styles[size]}`}
      title={type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
    >
      <div className={styles.dot} />
    </div>
  );
}
