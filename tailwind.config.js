const { colors, radius } = require('./src/constants/design-tokens.cjs');

module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // NativeWind defaults to media mode, which rejects manual color-scheme
  // updates on web. Class mode allows the color-scheme API to set the theme.
  darkMode: 'class',
  theme: {
    extend: {
      colors,
      borderRadius: radius,
      fontFamily: {
        editorial: ['PlayfairDisplay_500Medium'],
        sans: ['NunitoSans_400Regular'],
      },
    },
  },
  plugins: [],
};
