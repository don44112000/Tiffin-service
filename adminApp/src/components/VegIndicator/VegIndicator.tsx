import styles from './VegIndicator.module.css';

interface Props {
  type: 'veg' | 'non-veg';
  size?: 'sm' | 'md';
}

export function VegIndicator({ type, size = 'md' }: Props) {
  const isVeg = type === 'veg';
  return (
    <span
      className={`${styles.indicator} ${styles[size]}`}
      style={{
        borderColor: isVeg ? 'var(--color-veg)' : 'var(--color-nonveg)',
      }}
      aria-label={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
    >
      <span
        className={styles.dot}
        style={{
          background: isVeg ? 'var(--color-veg)' : 'var(--color-nonveg)',
        }}
      />
    </span>
  );
}
