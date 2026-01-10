'use client';

/**
 * Card Primitive Component
 * 
 * A flexible container component with elevation and theme support.
 * Uses design tokens for consistent styling across themes.
 * 
 * @example
 * // Basic card
 * <Card>Content here</Card>
 * 
 * // Elevated card with padding
 * <Card elevation="lg" padding="lg">Premium content</Card>
 * 
 * // Interactive card
 * <Card variant="interactive" onClick={handleClick}>Clickable</Card>
 * 
 * // Card with header
 * <Card>
 *   <Card.Header>Title</Card.Header>
 *   <Card.Body>Content</Card.Body>
 *   <Card.Footer>Actions</Card.Footer>
 * </Card>
 */

import { forwardRef, ReactNode, HTMLAttributes } from 'react';

// ============================================================
// TYPES
// ============================================================

export type CardVariant = 'default' | 'outlined' | 'elevated' | 'interactive' | 'ghost';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type CardElevation = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type CardRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual style variant */
  variant?: CardVariant;
  /** Padding size */
  padding?: CardPadding;
  /** Shadow elevation */
  elevation?: CardElevation;
  /** Border radius */
  radius?: CardRadius;
  /** Full width card */
  fullWidth?: boolean;
  /** Card content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================
// STYLES (using CSS custom properties from design tokens)
// ============================================================

const baseStyles = `
  relative
  bg-[var(--bg-card)]
  text-[var(--text-primary)]
  overflow-hidden
`.replace(/\s+/g, ' ').trim();

const variantStyles: Record<CardVariant, string> = {
  default: `
    border border-[var(--border-primary)]
  `.replace(/\s+/g, ' ').trim(),
  
  outlined: `
    border-2 border-[var(--border-secondary)]
    bg-transparent
  `.replace(/\s+/g, ' ').trim(),
  
  elevated: `
    border border-[var(--border-primary)]/50
  `.replace(/\s+/g, ' ').trim(),
  
  interactive: `
    border border-[var(--border-primary)]
    cursor-pointer
    transition-all duration-200
    hover:border-[var(--border-accent)]
    hover:shadow-[var(--shadow-glow)]
    hover:bg-[var(--bg-hover)]
    active:scale-[0.99]
  `.replace(/\s+/g, ' ').trim(),
  
  ghost: `
    bg-transparent
    border-none
  `.replace(/\s+/g, ' ').trim(),
};

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

const elevationStyles: Record<CardElevation, string> = {
  none: '',
  sm: 'shadow-[var(--shadow-sm)]',
  md: 'shadow-[var(--shadow-md)]',
  lg: 'shadow-[var(--shadow-lg)]',
  xl: 'shadow-[var(--shadow-xl)]',
};

const radiusStyles: Record<CardRadius, string> = {
  none: 'rounded-none',
  sm: 'rounded-[var(--radius-sm)]',
  md: 'rounded-[var(--radius-md)]',
  lg: 'rounded-[var(--radius-lg)]',
  xl: 'rounded-[var(--radius-xl)]',
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (props, ref) => {
    const {
      variant = 'default',
      padding = 'md',
      elevation = 'none',
      radius = 'lg',
      fullWidth = false,
      children,
      className = '',
      ...rest
    } = props;

    const classes = [
      baseStyles,
      variantStyles[variant],
      paddingStyles[padding],
      elevationStyles[elevation],
      radiusStyles[radius],
      fullWidth ? 'w-full' : '',
      className,
    ].filter(Boolean).join(' ');

    return (
      <div ref={ref} className={classes} {...rest}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// ============================================================
// SUB-COMPONENTS
// ============================================================

interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const CardHeader = forwardRef<HTMLDivElement, CardSectionProps>(
  ({ children, className = '', ...rest }, ref) => (
    <div
      ref={ref}
      className={`border-b border-[var(--border-primary)] px-4 py-3 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

export const CardBody = forwardRef<HTMLDivElement, CardSectionProps>(
  ({ children, className = '', ...rest }, ref) => (
    <div ref={ref} className={`p-4 ${className}`} {...rest}>
      {children}
    </div>
  )
);
CardBody.displayName = 'CardBody';

export const CardFooter = forwardRef<HTMLDivElement, CardSectionProps>(
  ({ children, className = '', ...rest }, ref) => (
    <div
      ref={ref}
      className={`border-t border-[var(--border-primary)] px-4 py-3 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
);
CardFooter.displayName = 'CardFooter';

// Attach sub-components to Card
const CardWithParts = Card as typeof Card & {
  Header: typeof CardHeader;
  Body: typeof CardBody;
  Footer: typeof CardFooter;
};

CardWithParts.Header = CardHeader;
CardWithParts.Body = CardBody;
CardWithParts.Footer = CardFooter;

export default CardWithParts;



