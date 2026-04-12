import React from 'react';
import styles from './ActionProcessingLoader.module.css';

interface ActionProcessingLoaderProps {
  isOpen: boolean;
  message?: string;
  logoUrl?: string;
}

const SPICY_TEXTS = [
  "Cooking up something delicious...",
  "Setting up your tiffin kitchen...",
  "Arranging your delicious meals...",
  "Almost there, just a pinch of spice...",
  "Your food journey is starting...",
  "Baking your fresh plans...",
  "Getting the delivery route ready..."
];

export default function ActionProcessingLoader({ 
  isOpen, 
  message, 
  logoUrl = '/logo.png' 
}: ActionProcessingLoaderProps) {
  const [displayText, setDisplayText] = React.useState(message || SPICY_TEXTS[0]);

  React.useEffect(() => {
    if (isOpen && !message) {
      const interval = setInterval(() => {
        setDisplayText(prev => {
          const currentIndex = SPICY_TEXTS.indexOf(prev);
          const nextIndex = (currentIndex + 1) % SPICY_TEXTS.length;
          return SPICY_TEXTS[nextIndex];
        });
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isOpen, message]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.bg}>
        <img src="/bg.png" alt="" className={styles.bgImg} />
        <div className={styles.blur} />
      </div>
      
      <div className={styles.content}>
        <div className={styles.logoWrap}>
          <img src={logoUrl} alt="Logo" className={styles.logo} />
        </div>
        <p className={styles.message}>{message || displayText}</p>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} />
        </div>
      </div>
    </div>
  );
}
