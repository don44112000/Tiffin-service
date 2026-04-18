import { Search, X } from 'lucide-react';
import styles from './SearchBar.module.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search...' }: Props) {
  return (
    <div className={styles.wrapper}>
      <Search size={18} className={styles.icon} />
      <input
        type="text"
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button className={styles.clear} onClick={() => onChange('')} aria-label="Clear search">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
