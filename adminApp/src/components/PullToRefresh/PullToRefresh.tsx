import React, { useState, useRef } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';
import styles from './PullToRefresh.module.css';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({ onRefresh, children, disabled = false }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  const getScrollTop = (): number => {
    const el = containerRef.current;
    if (!el) return 0;
    for (const child of Array.from(el.children)) {
      const c = child as HTMLElement;
      if (c.scrollHeight > c.clientHeight) return c.scrollTop;
    }
    return el.scrollTop;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing || getScrollTop() > 5) return;
    startY.current = e.touches[0].pageY;
    setIsPulling(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    const diff = e.touches[0].pageY - startY.current;

    if (diff > 0 && getScrollTop() === 0) {
      if (e.cancelable) e.preventDefault();
      setPullDistance(Math.min(MAX_PULL, diff * 0.4));
    } else {
      setIsPulling(false);
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling || isRefreshing) return;
    setIsPulling(false);

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  const isTriggered = pullDistance >= PULL_THRESHOLD;
  const indicatorOpacity = Math.min(1, pullDistance / PULL_THRESHOLD);
  const arrowRotation = isTriggered ? 180 : Math.round((pullDistance / PULL_THRESHOLD) * 180);

  return (
    <div
      className={styles.container}
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={styles.indicator}
        style={{ opacity: indicatorOpacity, height: pullDistance > 0 || isRefreshing ? 48 : 0 }}
      >
        <div className={`${styles.iconWrap}${isRefreshing ? ` ${styles.active}` : ''}`}>
          {isRefreshing ? (
            <RefreshCw size={18} className={styles.spinning} />
          ) : (
            <ArrowDown
              size={18}
              style={{ transform: `rotate(${arrowRotation}deg)`, transition: isTriggered ? 'transform 0.2s' : 'none' }}
            />
          )}
        </div>
        <span className={styles.label}>
          {isRefreshing ? 'Refreshing\u2026' : isTriggered ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>

      {/* Scrollable content */}
      <div
        className={styles.content}
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}
