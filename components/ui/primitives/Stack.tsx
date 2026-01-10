'use client';

/**
 * Stack Layout Component
 * 
 * A flexbox-based layout component for consistent spacing and alignment.
 * Uses design tokens for gap values.
 * 
 * @example
 * // Vertical stack (default)
 * <Stack gap="md">
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 * </Stack>
 * 
 * // Horizontal stack
 * <Stack direction="horizontal" gap="sm" align="center">
 *   <Button>Action 1</Button>
 *   <Button>Action 2</Button>
 * </Stack>
 * 
 * // Responsive direction
 * <Stack direction={{ base: 'vertical', md: 'horizontal' }}>
 *   <Card>Left</Card>
 *   <Card>Right</Card>
 * </Stack>
 */

import { forwardRef, ReactNode, HTMLAttributes } from 'react';

// ============================================================
// TYPES
// ============================================================

export type StackDirection = 'horizontal' | 'vertical';
export type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
export type StackGap = 'none' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type StackWrap = 'nowrap' | 'wrap' | 'wrap-reverse';

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /** Flex direction */
  direction?: StackDirection;
  /** Align items */
  align?: StackAlign;
  /** Justify content */
  justify?: StackJustify;
  /** Gap between items */
  gap?: StackGap;
  /** Flex wrap */
  wrap?: StackWrap;
  /** Full width */
  fullWidth?: boolean;
  /** Full height */
  fullHeight?: boolean;
  /** As inline-flex */
  inline?: boolean;
  /** Stack content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================
// STYLES
// ============================================================

const directionStyles: Record<StackDirection, string> = {
  horizontal: 'flex-row',
  vertical: 'flex-col',
};

const alignStyles: Record<StackAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

const justifyStyles: Record<StackJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

const gapStyles: Record<StackGap, string> = {
  none: 'gap-0',
  '2xs': 'gap-[var(--space-2xs)]',
  xs: 'gap-[var(--space-xs)]',
  sm: 'gap-[var(--space-sm)]',
  md: 'gap-[var(--space-md)]',
  lg: 'gap-[var(--space-lg)]',
  xl: 'gap-[var(--space-xl)]',
  '2xl': 'gap-[var(--space-2xl)]',
};

const wrapStyles: Record<StackWrap, string> = {
  nowrap: 'flex-nowrap',
  wrap: 'flex-wrap',
  'wrap-reverse': 'flex-wrap-reverse',
};

// ============================================================
// COMPONENT
// ============================================================

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  (props, ref) => {
    const {
      direction = 'vertical',
      align = 'stretch',
      justify = 'start',
      gap = 'md',
      wrap = 'nowrap',
      fullWidth = false,
      fullHeight = false,
      inline = false,
      children,
      className = '',
      ...rest
    } = props;

    const classes = [
      inline ? 'inline-flex' : 'flex',
      directionStyles[direction],
      alignStyles[align],
      justifyStyles[justify],
      gapStyles[gap],
      wrapStyles[wrap],
      fullWidth ? 'w-full' : '',
      fullHeight ? 'h-full' : '',
      className,
    ].filter(Boolean).join(' ');

    return (
      <div ref={ref} className={classes} {...rest}>
        {children}
      </div>
    );
  }
);

Stack.displayName = 'Stack';

// ============================================================
// CONVENIENCE COMPONENTS
// ============================================================

export interface HStackProps extends Omit<StackProps, 'direction'> {}

export const HStack = forwardRef<HTMLDivElement, HStackProps>(
  (props, ref) => <Stack ref={ref} direction="horizontal" {...props} />
);
HStack.displayName = 'HStack';

export interface VStackProps extends Omit<StackProps, 'direction'> {}

export const VStack = forwardRef<HTMLDivElement, VStackProps>(
  (props, ref) => <Stack ref={ref} direction="vertical" {...props} />
);
VStack.displayName = 'VStack';

// Divider for stacks
export interface StackDividerProps extends HTMLAttributes<HTMLDivElement> {
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
}

export const StackDivider = forwardRef<HTMLDivElement, StackDividerProps>(
  ({ orientation = 'horizontal', className = '', ...rest }, ref) => (
    <div
      ref={ref}
      className={`
        ${orientation === 'horizontal' 
          ? 'h-px w-full' 
          : 'w-px h-full'
        }
        bg-[var(--border-primary)]
        ${className}
      `}
      role="separator"
      {...rest}
    />
  )
);
StackDivider.displayName = 'StackDivider';

export default Stack;


