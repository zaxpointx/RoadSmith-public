'use client'

interface PrimaryButtonProps {
  children: React.ReactNode
  type?: 'button' | 'submit' | 'reset'
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
}

export function PrimaryButton({
  children,
  type = 'button',
  onClick,
  disabled,
  loading,
  fullWidth = true,
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`primary-btn ${fullWidth ? 'full-width' : ''} ${loading ? 'loading' : ''}`}
    >
      {loading ? (
        <span className="btn-loading">Loading...</span>
      ) : (
        children
      )}

      <style jsx>{`
        .primary-btn {
          background: var(--success);
          border: 1px solid var(--success);
          color: #0a0a05;
          font-size: 14px;
          font-weight: 600;
          padding: 14px 24px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: relative;
          overflow: hidden;
        }

        .primary-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
          transition: left 0.5s;
        }

        .primary-btn:hover::before {
          left: 100%;
        }

        .primary-btn:active {
          transform: scale(0.97);
        }

        .full-width {
          width: 100%;
        }

        .primary-btn:hover:not(:disabled) {
          background: #6ef59d;
          border-color: #6ef59d;
          box-shadow: 0 0 24px rgba(74, 222, 128, 0.3);
        }

        .primary-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .loading {
          opacity: 0.6;
        }

        .btn-loading {
          display: inline-block;
        }
      `}</style>
    </button>
  )
}

interface SocialButtonProps {
  provider: 'google' | 'github'
  onClick?: () => void
}

export function SocialButton({ provider, onClick }: SocialButtonProps) {
  const icons = {
    google: (
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
    github: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  }

  const labels = {
    google: 'Continue with Google',
    github: 'Continue with GitHub',
  }

  return (
    <button type="button" onClick={onClick} className="social-btn">
      <span className="social-icon">{icons[provider]}</span>
      <span className="social-label">{labels[provider]}</span>

      <style jsx>{`
        .social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 12px 16px;
          background: var(--surface);
          border: 1px solid var(--auth-border);
          border-radius: 6px;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .social-btn:hover {
          background: var(--cta-bg-hover);
        }

        .social-icon {
          display: flex;
          align-items: center;
        }

        .social-label {
          flex: 1;
        }
      `}</style>
    </button>
  )
}

interface AuthLinkProps {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  align?: 'left' | 'center' | 'right'
}

export function AuthLink({ children, href, onClick, align = 'left' }: AuthLinkProps) {
  const className = `auth-link align-${align}`

  if (href) {
    return (
      <a href={href} className={className}>
        {children}

        <style jsx>{`
          .auth-link {
            font-size: 13px;
            font-weight: 400;
            color: var(--accent-gold);
            text-decoration: none;
            transition: color 0.2s;
          }

          .auth-link:hover {
            color: var(--accent-gold-hover);
          }

          .align-left {
            text-align: left;
          }

          .align-center {
            text-align: center;
          }

          .align-right {
            text-align: right;
          }
        `}</style>
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}

      <style jsx>{`
        .auth-link {
          font-size: 13px;
          font-weight: 400;
          color: var(--accent-gold);
          text-decoration: none;
          transition: color 0.2s;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          font-family: inherit;
        }

        .auth-link:hover {
          color: var(--accent-gold-hover);
        }

        .align-left {
          text-align: left;
        }

        .align-center {
          text-align: center;
        }

        .align-right {
          text-align: right;
        }
      `}</style>
    </button>
  )
}
