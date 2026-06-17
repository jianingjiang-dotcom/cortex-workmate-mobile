/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // /12 alpha step (bg-ios-green/12 …) isn't in Tailwind's default 5-step scale
      opacity: { 12: '0.12' },
      colors: {
        // iOS system palette — gray5/6 + accents are theme-aware (CSS vars)
        ios: {
          // rgb(<channels> / <alpha-value>) so opacity modifiers (bg-ios-blue/10 …)
          // actually compile — a plain var(--blue) color silently drops every /N utility
          blue: 'rgb(var(--blue-rgb) / <alpha-value>)',
          green: 'rgb(var(--green-rgb) / <alpha-value>)',
          red: 'rgb(var(--red-rgb) / <alpha-value>)',
          orange: 'rgb(var(--orange-rgb) / <alpha-value>)',
          yellow: '#FFCC00',
          gray: '#8E8E93',
          gray2: '#AEAEB2',
          gray3: '#C7C7CC',
          gray4: '#D1D1D6',
          gray5: 'var(--fill-press)',
          gray6: 'var(--fill)',
        },
        // Cortex DS: single purple accent (#CC79FF). All the historical "brand.*"
        // stops collapse to it; blue is links-only, orange is the warn/CTA hue.
        brand: {
          primary: '#CC79FF',
          blue: '#407CFF',
          indigo: '#CC79FF',
          violet: '#CC79FF',
          purple: '#CC79FF',
          pink: '#CC79FF',
          orange: '#FFA03B',
          amber: '#FFA03B',
        },
        link: 'var(--link)',
        label: {
          primary: 'var(--label-primary)',
          secondary: 'var(--label-secondary)',
          tertiary: 'var(--label-tertiary)',
        },
        // semantic surfaces / separators
        surface: 'var(--surface)',
        grouped: 'var(--grouped)',
        divider: 'var(--divider)',
        input: 'var(--input-border)',
        hairline: 'var(--hairline)',
      },
      fontFamily: {
        // Cortex DS typeface: Inter, with a native fallback chain
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'PingFang SC',
          'Microsoft YaHei',
          'Noto Sans SC',
          'Arial',
          'sans-serif',
        ],
        mono: ['SF Mono', 'ui-monospace', 'Menlo', 'Monaco', 'monospace'],
      },
      backgroundImage: {
        // Cortex Linear — brand gradient (logo / hero / brand moments only)
        'brand-gradient':
          'linear-gradient(135deg, #407CFF 0%, #CC79FF 60%, #FFA03B 100%)',
        'brand-gradient-soft':
          'linear-gradient(135deg, rgba(64,124,255,0.12) 0%, rgba(204,121,255,0.12) 55%, rgba(255,160,59,0.12) 100%)',
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
