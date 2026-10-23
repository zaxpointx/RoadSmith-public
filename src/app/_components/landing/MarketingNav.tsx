'use client'

import Link from 'next/link'
import { useState } from 'react'

function Arrow() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
}

function Brand() {
  return <Link className="rs-brand" href="/" aria-label="Roadsmith home"><span className="rs-brand-mark" aria-hidden="true">R</span><span>ROADSMITH</span></Link>
}

export function MarketingNav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="rs-nav">
      <Brand />
      <nav aria-label="Main navigation" className={open ? 'rs-nav-links is-open' : 'rs-nav-links'}>
        <a href="#how-it-works" onClick={() => setOpen(false)}>How it works</a>
        <a href="#operators" onClick={() => setOpen(false)}>For operators</a>
        <a href="#pricing" onClick={() => setOpen(false)}>Pricing</a>
      </nav>
      <div className="rs-nav-actions">
        <Link className="rs-nav-cta" href="/demo/operator-review">Open the demo <Arrow /></Link>
        <button
          className="rs-menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="rs-mobile-navigation"
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setOpen((value) => !value)}
        >
          <span aria-hidden="true">{open ? '×' : 'Menu'}</span>
        </button>
      </div>
      <div id="rs-mobile-navigation" className={open ? 'rs-mobile-navigation is-open' : 'rs-mobile-navigation'}>
        <a href="#how-it-works" onClick={() => setOpen(false)}>How it works</a>
        <a href="#operators" onClick={() => setOpen(false)}>For operators</a>
        <a href="#pricing" onClick={() => setOpen(false)}>Pricing</a>
      </div>
    </header>
  )
}
