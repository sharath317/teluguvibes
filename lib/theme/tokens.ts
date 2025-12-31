/**
 * Design Token System for TeluguVibes
 * Comprehensive color system with light/dark mode support
 */

// ============================================================
// COLOR PALETTE
// ============================================================

export const colors = {
  // Brand Colors
  brand: {
    primary: '#FF6B00',      // Vibrant Orange
    secondary: '#FF8C40',    // Light Orange
    accent: '#FFB380',       // Soft Orange
  },

  // Neutral Colors (Dark Mode)
  dark: {
    bg: {
      primary: '#0A0A0A',    // Main background
      secondary: '#141414',   // Card background
      tertiary: '#1A1A1A',    // Elevated surfaces
      hover: '#252525',       // Hover states
      active: '#333333',      // Active states
    },
    text: {
      primary: '#FFFFFF',     // Main text
      secondary: '#A3A3A3',   // Muted text
      tertiary: '#737373',    // Subtle text
      disabled: '#525252',    // Disabled text
    },
    border: {
      primary: '#333333',     // Main borders
      secondary: '#262626',   // Subtle borders
      accent: '#404040',      // Emphasized borders
    },
  },

  // Neutral Colors (Light Mode)
  light: {
    bg: {
      primary: '#FFFFFF',     // Main background
      secondary: '#F9FAFB',   // Card background
      tertiary: '#F3F4F6',    // Elevated surfaces
      hover: '#E5E7EB',       // Hover states
      active: '#D1D5DB',      // Active states
    },
    text: {
      primary: '#111827',     // Main text
      secondary: '#6B7280',   // Muted text
      tertiary: '#9CA3AF',    // Subtle text
      disabled: '#D1D5DB',    // Disabled text
    },
    border: {
      primary: '#E5E7EB',     // Main borders
      secondary: '#F3F4F6',   // Subtle borders
      accent: '#D1D5DB',      // Emphasized borders
    },
  },

  // Semantic Colors
  semantic: {
    success: {
      bg: '#10B981',
      bgLight: 'rgba(16, 185, 129, 0.1)',
      text: '#10B981',
    },
    error: {
      bg: '#EF4444',
      bgLight: 'rgba(239, 68, 68, 0.1)',
      text: '#EF4444',
    },
    warning: {
      bg: '#F59E0B',
      bgLight: 'rgba(245, 158, 11, 0.1)',
      text: '#F59E0B',
    },
    info: {
      bg: '#3B82F6',
      bgLight: 'rgba(59, 130, 246, 0.1)',
      text: '#3B82F6',
    },
  },

  // Category Colors
  categories: {
    entertainment: '#8B5CF6',  // Purple
    movies: '#EC4899',         // Pink
    celebrity: '#F59E0B',      // Amber
    trending: '#EF4444',       // Red
    historic: '#6366F1',       // Indigo
    ott: '#14B8A6',           // Teal
    reviews: '#F97316',        // Orange
  },
};

// ============================================================
// CSS VARIABLES GENERATOR
// ============================================================

export function generateCSSVariables(mode: 'dark' | 'light'): string {
  const modeColors = colors[mode];

  return `
    /* Background */
    --bg-primary: ${modeColors.bg.primary};
    --bg-secondary: ${modeColors.bg.secondary};
    --bg-tertiary: ${modeColors.bg.tertiary};
    --bg-hover: ${modeColors.bg.hover};
    --bg-active: ${modeColors.bg.active};

    /* Text */
    --text-primary: ${modeColors.text.primary};
    --text-secondary: ${modeColors.text.secondary};
    --text-tertiary: ${modeColors.text.tertiary};
    --text-disabled: ${modeColors.text.disabled};

    /* Border */
    --border-primary: ${modeColors.border.primary};
    --border-secondary: ${modeColors.border.secondary};
    --border-accent: ${modeColors.border.accent};

    /* Brand */
    --brand-primary: ${colors.brand.primary};
    --brand-secondary: ${colors.brand.secondary};
    --brand-accent: ${colors.brand.accent};

    /* Semantic */
    --success: ${colors.semantic.success.text};
    --success-bg: ${colors.semantic.success.bgLight};
    --error: ${colors.semantic.error.text};
    --error-bg: ${colors.semantic.error.bgLight};
    --warning: ${colors.semantic.warning.text};
    --warning-bg: ${colors.semantic.warning.bgLight};
    --info: ${colors.semantic.info.text};
    --info-bg: ${colors.semantic.info.bgLight};

    /* Categories */
    --category-entertainment: ${colors.categories.entertainment};
    --category-movies: ${colors.categories.movies};
    --category-celebrity: ${colors.categories.celebrity};
    --category-trending: ${colors.categories.trending};
    --category-historic: ${colors.categories.historic};
    --category-ott: ${colors.categories.ott};
    --category-reviews: ${colors.categories.reviews};
  `;
}

// ============================================================
// SPACING TOKENS
// ============================================================

export const spacing = {
  '2xs': '0.25rem',   // 4px
  'xs': '0.5rem',     // 8px
  'sm': '0.75rem',    // 12px
  'md': '1rem',       // 16px
  'lg': '1.5rem',     // 24px
  'xl': '2rem',       // 32px
  '2xl': '3rem',      // 48px
  '3xl': '4rem',      // 64px
};

// ============================================================
// TYPOGRAPHY TOKENS
// ============================================================

export const typography = {
  fontFamily: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    heading: "'Poppins', 'Inter', sans-serif",
    telugu: "'Noto Sans Telugu', 'Mandali', sans-serif",
  },
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
};

// ============================================================
// BORDER RADIUS TOKENS
// ============================================================

export const borderRadius = {
  sm: '0.25rem',     // 4px
  md: '0.5rem',      // 8px
  lg: '0.75rem',     // 12px
  xl: '1rem',        // 16px
  '2xl': '1.5rem',   // 24px
  full: '9999px',    // Pill
};

// ============================================================
// SHADOW TOKENS
// ============================================================

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  glow: '0 0 20px rgba(255, 107, 0, 0.3)',
  glowSoft: '0 0 40px rgba(255, 107, 0, 0.15)',
};

// ============================================================
// ANIMATION TOKENS
// ============================================================

export const animation = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};
