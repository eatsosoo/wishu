const { colors, radius } = require('./src/constants/design-tokens.cjs');

module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
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
