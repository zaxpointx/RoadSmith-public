import './globals.css'
import { overpass } from './fonts'

export const metadata = {
  title: 'Roadsmith — the front desk for driving schools, by text',
  description: 'Roadsmith answers families, books lessons around real drive times, collects payments and keeps instructors on schedule — by text.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={overpass.variable}>
      <body>{children}</body>
    </html>
  )
}
