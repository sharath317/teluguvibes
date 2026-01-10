'use client';

/**
 * Button Primitive Component
 * 
 * A flexible, accessible button component with multiple variants.
 * Uses design tokens for consistent styling across themes.
 * 
 * @example
 * // Primary button (default)
 * <Button onClick={handleClick}>Submit</Button>
 * 
 * // Secondary variant
 * <Button variant="secondary">Cancel</Button>
 * 
 * // Ghost variant with icon
 * <Button variant="ghost" size="sm">
 *   <ChevronRight className="w-4 h-4" />
 * </Button>
 * 
 * // Loading state
 * <Button loading>Saving...</Button>
 * 
 * // As a link
 * <Button as="a" href="/page">Go to Page</Button>
 */

import { forwardRef, ReactNode, ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';

// ============================================================
// TYPES
// ============================================================

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

type BaseProps = {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Show loading spinner */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Left icon/element */
  leftIcon?: ReactNode;
  /** Right icon/element */
  rightIcon?: ReactNode;
  /** Button content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Disabled state (for button element) */
  disabled?: boolean;
};

type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
    as?: 'button';
  };

type ButtonAsAnchor = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & {
    as: 'a';
  };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

// ============================================================
// STYLES (using CSS custom properties from design tokens)
// ============================================================

const baseStyles = `
  inline-flex items-center justify-center gap-2
  font-medium rounded-lg
  transition-all
  focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed
`.replace(/\s+/g, ' ').trim();

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-[var(--brand-primary)] text-white
    hover:bg-[#E55D00] hover:shadow-[var(--shadow-glow)]
    focus-visible:ring-[var(--brand-primary)]
  `.replace(/\s+/g, ' ').trim(),
  
  secondary: `
    bg-[var(--bg-tertiary)] text-[var(--text-primary)]
    border border-[var(--border-primary)]
    hover:bg-[var(--bg-hover)]
    focus-visible:ring-[var(--border-primary)]
  `.replace(/\s+/g, ' ').trim(),
  
  ghost: `
    bg-transparent text-[var(--text-secondary)]
    hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]
    focus-visible:ring-[var(--border-primary)]
  `.replace(/\s+/g, ' ').trim(),
  
  danger: `
    bg-[var(--error)] text-white
    hover:opacity-90
    focus-visible:ring-[var(--error)]
  `.replace(/\s+/g, ' ').trim(),
  
  success: `
    bg-[var(--success)] text-white
    hover:opacity-90
    focus-visible:ring-[var(--success)]
  `.replace(/\s+/g, ' ').trim(),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-[32px]',
  md: 'px-4 py-2 text-sm min-h-[40px]',
  lg: 'px-6 py-3 text-base min-h-[48px]',
};

// ============================================================
// COMPONENT
// ============================================================

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (props, ref) => {
    const {
      as = 'button',
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      disabled,
      ...rest
    } = props;

    const classes = [
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      fullWidth ? 'w-full' : '',
      className,
    ].filter(Boolean).join(' ');

    const content = (
      <>
        {loading && (
          <span 
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
        )}
        {!loading && leftIcon}
        <span>{children}</span>
        {!loading && rightIcon}
      </>
    );

    // Render as anchor
    if (as === 'a') {
      const anchorProps = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={classes}
          {...anchorProps}
        >
          {content}
        </a>
      );
    }

    // Render as button
    const buttonProps = rest as ButtonHTMLAttributes<HTMLButtonElement>;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={buttonProps.type || 'button'}
        disabled={disabled || loading}
        className={classes}
        aria-busy={loading}
        {...buttonProps}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ============================================================
// ICON BUTTON VARIANT
// ============================================================

export type IconButtonProps = Omit<ButtonProps, 'children' | 'leftIcon' | 'rightIcon'> & {
  /** Accessible label for the button */
  'aria-label': string;
  /** Icon element */
  icon: ReactNode;
};

export const IconButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, IconButtonProps>(
  ({ icon, size = 'md', className = '', ...props }, ref) => {
    const sizeClass = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
    }[size];

    // Type assertion needed due to union type discrimination
    const buttonProps = props as ButtonProps;

    return (
      <Button
        ref={ref}
        size={size}
        className={`!p-0 ${sizeClass} ${className}`}
        {...buttonProps}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default Button;

