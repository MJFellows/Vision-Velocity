export const metadata = {
  title: 'Vision Velocity — API',
  description: 'Vision Velocity backend (Next.js App Router API routes).',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
