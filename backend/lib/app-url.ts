/** The public frontend address used in emailed links (first CLIENT_APP_URL origin, else NEXT_PUBLIC_APP_URL). */
export function frontendUrl(): string {
  const fromCors = (process.env.CLIENT_APP_URL ?? '').split(',').map((s) => s.trim()).find((s) => s.startsWith('https://'));
  const fromApp = process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') ? process.env.NEXT_PUBLIC_APP_URL : undefined;
  return (fromCors || fromApp || 'https://visionvelocity.com.au').replace(/\/$/, '');
}
