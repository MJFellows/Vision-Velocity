/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // DRAFT brand palette — claude/brand-design-document-draft.md
        // Section 4.3. Update these four values, not call sites, once the
        // brand is confirmed (see that doc's open questions).
        navy: {
          DEFAULT: '#0B1F3B',
          50: '#EEF1F6',
          700: '#0B1F3B',
          900: '#071627',
        },
        accent: {
          DEFAULT: '#FF381F',
          hover: '#E22E17',
        },
        grey: {
          DEFAULT: '#E9EDF2',
        },
        charcoal: {
          DEFAULT: '#1F2937',
        },
      },
      fontFamily: {
        display: ['var(--font-montserrat)', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        card: '0.75rem',
      },
    },
  },
  plugins: [],
};

module.exports = config;
