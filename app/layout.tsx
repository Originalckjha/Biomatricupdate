import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Biometric Live Dashboard',
  description: 'Real-time attendance monitoring — see who checks in and out instantly.',
  keywords: ['biometric', 'attendance', 'ZKTeco', 'N9', 'live', 'dashboard', 'check in'],
  authors: [{ name: 'Biometric Live' }],
  robots: 'noindex, nofollow', // private internal tool
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Biometric Live',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#030712',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
