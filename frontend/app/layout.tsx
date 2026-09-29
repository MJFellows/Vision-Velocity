import type { Metadata } from 'next';
import { Montserrat, Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import '@/styles/globals.css';

// CSS variables consumed by tailwind.config.js theme.extend.fontFamily (font-display / font-body).
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-montserrat',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Vision Velocity',
  description: 'Helping charities run sausage sizzles and other fundraising catering events.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${montserrat.variable} ${inter.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
