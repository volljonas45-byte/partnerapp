/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text',
          'SF Pro Display', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif',
        ],
      },
      colors: {
        apple: {
          blue:        '#007AFF',
          'blue-hover':'#0071EB',
          'blue-soft': 'rgba(0,122,255,0.08)',
          gray:        '#F5F5F7',
          'gray-2':    '#E8E8ED',
          'gray-3':    '#D2D2D7',
          'gray-4':    '#86868B',
          'gray-5':    '#6E6E73',
          'gray-6':    '#48484A',
          ink:         '#1D1D1F',
          red:         '#FF3B30',
          green:       '#34C759',
          orange:      '#FF9500',
          yellow:      '#FFCC00',
          purple:      '#AF52DE',
        },
      },
      borderRadius: {
        'apple':    '12px',
        'apple-lg': '16px',
        'apple-xl': '20px',
      },
      boxShadow: {
        'apple-sm': '0 0 0 0.5px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04)',
        'apple':    '0 0 0 0.5px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03), 0 6px 20px rgba(0,0,0,0.04)',
        'apple-lg': '0 0 0 0.5px rgba(0,0,0,0.03), 0 4px 24px rgba(0,0,0,0.08)',
        'apple-modal': '0 0 0 0.5px rgba(0,0,0,0.06), 0 20px 60px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.06)',
      },
      backdropBlur: {
        apple: '24px',
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'apple-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      letterSpacing: {
        'apple-tight': '-0.022em',
        'apple-body':  '-0.009em',
      },
    },
  },
  plugins: [],
};
