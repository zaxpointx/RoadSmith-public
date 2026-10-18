'use client'

import React from 'react'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  hoverable?: boolean
}

export function GlassCard({ children, className = '', style = {}, onClick, hoverable = false }: GlassCardProps) {
  const baseStyle: React.CSSProperties = {
    background: 'var(--glass-bg)',
    backdropFilter: 'var(--glass-blur, blur(24px))',
    WebkitBackdropFilter: 'var(--glass-blur, blur(24px))',
    border: '1px solid var(--glass-border)',
    borderRadius: '24px',
    padding: '32px',
    boxShadow: 'var(--glass-shadow)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.3s, border-color 0.3s',
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  }

  const hoverStyle: React.CSSProperties = hoverable ? {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px var(--accent, rgba(74,222,128,0.15)), inset 0 1px 0 rgba(255,255,255,0.08)',
  } : {}

  return (
    <div
      className={`glass-card ${className}`}
      style={{ ...baseStyle, ...hoverStyle }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}