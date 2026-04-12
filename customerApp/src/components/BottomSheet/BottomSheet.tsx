import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from './BottomSheet.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={sheetRef}
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.handle} />
        {title && (
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        )}
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
