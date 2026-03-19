/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text',
          'SF Pro Display', 'Helvetica Neue', 'Arial', 'sans-serif',
        ],
      },
      colors: {
        // Apple color palette
        apple: {
          blue:        '#0071E3',
          'blue-dark': '#0064CC',
          'blue-soft': 'rgba(0,113,227,0.10)',
          gray:        '#F5F5F7',
          'gray-2':    '#E8E8ED',
          'gray-3':    '#D2D2D7',
          'gray-4':    '#86868B',
          'gray-5':    '#6E6E73',
          'gray-6':    '#424245',
          ink:         '#1D1D1F',
          red:         '#FF3B30',
          green:       '#34C759',
          orange:      '#FF9500',
          yellow:      '#FFCC00',
        },
      },
      borderRadius: {
        'apple':    '12px',
        'apple-lg': '18px',
        'apple-xl': '24px',
      },
      boxShadow: {
        'apple-sm': '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)',
        'apple':    '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
        'apple-lg': '0 4px 6px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.10)',
        'apple-modal': '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
      },
      backdropBlur: {
        apple: '20px',
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      letterSpacing: {
        'apple-tight': '-0.022em',
        'apple-wide':  '0.01em',
      },
    },
  },
  plugins: [],
};
