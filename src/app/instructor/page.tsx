import { redirect } from 'next/navigation'

/**
 * Instructor landing page — resolves session and redirects to the dashboard.
 * Protected: redirects to /instructor/login if no session found.
 */
export default async function InstructorLandingPage() {
  // The actual auth/dashboard logic lives in /instructor/dashboard.
  // This page exists so /instructor is a valid protected route.
  redirect('/instructor/dashboard')
}
