import React, { useRef, useCallback } from 'react';
import styles from './PullToRefresh.module.css';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

const PULL_THRESHOLD = 60;

export function PullToRefresh({ onRefresh, children, disabled = false }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const refreshing = useRef(false);

  /** Find scroll position of the nearest scrollable ancestor or window */
  const getScrollTop = useCallback((): number => {
    let el = containerRef.current?.parentElement;
    while (el) {
      // Quick check without getComputedStyle for performance
      if (el.scrollTop > 0) return el.scrollTop;
      if (el.scrollHeight > el.clientHeight + 1) {
        const ov = el.style.overflowY;
        if (ov === 'auto' || ov === 'scroll') return el.scrollTop;
        // Only use getComputedStyle as fallback
        const computed = getComputedStyle(el).overflowY;
        if (computed === 'auto' || computed === 'scroll') return el.scrollTop;
      }
      el = el.parentElement;
    }
    return window.scrollY || 0;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || refreshing.current) return;
    if (getScrollTop() > 2) return;
    startY.current = e.touches[0].pageY;
    pulling.current = true;
  }, [disabled, getScrollTop]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing.current) return;
    const diff = e.touches[0].pageY - startY.current;

    if (diff > 0 && getScrollTop() <= 2) {
      if (e.cancelable) e.preventDefault();
    } else {
      pulling.current = false;
    }
  }, [getScrollTop]);

  const handleTouchEnd = useCallback(async (e: React.TouchEvent) => {
    if (!pulling.current || refreshing.current) return;
    pulling.current = false;

    const diff = e.changedTouches[0].pageY - startY.current;
    if (diff >= PULL_THRESHOLD) {
      refreshing.current = true;
      try {
        await onRefresh();
      } finally {
        refreshing.current = false;
      }
    }
  }, [onRefresh]);

  return (
    <div
      className={styles.container}
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
