'use client';

/**
 * Text/Heading Primitive Component
 * 
 * A polymorphic text component for consistent typography.
 * Uses design tokens for type-safe styling.
 * 
 * @example
 * // Default body text
 * <Text>Regular paragraph text</Text>
 * 
 * // Heading with proper semantic element
 * <Text as="h1" variant="display-lg">Page Title</Text>
 * 
 * // Secondary colored text
 * <Text color="secondary" variant="body-sm">Subtitle</Text>
 * 
 * // Brand colored link-style text
 * <Text as="span" color="brand" weight="semibold">Click here</Text>
 * 
 * // Truncated text
 * <Text truncate>Very long text that will be truncated...</Text>
 */

import React, { ReactNode, ElementType, ComponentPropsWithoutRef } from 'react';
import { textVariants, TextVariant } from '@/lib/design-system/tokens/typography';

// ============================================================
// TYPES
// ============================================================

export type TextColor = 'primary' | 'secondary' | 'tertiary' | 'disabled' | 'brand' | 'success' | 'error' | 'warning' | 'inherit';
export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
export type TextAlign = 'left' | 'center' | 'right';

type TextOwnProps<E extends ElementType = 'p'> = {
  /** The HTML element to render */
  as?: E;
  /** Typography variant preset */
  variant?: TextVariant;
  /** Text color */
  color?: TextColor;
  /** Font weight override */
  weight?: TextWeight;
  /** Text alignment */
  align?: TextAlign;
  /** Truncate with ellipsis (single line) */
  truncate?: boolean;
  /** Line clamp (multi-line truncation) */
  lineClamp?: 1 | 2 | 3 | 4 | 5;
  /** Use Telugu font */
  telugu?: boolean;
  /** Content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
};

export type TextProps<E extends ElementType = 'p'> = TextOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof TextOwnProps<E>>;

// ============================================================
// STYLES
// ============================================================

const colorStyles: Record<TextColor, string> = {
  primary: 'text-[var(--text-primary)]',
  secondary: 'text-[var(--text-secondary)]',
  tertiary: 'text-[var(--text-tertiary)]',
  disabled: 'text-[var(--text-disabled)]',
  brand: 'text-[var(--brand-primary)]',
  success: 'text-[var(--success)]',
  error: 'text-[var(--error)]',
  warning: 'text-[var(--warning)]',
  inherit: 'text-inherit',
};

const weightStyles: Record<TextWeight, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  extrabold: 'font-extrabold',
};

const alignStyles: Record<TextAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

// Convert variant to Tailwind classes
function getVariantClasses(variant: TextVariant): string {
  const v = textVariants[variant];
  
  // Safeguard: if variant not found, return default classes
  if (!v) {
    console.warn(`Text variant "${variant}" not found, using default`);
    return 'text-base font-normal leading-normal';
  }
  
  const classes: string[] = [];
  
  // Font size - comprehensive mapping including all variant sizes
  const sizeMap: Record<string, string> = {
    '0.625rem': 'text-[10px]',
    '0.75rem': 'text-xs',
    '0.875rem': 'text-sm',
    '1rem': 'text-base',
    '1.125rem': 'text-lg',
    '1.25rem': 'text-xl',
    '1.5rem': 'text-2xl',
    '1.875rem': 'text-3xl',
    '2.25rem': 'text-4xl',
    '3rem': 'text-5xl',
    '4rem': 'text-6xl',
    '5rem': 'text-7xl',
    '6rem': 'text-8xl',
  };
  classes.push(sizeMap[v.fontSize] || 'text-base');
  
  // Font weight - handle both string and number
  const weightMap: Record<string, string> = {
    '100': 'font-thin',
    '200': 'font-extralight',
    '300': 'font-light',
    '400': 'font-normal',
    '500': 'font-medium',
    '600': 'font-semibold',
    '700': 'font-bold',
    '800': 'font-extrabold',
    '900': 'font-black',
  };
  const weightKey = String(v.fontWeight);
  classes.push(weightMap[weightKey] || 'font-normal');
  
  // Line height - comprehensive mapping
  const lineHeightMap: Record<string, string> = {
    '1': 'leading-none',
    '1.1': 'leading-none',
    '1.15': 'leading-tight',
    '1.2': 'leading-tight',
    '1.25': 'leading-tight',
    '1.3': 'leading-snug',
    '1.35': 'leading-snug',
    '1.375': 'leading-snug',
    '1.4': 'leading-normal',
    '1.5': 'leading-normal',
    '1.6': 'leading-relaxed',
    '1.625': 'leading-relaxed',
    '1.75': 'leading-loose',
    '2': 'leading-loose',
  };
  classes.push(lineHeightMap[v.lineHeight] || 'leading-normal');
  
  // Letter spacing
  if (v.letterSpacing) {
    const spacingMap: Record<string, string> = {
      '-0.05em': 'tracking-tighter',
      '-0.025em': 'tracking-tight',
      '0.025em': 'tracking-wide',
      '0.05em': 'tracking-wider',
      '0.1em': 'tracking-widest',
    };
    if (spacingMap[v.letterSpacing]) {
      classes.push(spacingMap[v.letterSpacing]);
    }
  }
  
  // Text transform
  if ('textTransform' in v && v.textTransform === 'uppercase') {
    classes.push('uppercase');
  }
  
  return classes.join(' ');
}

// ============================================================
// COMPONENT
// ============================================================

function TextComponent<E extends ElementType = 'p'>(
  props: TextProps<E> & { ref?: React.Ref<any> }
): React.ReactElement {
  const {
    as,
    variant = 'body-md',
    color = 'primary',
    weight,
    align,
    truncate = false,
    lineClamp,
    telugu = false,
    children,
    className = '',
    ref,
    ...rest
  } = props;

  const Component = as || 'p';
  
  const classes = [
    getVariantClasses(variant),
    colorStyles[color],
    weight ? weightStyles[weight] : '',
    align ? alignStyles[align] : '',
    truncate ? 'truncate' : '',
    lineClamp ? `line-clamp-${lineClamp}` : '',
    telugu ? 'font-telugu' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Component ref={ref} className={classes} {...rest}>
      {children}
    </Component>
  );
}

export const Text = TextComponent as <E extends ElementType = 'p'>(
  props: TextProps<E> & { ref?: React.Ref<any> }
) => React.ReactElement;

// ============================================================
// HEADING CONVENIENCE COMPONENTS
// ============================================================

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

type HeadingProps = Omit<TextProps<HeadingLevel>, 'as' | 'variant'> & {
  level?: HeadingLevel;
};

const headingVariantMap: Record<HeadingLevel, TextVariant> = {
  h1: 'display-lg',
  h2: 'display-md',
  h3: 'heading-lg',
  h4: 'heading-md',
  h5: 'heading-sm',
  h6: 'label',
};

export function Heading({ level = 'h2', className = '', ...props }: HeadingProps) {
  return (
    <Text
      as={level}
      variant={headingVariantMap[level]}
      className={className}
      {...props}
    />
  );
}

// ============================================================
// PARAGRAPH CONVENIENCE COMPONENT
// ============================================================

type ParagraphProps = Omit<TextProps<'p'>, 'as'>;

export function Paragraph(props: ParagraphProps) {
  return <Text as="p" {...props} />;
}

// ============================================================
// CAPTION/LABEL CONVENIENCE COMPONENTS
// ============================================================

type CaptionProps = Omit<TextProps<'span'>, 'as' | 'variant'>;

export function Caption({ color = 'tertiary', ...props }: CaptionProps) {
  return <Text as="span" variant="caption" color={color} {...props} />;
}

export function Label({ color = 'secondary', ...props }: CaptionProps) {
  return <Text as="span" variant="label" color={color} {...props} />;
}

export default Text;

