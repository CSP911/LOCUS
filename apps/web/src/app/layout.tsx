import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LŌCUS',
  description: '당신의 중심점.',
  keywords: ['locus', 'gravity', 'mindspace'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="bg-locus-bg text-white antialiased">
        {children}
      </body>
    </html>
  )
}
