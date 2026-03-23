import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans KR"', 'sans-serif'],
        serif: ['"Noto Serif KR"', 'serif'],
      },
      colors: {
        // Design token colors — used as semantic aliases
        // Actual values come from CSS variables in index.css
        accent: 'var(--accent)',
        purple: 'var(--purple)',
        rose: 'var(--rose)',
        teal: 'var(--teal)',
        bg: {
          DEFAULT: 'var(--bg)',
          surface: 'var(--bg-surface)',
          card: 'var(--bg-card)',
          'card-hover': 'var(--bg-card-hover)',
          elevated: 'var(--bg-elevated)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        border: {
          DEFAULT: 'var(--border)',
          hover: 'var(--border-hover)',
          accent: 'var(--border-accent)',
        },
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        card: 'var(--radius)',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4,0,0.2,1)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      maxWidth: {
        content: '1400px',
      },
    },
  },
  plugins: [],
} satisfies Config;
