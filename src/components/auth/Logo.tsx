'use client'

import Link from 'next/link'

export function Logo() {
  return (
    <Link href="/" className="auth-logo">
      <div className="logo-icon">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
          <path d="M8 2L13 5.5H3L8 2Z" fill="white" />
          <path d="M3 5.5V10.5L8 14V8.5H13V5.5H3Z" fill="white" fillOpacity="0.7" />
        </svg>
      </div>
      <span className="logo-text">Roadsmith</span>

      <style jsx>{`
        .auth-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          margin-bottom: 32px;
        }

        .logo-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #4ade80, #2dd4bf);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          animation: float 3s ease-in-out infinite;
        }

        .logo-text {
          font-family: 'Outfit', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: 0.08em;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </Link>
  )
}
