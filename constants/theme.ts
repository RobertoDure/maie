/**
 * MAIE App Theme - Visual Identity Colors
 * Primary: Purple (#5B4CE0) - Headers, branding, primary actions
 * Accent: Mint (#2ECDA7) - Active states, highlights, secondary actions
 */

import { Platform } from 'react-native';

// Brand Colors
export const BrandColors = {
  primary: '#5B4CE0',      // Purple - main brand color
  primaryLight: '#7B6EE8', // Lighter purple for hover/pressed states
  primaryDark: '#4A3CB8',  // Darker purple
  accent: '#2ECDA7',       // Mint green - secondary brand color
  accentLight: '#5FDCBC',  // Lighter mint
  accentDark: '#1FAE8E',   // Darker mint
};

// Semantic Colors
export const SemanticColors = {
  success: '#34C759',
  successLight: '#D1F2EB',
  warning: '#FF9500',
  warningLight: '#FFF3E0',
  error: '#FF3B30',
  errorLight: '#FFE5E5',
  info: '#007AFF',
  infoLight: '#E3F2FF',
};

// Neutral Colors
export const NeutralColors = {
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F5F7FA',   // Background
  gray100: '#E0E3EB',  // Borders
  gray200: '#C4C9D4',  // Disabled
  gray300: '#A0A5B0',  // Placeholder
  gray400: '#666680',  // Secondary text
  gray500: '#4A4A5A',  // Body text
  gray900: '#1A1A2E',  // Primary text
};

export const Colors = {
  light: {
    // Core
    text: NeutralColors.gray900,
    textSecondary: NeutralColors.gray400,
    background: NeutralColors.gray50,
    card: NeutralColors.white,
    border: NeutralColors.gray100,

    // Brand
    primary: BrandColors.primary,
    primaryLight: BrandColors.primaryLight,
    accent: BrandColors.accent,
    accentLight: BrandColors.accentLight,

    // Semantic
    success: SemanticColors.success,
    warning: SemanticColors.warning,
    error: SemanticColors.error,
    info: SemanticColors.info,

    // Legacy compatibility
    tint: BrandColors.accent,
    icon: NeutralColors.gray400,
    tabIconDefault: NeutralColors.gray400,
    tabIconSelected: BrandColors.accent,
  },
  dark: {
    // Core
    text: '#ECEDEE',
    textSecondary: '#9BA1A6',
    background: '#151718',
    card: '#1E2022',
    border: '#2C2F33',

    // Brand
    primary: BrandColors.primaryLight,
    primaryLight: BrandColors.primary,
    accent: BrandColors.accent,
    accentLight: BrandColors.accentDark,

    // Semantic
    success: SemanticColors.success,
    warning: SemanticColors.warning,
    error: SemanticColors.error,
    info: SemanticColors.info,

    // Legacy compatibility
    tint: BrandColors.accent,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: BrandColors.accent,
  },
};

// Spacing tokens
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Border radius tokens
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// Shadow presets
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
