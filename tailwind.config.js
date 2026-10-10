/** Palette taken from the Shaheen Lahori Kites invoice: deep navy, kite yellow, kite red, sky. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { ink: '#0E2A47', kite: '#FFC20E', kred: '#D7263D', sky: '#EEF4FA', leaf: '#16803C' },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
