/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'rgba(255, 255, 255, 0.1)',
        input: '#1A1B20',
        ring: '#FF5722',
        background: '#0A0A0A',
        foreground: '#E5E5E5',
        primary: {
          50: '#FFF3E0',
          100: '#FFE0B2',
          DEFAULT: '#FF5722',
          500: '#FF5722',
          700: '#E64A19',
          900: '#BF360C',
          foreground: '#FFFFFF',
        },
        neutral: {
          50: '#E5E5E5',
          100: '#CCCCCC',
          300: '#707070',
          500: '#3D3D3D',
          700: '#1A1B20',
          900: '#0A0A0A',
        },
        secondary: {
          DEFAULT: '#1A1B20',
          foreground: '#E5E5E5',
        },
        accent: {
          DEFAULT: '#FF5722',
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT: '#F44336',
          foreground: '#FFFFFF',
        },
        success: '#4CAF50',
        warning: '#FFC107',
        error: '#F44336',
        info: '#2196F3',
        muted: {
          DEFAULT: '#3D3D3D',
          foreground: '#CCCCCC',
        },
        popover: {
          DEFAULT: '#1A1B20',
          foreground: '#E5E5E5',
        },
        card: {
          DEFAULT: 'rgba(26, 27, 32, 0.6)',
          foreground: '#E5E5E5',
        },
      },
      fontFamily: {
        display: ['"Reckless Neue"', '"Tiempos Headline"', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '1.4' }],
        'sm': ['14px', { lineHeight: '1.5' }],
        'base': ['16px', { lineHeight: '1.6' }],
        'lg': ['20px', { lineHeight: '1.5' }],
        'xl': ['24px', { lineHeight: '1.4' }],
        '2xl': ['32px', { lineHeight: '1.3' }],
        '3xl': ['48px', { lineHeight: '1.2' }],
        '4xl': ['64px', { lineHeight: '1.1' }],
        '5xl': ['80px', { lineHeight: '1.05' }],
      },
      spacing: {
        '18': '72px',
        '22': '88px',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        full: '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.3)',
        'card': '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'modal': '0 24px 48px rgba(0, 0, 0, 0.6)',
        'glow-orange': '0 0 24px rgba(255, 87, 34, 0.3)',
      },
      backdropBlur: {
        'card': '20px',
        'modal': '40px',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 24px rgba(255, 87, 34, 0.3)' },
          '50%': { boxShadow: '0 0 32px rgba(255, 87, 34, 0.5)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      transitionDuration: {
        'fast': '150ms',
        'base': '250ms',
        'slow': '400ms',
        'slowest': '600ms',
      },
      transitionTimingFunction: {
        'default': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'out': 'cubic-bezier(0, 0, 0.2, 1)',
        'in': 'cubic-bezier(0.4, 0, 1, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
