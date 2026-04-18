import { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday, addMonths, subMonths, isBefore, startOfDay, parseISO,
} from 'date-fns';
import { BottomSheet } from '../BottomSheet/BottomSheet';
import styles from './DatePickerInput.module.css';

interface Props {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
  maxDate?: string;
}

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function DatePickerInput({ value, onChange, minDate, maxDate }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => value ? parseISO(value) : new Date());

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const monthLabel = format(viewDate, 'MMMM yyyy');

  const handleSelect = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const isDayDisabled = (day: Date) => {
    const d = startOfDay(day);
    if (minDate && isBefore(d, startOfDay(parseISO(minDate)))) return true;
    if (maxDate && isBefore(startOfDay(parseISO(maxDate)), d)) return true;
    return false;
  };

  return (
    <>
      <button
        type="button"
        className={styles.inputBtn}
        onClick={() => {
          setViewDate(value ? parseISO(value) : new Date());
          setIsOpen(true);
        }}
      >
        <CalendarIcon size={18} className={styles.icon} />
        <span className={styles.valueText}>
          {value ? format(parseISO(value), 'EEE, dd MMM yyyy') : 'Select date...'}
        </span>
      </button>

      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="Select Date">
        <div className={styles.calendar}>
          <div className={styles.header}>
            <button type="button" className={styles.navBtn} onClick={() => setViewDate(subMonths(viewDate, 1))}>
              <ChevronLeft size={20} />
            </button>
            <span className={styles.monthLabel}>{monthLabel}</span>
            <button type="button" className={styles.navBtn} onClick={() => setViewDate(addMonths(viewDate, 1))}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div className={styles.grid}>
            {DAY_NAMES.map((d) => (
              <div key={d} className={styles.dayName}>{d}</div>
            ))}

            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isCurrentMonth = isSameMonth(day, monthStart);
              const disabled = isDayDisabled(day);
              const isSelected = value === dateStr;
              const isDayToday = isToday(day);

              return (
                <button
                  key={dateStr}
                  type="button"
                  className={`${styles.dayCell} ${!isCurrentMonth ? styles.otherMonth : ''} ${disabled ? styles.disabled : ''} ${isSelected ? styles.selected : ''}`}
                  disabled={disabled}
                  onClick={() => handleSelect(day)}
                >
                  <span className={`${styles.dayNumber} ${isDayToday && !isSelected ? styles.today : ''}`}>
                    {format(day, 'd')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
