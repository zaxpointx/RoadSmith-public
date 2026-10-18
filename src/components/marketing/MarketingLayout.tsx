'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Logo } from './Logo'

type NavItem = { label: string; href: string }

const NAV: NavItem[] = [
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Operator console', href: '/#operators' },
  { label: 'Demo', href: '/demo' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
]

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return undefined
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  return (
    <div className="rs-marketing">
      <a className="rs-skip-link" href="#main-content">Skip to content</a>
      <nav className="rs-nav" aria-label="Main navigation">
        <div className="rs-nav-inner">
          <Logo href="/" size="md" />
          <div className="rs-nav-links">
            {NAV.map((item) => (
              <Link key={item.label} href={item.href} className="rs-nav-link">
                {item.label}
              </Link>
            ))}
            <Link href="/contact" className="rs-cta rs-cta-primary rs-cta-glow">
              Start a conversation
            </Link>
          </div>
          <button
            type="button"
            className="rs-mobile-menu-button"
            aria-expanded={menuOpen}
            aria-controls="rs-mobile-menu"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menuOpen && (
          <div id="rs-mobile-menu" className="rs-mobile-menu">
            {NAV.map((item) => (
              <Link key={item.label} href={item.href} className="rs-nav-link" onClick={() => setMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
            <Link href="/contact" className="rs-cta rs-cta-primary" onClick={() => setMenuOpen(false)}>
              Start a conversation
            </Link>
          </div>
        )}
      </nav>
      <div id="main-content">{children}</div>
      <footer className="rs-footer">
        <div className="rs-footer-inner">
          <Logo href="/" size="sm" />
          <div className="rs-footer-links">
            <Link href="/pricing" className="rs-nav-link">Pricing</Link>
            <Link href="/faq" className="rs-nav-link">FAQ</Link>
            <Link href="/contact" className="rs-nav-link">Contact</Link>
            <Link href="/demo" className="rs-nav-link">Demo</Link>
            <Link href="/login" className="rs-nav-link">Sign in</Link>
            <Link href="/legal/terms" className="rs-nav-link">Terms</Link>
            <Link href="/legal/privacy" className="rs-nav-link">Privacy</Link>
          </div>
          <span className="rs-footer-copy">© 2026 Roadsmith</span>
        </div>
      </footer>
    </div>
  )
}
