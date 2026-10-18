# SPEC — Full Redesign: Dark Premium (DesignJoy-Inspired)
# The Driving Center SaaS

## Reference: DesignJoy Screenshots
- Hero: Massive editorial typography, asymmetric split, floating glassmorphic card with mesh gradient, generous whitespace
- Process: Three-column Subscribe/Request/Receive cards with product mockups inside
- Benefits: Editorial serif italic headlines, vibrant mesh gradient feature cards
- Booking: True black (#000000), neon accent colors (pink/blue/green), pill-shaped UI
- Login: Dark glassmorphic modal, frosted glass blur, subtle mesh gradient background
- Admin dashboard: Dark glassmorphic, frosted glass overlays, clean data cards

---

## DESIGN DIRECTION: Dark Premium

### Philosophy
- True black background (#000000) for maximum depth
- Vibrant accent colors pop against black — like neon signs
- Editorial typography creates premium feel
- Generous whitespace (negative space = confidence)
- Glassmorphic cards with subtle blur for depth
- Mesh gradient accents for energy without overwhelming

---

## COLOR PALETTE (Dark Only)

```
--bg-base: #000000           /* True black */
--bg-surface: #0F0F0F         /* Card backgrounds */
--bg-elevated: #141414        /* Elevated elements */
--text-primary: #FFFFFF       /* White */
--text-secondary: #9CA3AF      /* Muted */
--text-muted: #6B7280         /* Dim */
--border: rgba(255,255,255,0.06)
--border-hover: rgba(255,255,255,0.12)

--accent: #1A56FF             /* Vibrant blue (primary CTA) */
--accent-glow: rgba(26,86,255,0.20)
--accent-secondary: #F97316   /* Vibrant orange */
--success: #4ADE80            /* Green */
--danger: #EF4444             /* Red */
--warning: #F59E0B            /* Amber */

--admin-bg: #000000
--admin-surface: #0F0F0F
--admin-elevated: #141414
--admin-border: rgba(255,255,255,0.06)
--admin-accent: #4ADE80
--admin-accent-secondary: #3B82F6

/* Mesh gradient accents */
--mesh-purple: #8B5CF6
--mesh-pink: #EC4899
--mesh-blue: #3B82F6
--mesh-orange: #F97316
--mesh-yellow: #FACC15
```

---

## LANDING PAGE

### Typography
- **Display:** Inter 800, clamp(56px, 7vw, 88px), letter-spacing -0.03em, line-height 1.0
- **Headlines:** Outfit 700, 36-48px, letter-spacing -0.02em
- **Body:** Inter 400, 17px, line-height 1.7, text-secondary color
- **Labels:** Inter 600, 12px, all-caps, letter-spacing 0.08em

### Hero Section
- **Background:** True black (#000000) with subtle mesh gradient overlay (purple top-left, pink bottom-right at low opacity)
- **Headline:** Massive (clamp 56-88px), Inter 800, tight tracking. Punchy, benefit-driven. NO cheesy "get paid" language.
- **Accent word in headline:** Italic or gradient-colored word for emphasis
- **Subheadline:** 18px, text-secondary, max 50ch, short and punchy
- **CTA:** Pill button, accent blue, arrow icon
- **Floating card (right side):** Glassmorphic card with mesh gradient header strip, soft shadow, showing admin dashboard preview inside
- **Navbar:** Fixed, transparent, logo left, nav links center, CTA right

### Features Section
- **Section header:** Large, centered, Inter 700
- **Cards:** 3-column grid, dark surface, subtle border, mesh gradient strip at top of each card
- **Icon + title + 2-line description per card**

### Process Section
- **Three columns:** Subscribe → Request → Receive
- **Each card:** Dark surface, large number, title, short description, product preview mockup

### Social Proof
- Muted brand logo strip (grayscale, 40% opacity)
- Large testimonial cards with serif italic quotes

### CTA Section
- **Background:** #0F0F0F or mesh-subtle gradient
- **Massive centered headline, single pill CTA**

---

## LOGIN PAGE

### Design
- **Background:** #000000 with mesh gradient radial blurs (purple top-left, pink bottom-right, blue center)
- **Modal:** Centered glassmorphic card, backdrop-blur 32px, soft white border glow
- **Logo:** Top center
- **Headline:** "Welcome back" or similar, Inter 700
- **Inputs:** Dark fill (#0F0F0F), subtle border, pill-shaped, focus glow in accent color
- **Primary CTA:** White solid button (high contrast against dark)
- **Social login:** Google button, pill-shaped, same style as inputs
- **Links:** "Forgot password?", "Create account" — text-secondary, small

---

## SCHOOL ADMIN — ALL PAGES (Consistent Design)

### Sidebar (shared across ALL admin pages)
- **Background:** #0F0F0F, 240px wide, fixed left
- **Logo at top**
- **Nav items:** Icon + label, full width, 44px height
- **Active state:** Left border accent, slightly lighter background
- **Hover:** Subtle background change
- **Bottom:** User avatar + name

### Top Bar (shared across ALL admin pages)
- **Page title:** Left side, Outfit 600, 24px
- **Right:** Notification bell, user avatar
- **Background:** transparent (content area is dark)

### Content Area
- **Background:** #000000
- **Max-width:** 1200px, padding 32px
- **Cards:** #0F0F0F, border 1px rgba(255,255,255,0.06), border-radius 16px

### ALL Sub-pages MUST match:
`/school-admin` + `/students` + `/instructors` + `/sessions` + `/calendar` + `/billing` + `/profile` + `/availability` + `/ops` + `/import`

### Component Standards
- **Buttons:** Pill-shaped (border-radius 999px)
- **Tables:** Dark header (#141414), hover rows, status pills in cells
- **Forms:** admin-input class, consistent focus states
- **Modals:** Glassmorphic overlay, centered, blur backdrop

---

## ARCHITECTURE

### Shared Components to Build
- `@/components/admin/Sidebar.tsx` — reusable sidebar
- `@/components/admin/TopBar.tsx` — reusable top bar
- `@/components/ui/GlassCard.tsx` — already exists
- `@/components/ui/Button.tsx` — already exists
- `@/components/ui/StatusPill.tsx` — already exists

### CSS Classes
All utility classes already in globals.css: `.glass-card`, `.admin-sidebar`, `.admin-card`, `.admin-input`, `.btn-pill`, `.status-pill`, `.login-bg`, `.login-modal`, `.hero-gradient`, `.mesh-gradient`, `.mesh-subtle`

### Rules
- NO hardcoded colors — use CSS variables or globals.css classes
- All admin pages use shared Sidebar + TopBar components
- Landing page uses landing-* utility classes from globals.css

---

## MISSION CONTROL
- Stays dark, separate from admin design
- Not part of this redesign
