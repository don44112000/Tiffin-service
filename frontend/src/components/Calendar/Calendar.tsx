import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  eachDayOfInterval, format, isSameMonth, isToday,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek
} from 'date-fns';
import type { Order } from '../../types';
import styles from './Calendar.module.css';

interface Props {
  year: number;
  month: number;
  orders: Order[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getIndicator(order: Order | undefined, isLunch: boolean) {
  if (!order) return <span className={`${styles.indicator} ${styles.empty}`} />;
  if (order.is_skipped) return <span className={`${styles.indicator} ${styles.skipped}`}>―</span>;
  if (order.is_delivered) return <span className={`${styles.indicator} ${styles.delivered}`}>✓</span>;
  return <span className={`${styles.indicator} ${isLunch ? styles.lunch : styles.dinner}`} />;
}

export default function Calendar({ year, month, orders, selectedDate, onSelectDate, onMonthChange }: Props) {
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  // Build fast lookup: date string -> {lunch, dinner}
  const orderMap = useMemo(() => {
    const map: Record<string, { lunch?: Order; dinner?: Order }> = {};
    for (const o of orders) {
      if (!map[o.date]) map[o.date] = {};
      map[o.date][o.slot] = o;
    }
    return map;
  }, [orders]);

  const goBack = () => {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  };

  const goForward = () => {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  };

  const monthLabel = format(new Date(year, month - 1), 'MMMM yyyy');

  return (
    <div className={styles.calendar}>
      {/* Month nav */}
      <div className={styles.monthNav}>
        <button className={styles.navBtn} onClick={goBack} aria-label="Previous month">
          <ChevronLeft size={20} />
        </button>
        <span className={styles.monthLabel}>{monthLabel}</span>
        <button className={styles.navBtn} onClick={goForward} aria-label="Next month">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <span><span className={`${styles.legendBox} ${styles.lunch}`}/> Lunch</span>
        <span><span className={`${styles.legendBox} ${styles.dinner}`}/> Dinner</span>
        <span><span className={`${styles.legendBox} ${styles.delivered}`}>✓</span> Delivered</span>
        <span><span className={`${styles.legendBox} ${styles.skipped}`}>―</span> Skipped</span>
      </div>

      {/* Day headers */}
      <div className={styles.grid}>
        {DAY_NAMES.map((d) => (
          <div key={d} className={styles.dayName}>{d}</div>
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isDayToday = isToday(day);
          const isSelected = selectedDate === dateStr;
          const dayOrders = orderMap[dateStr];

          return (
            <button
              key={dateStr}
              className={`
                ${styles.dayCell}
                ${!isCurrentMonth ? styles.otherMonth : ''}
                ${isDayToday ? styles.today : ''}
                ${isSelected ? styles.selected : ''}
              `}
              onClick={() => isCurrentMonth && onSelectDate(dateStr)}
              disabled={!isCurrentMonth}
            >
              <span className={styles.dayNumber}>{format(day, 'd')}</span>
              <div className={styles.indicators}>
                {getIndicator(dayOrders?.lunch, true)}
                {getIndicator(dayOrders?.dinner, false)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
