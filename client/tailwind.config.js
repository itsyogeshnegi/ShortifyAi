export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Space Grotesk', 'ui-sans-serif', 'system-ui'],
        body: ['Manrope', 'ui-sans-serif', 'system-ui']
      },
      colors: {
        ink: '#061018',
        ember: '#ff7a45',
        mint: '#6ef3c5',
        frost: '#dcefff'
      },
      boxShadow: {
        glow: '0 24px 80px rgba(110, 243, 197, 0.16)'
      }
    }
  },
  plugins: []
};
