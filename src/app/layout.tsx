import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '🎡 Lucky Wheel Event',
  description: 'Cuba nasib anda di Lucky Wheel Event! Menangi RM100, RM288, RM388, RM588 dan 5G GOLD!',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎡</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  )
}
