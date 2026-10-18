# Roadsmith public website design decisions

## Scope

These decisions apply to the public marketing surface only. Authenticated operator surfaces retain their existing contracts and visual systems.

## Audience and promise

Roadsmith is presented to owner-operators of driving schools. The public site explains the operating layer: parent intake, travel-aware context, owner approval, payments, reminders, booking, and post-lesson notes. Claims must be supported by repository or approved product documentation.

## Page composition

The public home page follows this order:

1. Minimal navigation
2. Oversized owner-focused hero
3. Dark product/browser proof frame
4. Owner-approval and travel-aware principles
5. Editorial operating-layer explanation
6. Three-step process: see, understand, approve
7. Benefits grounded in documented behavior
8. Request-demo/contact CTA
9. Contact-sales offer section without numeric pricing
10. Footer and legal links

## Visual direction

- Near-black full-bleed background with restrained dark surfaces.
- Violet/purple is the primary brand emphasis; green/lime is reserved for live or positive status signals.
- Use modern sans typography for body and UI. Use restrained italic/serif contrast only for emotional headline turns.
- Product proof uses quiet borders, compact labels, dark panels, semantic status dots, and a clear hierarchy.
- Editorial sections use generous spacing and saturated color fields only where they support the narrative.
- Do not copy reference-brand logos, names, claims, text, or exact compositions.

## Interaction rules

- Primary CTA is request a demo or start a trial, routed through an existing verified Roadsmith flow.
- Interactive controls must have at least a 44px effective target.
- Mobile navigation must be keyboard accessible, close on Escape, and preserve visible focus.
- FAQ uses native disclosure behavior or an equivalently accessible implementation.
- Public forms show explicit loading, success, and safe failure states.
- Illustrative product UI is labeled as demo or preview data when it could be mistaken for live data.

## Commercial language

The public pricing surface uses contact-sales language. Do not display numeric pricing, plan names, customer counts, testimonials, performance metrics, or outcome claims unless explicitly verified and approved.

## Non-goals

- No redesign of authenticated school-admin, instructor, or Mission Control surfaces.
- No new database schema for the public site without separate approval.
- No live Stripe charge, Supabase mutation, Resend message, deployment, or hosted configuration change during local verification.
- No fixed-slot description for behind-the-wheel scheduling where the documented model is travel-aware and derived.
