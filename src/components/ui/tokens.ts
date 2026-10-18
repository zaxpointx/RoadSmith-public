// Shared design tokens — use these instead of hardcoded colors
// All tokens map to globals.css CSS variables

export const tokens = {
  // Backgrounds
  bgBase: 'var(--bg-base)',
  bgSurface: 'var(--bg-surface)',
  bgElevated: 'var(--bg-elevated)',

  // Text
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',

  // Borders
  border: 'var(--border)',
  borderHover: 'var(--border-hover)',

  // Accent
  accent: 'var(--accent)',
  accentGlow: 'var(--accent-glow)',
  accentSecondary: 'var(--accent-secondary)',

  // Semantic
  success: 'var(--success)',
  glassBg: 'var(--glass-bg)',
  glassBorder: 'var(--glass-border)',
  glassBlur: 'var(--glass-blur)',
  glassShadow: 'var(--glass-shadow)',

  // Card
  cardBg: 'var(--card-bg)',
  cardHover: 'var(--card-hover)',
  cardBorder: 'var(--card-border)',
  cardShadow: 'var(--card-shadow)',

  // Chart
  chartLine: 'var(--chart-line)',
  chartFill: 'var(--chart-fill)',

  // Typography
  fontDisplay: "'Outfit', sans-serif",
  fontBody: "'Inter', system-ui, sans-serif",
} as const

// Color aliases for quick reference (same values, different names)
export const colors = {
  accent: 'var(--accent)',
  accentGreen: '#4ADE80',
  accentOrange: '#F97316',
  accentCyan: '#22D3EE',
  accentPurple: '#A855F7',
  white: '#FFFFFF',
  black: '#000000',
} as const

// Spacing scale
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
  '4xl': '96px',
} as const

// Border radius scale
export const radius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  full: '999px',
} as const

// Shadow definitions
export const shadows = {
  card: '0 20px 40px rgba(0,0,0,0.4)',
  cardHover: '0 8px 32px rgba(0,0,0,0.5)',
  glass: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
  glow: '0 0 32px rgba(74,222,128,0.15)',
} as const