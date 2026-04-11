import { useState, useEffect } from 'react';
import styles from './StepperInput.module.css';

interface Props {
  value: number;
  onChange: (v: number) => void;
  onError?: (hasError: boolean) => void;
  min?: number;
  max?: number;
}

export default function StepperInput({ value, onChange, onError, min = 1, max = 99 }: Props) {
  const [internalVal, setInternalVal] = useState(value.toString());
  const [isInvalid, setIsInvalid] = useState(false);

  // Sync from props
  useEffect(() => {
    setInternalVal(value.toString());
    setIsInvalid(false);
    if (onError) onError(false);
  }, [value, onError]);

  const validate = (valStr: string) => {
    const parsed = parseInt(valStr, 10);
    const invalid = isNaN(parsed) || parsed < min || parsed > max;
    setIsInvalid(invalid);
    if (onError) onError(invalid);
    return { parsed, invalid };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInternalVal(val);
    const { parsed, invalid } = validate(val);
    if (!invalid) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    const { parsed } = validate(internalVal);
    // If it's pure NaN/empty blur, just reset gracefully.
    if (isNaN(parsed)) {
      setInternalVal(value.toString());
      setIsInvalid(false);
      if (onError) onError(false);
    }
    // Else, leave the red input exactly as typed.
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className={`${styles.stepper} ${isInvalid ? styles.error : ''}`}>
      <button
        className={styles.btn}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease"
      >−</button>
      <input 
        type="number"
        className={styles.input}
        value={internalVal}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        inputMode="numeric"
      />
      <button
        className={styles.btn}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase"
      >+</button>
    </div>
  );
}
