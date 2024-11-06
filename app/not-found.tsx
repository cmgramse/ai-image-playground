import Link from 'next/link'
import styles from './not-found.module.css'

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h2 className={styles.title}>Not Found</h2>
        <p className={styles.message}>Could not find requested resource</p>
        <Link href="/" className={styles.link}>
          Return Home
        </Link>
      </div>
    </div>
  )
}
