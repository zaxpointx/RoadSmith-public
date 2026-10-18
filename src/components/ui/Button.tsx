'use client'

import React from 'react'
import Link from 'next/link'

type ButtonVariant = 'glow' | 'ghost' | 'pill' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  href?: string
  onClick?: () => void
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
  style?: React.CSSProperties
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  glow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 28px',
    background: '#FFFFFF',
    color: '#000000',
    fontFamily: "'Inter', sans-serif",
    fontSize: '14px',
    fontWeight: '700',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s',
    whiteSpace: 'nowrap',
  },
  ghost: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 28px',
    background: 'transparent',
    color: '#FFFFFF',
    fontFamily: "'Inter', sans-serif",
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background 0.2s, border-color 0.2s, transform 0.2s',
    whiteSpace: 'nowrap',
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: 'var(--accent)',
    color: '#000000',
    fontSize: '13px',
    fontWeight: '700',
    borderRadius: '999px',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'transform 0.2s, box-shadow 0.2s, opacity 0.2s',
    whiteSpace: 'nowrap',
  },
  outline: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontFamily: "'Inter', sans-serif",
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background 0.2s, border-color 0.2s',
    whiteSpace: 'nowrap',
  },
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '8px 16px', fontSize: '13px' },
  md: {},
  lg: { padding: '18px 36px', fontSize: '16px' },
}

function getHoverStyle(variant: ButtonVariant): React.CSSProperties {
  const base: React.CSSProperties = { transform: 'translateY(-1px)' }
  if (variant === 'glow') return { ...base, boxShadow: '0 0 32px rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.3)' }
  if (variant === 'ghost') return { ...base, background: 'rgba(255,255,255,0.05)', borderColor: 'var(--border-hover)' }
  if (variant === 'pill') return { ...base, boxShadow: '0 0 16px var(--accent-glow)' }
  return base
}

function resetStyle(variant: ButtonVariant): React.CSSProperties {
  if (variant === 'glow') return { transform: '', boxShadow: '' }
  if (variant === 'ghost') return { transform: '', background: '', borderColor: '' }
  if (variant === 'pill') return { transform: '', boxShadow: '' }
  return { transform: '' }
}

export function Button({ children, variant = 'glow', size = 'md', href, onClick, disabled, className = '', type = 'button', style = {} }: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    ...variantStyles[variant],
    ...sizeStyles[size],
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    ...style,
  }

  const hoverStyle = getHoverStyle(variant)
  const reset = resetStyle(variant)

  const content = <span style={{ position: 'relative' }}>{children}</span>

  const handlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      if (!disabled) Object.assign(e.currentTarget.style, hoverStyle)
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      if (!disabled) Object.assign(e.currentTarget.style, reset)
    },
  }

  if (href) {
    return (
      <Link href={href} className={className} style={baseStyle} {...handlers}>
        {content}
      </Link>
    )
  }

  return (
    <button type={type} className={className} style={baseStyle} disabled={disabled} onClick={onClick} {...handlers}>
      {content}
    </button>
  )
}