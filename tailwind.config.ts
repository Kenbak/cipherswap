import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cipher: {
          bg: 'var(--color-bg)',
          elevated: 'var(--color-elevated)',
          surface: 'var(--color-surface)',
          hover: 'var(--color-hover)',
          active: 'var(--color-active)',
          border: 'var(--color-border)',
          'border-alpha': 'rgb(var(--color-border-rgb) / <alpha-value>)',

          'bg-dark': '#08090F',
          'surface-dark': '#14161F',
          'bg-light': '#FAFBFC',
          'surface-light': '#FFFFFF',
          'border-light': '#E2E8F0',

          cyan: 'rgb(var(--color-cyan-rgb) / <alpha-value>)',
          'cyan-bright': '#00D4FF',
          'cyan-glow': '#00E5FF',
          'cyan-muted': '#5EBBCE',

          green: 'rgb(var(--color-green-rgb) / <alpha-value>)',
          'green-bright': '#00E676',

          purple: 'rgb(var(--color-purple-rgb) / <alpha-value>)',
          'purple-bright': '#A78BFA',
          'purple-glow': '#C4B5FD',

          yellow: 'rgb(var(--color-yellow-rgb) / <alpha-value>)',
          'yellow-bright': '#F4B728',
          'yellow-glow': '#FFD060',
          'yellow-muted': '#C9A035',

          orange: 'rgb(var(--color-orange-rgb) / <alpha-value>)',
          'orange-bright': '#FF6B35',

          text: {
            primary: '#E5E7EB',
            secondary: '#9CA3AF',
            muted: '#6B7280',
          },
        },
        glass: {
          2: 'var(--glass-2)',
          3: 'var(--glass-3)',
          4: 'var(--glass-4)',
          6: 'var(--glass-6)',
          8: 'var(--glass-8)',
          12: 'var(--glass-12)',
          18: 'var(--glass-18)',
        },
      },

      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Geist', 'SF Pro Display', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'Berkeley Mono', 'JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['var(--font-geist-sans)', 'Geist', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],
        'sm': ['0.875rem', { lineHeight: '1.5' }],
        'base': ['1rem', { lineHeight: '1.5' }],
        'lg': ['1.25rem', { lineHeight: '1.4' }],
        'xl': ['1.5rem', { lineHeight: '1.3' }],
        '2xl': ['1.875rem', { lineHeight: '1.25' }],
        '3xl': ['2.375rem', { lineHeight: '1.2' }],
        '4xl': ['3rem', { lineHeight: '1.1' }],
      },

      borderRadius: {
        'sm': '6px',
        'DEFAULT': '8px',
        'md': '10px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
      },

      boxShadow: {
        'card': '0 2px 4px rgba(0, 0, 0, 0.04), 0 8px 16px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 8px rgba(0, 0, 0, 0.06), 0 16px 32px rgba(0, 0, 0, 0.1)',
        'sm': '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.04)',
        'lg': '0 4px 8px rgba(0, 0, 0, 0.04), 0 16px 32px rgba(0, 0, 0, 0.08)',
        'glow': '0 0 20px rgba(0, 212, 255, 0.15)',
        'glow-lg': '0 0 40px rgba(0, 212, 255, 0.2)',
      },

      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'glow': 'glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 212, 255, 0.5)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },

      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      transitionDuration: {
        'fast': '150ms',
        'normal': '250ms',
        'slow': '400ms',
      },
    },
  },
  plugins: [],
};

export default config;
