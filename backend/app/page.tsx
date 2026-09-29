/**
 * Placeholder root page. This repository is the backend/API layer only
 * (see /app/api) — the public landing page, admin dashboard, and charity
 * portal are a separate frontend build (build-plan.md, Phase 2 onward).
 */
export default function Home() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Vision Velocity API</h1>
      <p>This is the backend service. See /app/api for available routes.</p>
    </main>
  );
}
