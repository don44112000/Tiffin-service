import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.text}>
        Made with <span className={styles.heart}>❤️</span>
      </p>
      <a 
        href="https://www.linkedin.com/in/omlokhande/" 
        target="_blank" 
        rel="noopener noreferrer" 
        className={styles.nameLink}
      >
        Om Lokhande
      </a>
    </footer>
  );
}
