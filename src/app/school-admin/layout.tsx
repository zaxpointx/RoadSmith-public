import { ReactNode } from 'react'
import AdminShell from '@/components/admin/AdminShell'

export default function SchoolAdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
