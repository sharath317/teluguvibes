/**
 * Typography Design Tokens
 * Defines text styles and variants for the design system
 */

export type TextVariant =
  | 'display-xl'
  | 'display-lg'
  | 'display-md'
  | 'display-sm'
  | 'heading-xl'
  | 'heading-lg'
  | 'heading-md'
  | 'heading-sm'
  | 'body-lg'
  | 'body-md'
  | 'body-sm'
  | 'caption'
  | 'label'
  | 'overline';

export interface TextVariantConfig {
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  letterSpacing?: string;
  textTransform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
}

export const textVariants: Record<TextVariant, TextVariantConfig> = {
  'display-xl': {
    fontSize: '4rem',      // 64px
    lineHeight: '1.1',
    fontWeight: 800,
    letterSpacing: '-0.02em',
  },
  'display-lg': {
    fontSize: '3rem',      // 48px
    lineHeight: '1.15',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  'display-md': {
    fontSize: '2.25rem',   // 36px
    lineHeight: '1.2',
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },
  'display-sm': {
    fontSize: '1.875rem',  // 30px
    lineHeight: '1.25',
    fontWeight: 600,
  },
  'heading-xl': {
    fontSize: '1.5rem',    // 24px
    lineHeight: '1.3',
    fontWeight: 600,
  },
  'heading-lg': {
    fontSize: '1.25rem',   // 20px
    lineHeight: '1.35',
    fontWeight: 600,
  },
  'heading-md': {
    fontSize: '1.125rem',  // 18px
    lineHeight: '1.4',
    fontWeight: 600,
  },
  'heading-sm': {
    fontSize: '1rem',      // 16px
    lineHeight: '1.4',
    fontWeight: 600,
  },
  'body-lg': {
    fontSize: '1.125rem',  // 18px
    lineHeight: '1.6',
    fontWeight: 400,
  },
  'body-md': {
    fontSize: '1rem',      // 16px
    lineHeight: '1.6',
    fontWeight: 400,
  },
  'body-sm': {
    fontSize: '0.875rem',  // 14px
    lineHeight: '1.5',
    fontWeight: 400,
  },
  caption: {
    fontSize: '0.75rem',   // 12px
    lineHeight: '1.4',
    fontWeight: 400,
  },
  label: {
    fontSize: '0.75rem',   // 12px
    lineHeight: '1.4',
    fontWeight: 500,
  },
  overline: {
    fontSize: '0.75rem',   // 12px
    lineHeight: '1.4',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
};

/**
 * Get CSS styles for a text variant
 */
export function getTextVariantStyles(variant: TextVariant): string {
  const config = textVariants[variant];
  let styles = `
    font-size: ${config.fontSize};
    line-height: ${config.lineHeight};
    font-weight: ${config.fontWeight};
  `;

  if (config.letterSpacing) {
    styles += `letter-spacing: ${config.letterSpacing};`;
  }

  if (config.textTransform) {
    styles += `text-transform: ${config.textTransform};`;
  }

  return styles;
}

/**
 * Get Tailwind-compatible classes for a text variant
 */
export function getTextVariantClasses(variant: TextVariant): string {
  const classMap: Record<TextVariant, string> = {
    'display-xl': 'text-6xl font-extrabold tracking-tight',
    'display-lg': 'text-5xl font-bold tracking-tight',
    'display-md': 'text-4xl font-bold tracking-tight',
    'display-sm': 'text-3xl font-semibold',
    'heading-xl': 'text-2xl font-semibold',
    'heading-lg': 'text-xl font-semibold',
    'heading-md': 'text-lg font-semibold',
    'heading-sm': 'text-base font-semibold',
    'body-lg': 'text-lg',
    'body-md': 'text-base',
    'body-sm': 'text-sm',
    caption: 'text-xs',
    label: 'text-xs font-medium',
    overline: 'text-xs font-semibold tracking-wider uppercase',
  };

  return classMap[variant];
}

