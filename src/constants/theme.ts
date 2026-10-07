import { Platform } from 'react-native';
import tokens from './design-tokens.cjs';

// Shared with Tailwind so native styles and utility classes use the same palette.
export const colors = tokens.colors;
export const fonts = {
  body: 'NunitoSans_400Regular',
  medium: 'NunitoSans_600SemiBold',
  bold: 'NunitoSans_700Bold',
  heading: 'PlayfairDisplay_500Medium',
  headingBold: 'PlayfairDisplay_600SemiBold',
};
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { card: 24, input: 17, sheet: 32 };
export const shadow = Platform.select({
  web: { boxShadow: '0 5px 24px rgba(120, 70, 76, 0.055)' },
  default: { shadowColor: '#97656D', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 2 },
});
