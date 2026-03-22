import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0B1E39',
        cyan: '#3BC8F6',
        amber: '#F5A524',
        panel: '#E5E7EB',
        ink: '#0F172A',
      },
      boxShadow: {
        card: '0 2px 18px rgba(11,30,57,0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
