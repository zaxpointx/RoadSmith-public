import './globals.css'

export const metadata = {
  title: 'Roadsmith — The operating layer for driving schools',
  description: 'Roadsmith brings parent intake, travel-aware context, payments, reminders, bookings, and post-lesson notes into a clearer operating brief for driving-school owners.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  )
}
