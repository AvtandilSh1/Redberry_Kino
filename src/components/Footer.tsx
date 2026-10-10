import { Link } from 'react-router-dom'
import { Logo } from './Logo'

export function Footer() {
  return (
    <footer className="footer">
      <Link to="/" aria-label="Kino XII home">
        <Logo />
      </Link>
      <p>© 2026 Kino XII. All rights reserved.</p>
    </footer>
  )
}
