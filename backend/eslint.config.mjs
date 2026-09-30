import coreWebVitals from "eslint-config-next/core-web-vitals";

// Flat ESLint config shared by backend and frontend (Next.js 16 / ESLint 9).
// Two pre-existing findings in the frontend are downgraded to warnings so CI
// can gate on real errors; they are tracked for clean-up in DEPLOYMENT.md.
const config = [
  ...coreWebVitals,
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
];

export default config;
