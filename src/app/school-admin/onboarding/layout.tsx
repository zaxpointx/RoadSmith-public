'use client'

import { ReactNode } from 'react'

/**
 * Minimal layout for the onboarding wizard — no sidebar, full-screen experience.
 * Overrides the parent /school-admin/layout.tsx.
 */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
