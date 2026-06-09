/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // iOS system palette — gray5/6 + accents are theme-aware (CSS vars)
        ios: {
          blue: 'var(--blue)',
          green: 'var(--green)',
          red: 'var(--red)',
          orange: 'var(--orange)',
          yellow: '#FFCC00',
          gray: '#8E8E93',
          gray2: '#AEAEB2',
          gray3: '#C7C7CC',
          gray4: '#D1D1D6',
          gray5: 'var(--fill-press)',
          gray6: 'var(--fill)',
        },
        // Cortex brand gradient stops (theme-independent)
        brand: {
          primary: '#A855F7', // solid color for all core primary buttons
          blue: '#5B7CFA',
          indigo: '#6D6AF0',
          violet: '#A06AF0',
          purple: '#B96AE8',
          pink: '#E07AD0',
          orange: '#FF9F5A',
          amber: '#FFB259',
        },
        label: {
          primary: 'var(--label-primary)',
          secondary: 'var(--label-secondary)',
          tertiary: 'var(--label-tertiary)',
        },
        // semantic surfaces / separators
        surface: 'var(--surface)',
        grouped: 'var(--grouped)',
        divider: 'var(--divider)',
        hairline: 'var(--hairline)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'SF Pro Display',
          'PingFang SC',
          'Helvetica Neue',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: ['SF Mono', 'ui-monospace', 'Menlo', 'Monaco', 'monospace'],
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(135deg, #5B7CFA 0%, #8A6AF0 45%, #C76AE0 70%, #FF9F5A 100%)',
        'brand-gradient-soft':
          'linear-gradient(135deg, rgba(91,124,250,0.14) 0%, rgba(160,106,240,0.14) 50%, rgba(255,159,90,0.14) 100%)',
      },
      boxShadow: {
        ios: '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
        'ios-md': '0 4px 16px rgba(0,0,0,0.08)',
        'ios-lg': '0 12px 40px rgba(0,0,0,0.16)',
        sheet: '0 -2px 24px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        ios: '10px',
        'ios-lg': '14px',
        'ios-xl': '20px',
      },
      fontSize: {
        'ios-lg-title': ['34px', { lineHeight: '41px', letterSpacing: '0.37px', fontWeight: '700' }],
        'ios-title': ['22px', { lineHeight: '28px', fontWeight: '700' }],
        'ios-body': ['17px', { lineHeight: '22px' }],
        'ios-callout': ['16px', { lineHeight: '21px' }],
        'ios-subhead': ['15px', { lineHeight: '20px' }],
        'ios-footnote': ['13px', { lineHeight: '18px' }],
        'ios-caption': ['12px', { lineHeight: '16px' }],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.6' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        shimmer: 'shimmer 1.4s linear infinite',
        'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
      },
    },
  },
  plugins: [],
}
