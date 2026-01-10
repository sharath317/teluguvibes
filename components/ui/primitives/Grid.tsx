'use client';

/**
 * Grid Layout Component
 * 
 * A CSS Grid-based layout component for responsive grid layouts.
 * Uses design tokens for gap values.
 * 
 * @example
 * // Basic grid
 * <Grid cols={3} gap="md">
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </Grid>
 * 
 * // Responsive columns
 * <Grid cols={{ base: 1, sm: 2, lg: 3 }} gap="lg">
 *   {items.map(item => <Card key={item.id}>{item.name}</Card>)}
 * </Grid>
 * 
 * // Auto-fit grid
 * <Grid autoFit minChildWidth="250px" gap="md">
 *   {items.map(item => <Card key={item.id}>{item.name}</Card>)}
 * </Grid>
 */

import { forwardRef, ReactNode, HTMLAttributes, CSSProperties } from 'react';

// ============================================================
// TYPES
// ============================================================

export type GridGap = 'none' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type GridCols = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'none';

export interface ResponsiveCols {
  base?: GridCols;
  sm?: GridCols;
  md?: GridCols;
  lg?: GridCols;
  xl?: GridCols;
}

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of columns or responsive object */
  cols?: GridCols | ResponsiveCols;
  /** Number of rows */
  rows?: number;
  /** Gap between items (applies to both row and column gap) */
  gap?: GridGap;
  /** Row gap (overrides gap for rows) */
  rowGap?: GridGap;
  /** Column gap (overrides gap for columns) */
  colGap?: GridGap;
  /** Use auto-fit for responsive columns */
  autoFit?: boolean;
  /** Use auto-fill for responsive columns */
  autoFill?: boolean;
  /** Minimum child width (for auto-fit/auto-fill) */
  minChildWidth?: string;
  /** Align items */
  alignItems?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  /** Justify items */
  justifyItems?: 'start' | 'center' | 'end' | 'stretch';
  /** Full width */
  fullWidth?: boolean;
  /** Grid content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================
// STYLES
// ============================================================

const gapStyles: Record<GridGap, string> = {
  none: 'gap-0',
  '2xs': 'gap-[var(--space-2xs)]',
  xs: 'gap-[var(--space-xs)]',
  sm: 'gap-[var(--space-sm)]',
  md: 'gap-[var(--space-md)]',
  lg: 'gap-[var(--space-lg)]',
  xl: 'gap-[var(--space-xl)]',
  '2xl': 'gap-[var(--space-2xl)]',
};

const rowGapStyles: Record<GridGap, string> = {
  none: 'row-gap-0',
  '2xs': 'row-gap-[var(--space-2xs)]',
  xs: 'row-gap-[var(--space-xs)]',
  sm: 'row-gap-[var(--space-sm)]',
  md: 'row-gap-[var(--space-md)]',
  lg: 'row-gap-[var(--space-lg)]',
  xl: 'row-gap-[var(--space-xl)]',
  '2xl': 'row-gap-[var(--space-2xl)]',
};

const colGapStyles: Record<GridGap, string> = {
  none: 'col-gap-0',
  '2xs': 'col-gap-[var(--space-2xs)]',
  xs: 'col-gap-[var(--space-xs)]',
  sm: 'col-gap-[var(--space-sm)]',
  md: 'col-gap-[var(--space-md)]',
  lg: 'col-gap-[var(--space-lg)]',
  xl: 'col-gap-[var(--space-xl)]',
  '2xl': 'col-gap-[var(--space-2xl)]',
};

const colStyles: Record<GridCols, string> = {
  none: '',
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
  8: 'grid-cols-8',
  9: 'grid-cols-9',
  10: 'grid-cols-10',
  11: 'grid-cols-11',
  12: 'grid-cols-12',
};

const responsiveColStyles: Record<string, Record<GridCols, string>> = {
  sm: {
    none: '',
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
    5: 'sm:grid-cols-5',
    6: 'sm:grid-cols-6',
    7: 'sm:grid-cols-7',
    8: 'sm:grid-cols-8',
    9: 'sm:grid-cols-9',
    10: 'sm:grid-cols-10',
    11: 'sm:grid-cols-11',
    12: 'sm:grid-cols-12',
  },
  md: {
    none: '',
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6',
    7: 'md:grid-cols-7',
    8: 'md:grid-cols-8',
    9: 'md:grid-cols-9',
    10: 'md:grid-cols-10',
    11: 'md:grid-cols-11',
    12: 'md:grid-cols-12',
  },
  lg: {
    none: '',
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
    7: 'lg:grid-cols-7',
    8: 'lg:grid-cols-8',
    9: 'lg:grid-cols-9',
    10: 'lg:grid-cols-10',
    11: 'lg:grid-cols-11',
    12: 'lg:grid-cols-12',
  },
  xl: {
    none: '',
    1: 'xl:grid-cols-1',
    2: 'xl:grid-cols-2',
    3: 'xl:grid-cols-3',
    4: 'xl:grid-cols-4',
    5: 'xl:grid-cols-5',
    6: 'xl:grid-cols-6',
    7: 'xl:grid-cols-7',
    8: 'xl:grid-cols-8',
    9: 'xl:grid-cols-9',
    10: 'xl:grid-cols-10',
    11: 'xl:grid-cols-11',
    12: 'xl:grid-cols-12',
  },
};

const alignItemsStyles: Record<string, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

const justifyItemsStyles: Record<string, string> = {
  start: 'justify-items-start',
  center: 'justify-items-center',
  end: 'justify-items-end',
  stretch: 'justify-items-stretch',
};

// ============================================================
// COMPONENT
// ============================================================

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  (props, ref) => {
    const {
      cols = 1,
      rows,
      gap = 'md',
      rowGap,
      colGap,
      autoFit = false,
      autoFill = false,
      minChildWidth = '200px',
      alignItems,
      justifyItems,
      fullWidth = true,
      children,
      className = '',
      style,
      ...rest
    } = props;

    // Build column classes
    let colClasses = '';
    if (!autoFit && !autoFill) {
      if (typeof cols === 'object') {
        // Responsive columns
        if (cols.base) colClasses += colStyles[cols.base] + ' ';
        if (cols.sm) colClasses += responsiveColStyles.sm[cols.sm] + ' ';
        if (cols.md) colClasses += responsiveColStyles.md[cols.md] + ' ';
        if (cols.lg) colClasses += responsiveColStyles.lg[cols.lg] + ' ';
        if (cols.xl) colClasses += responsiveColStyles.xl[cols.xl] + ' ';
      } else {
        colClasses = colStyles[cols];
      }
    }

    // Build gap classes
    let gapClass = gapStyles[gap];
    if (rowGap) gapClass += ' ' + rowGapStyles[rowGap];
    if (colGap) gapClass += ' ' + colGapStyles[colGap];

    // Custom styles for auto-fit/auto-fill
    const customStyle: CSSProperties = { ...style };
    if (autoFit || autoFill) {
      customStyle.gridTemplateColumns = `repeat(${autoFit ? 'auto-fit' : 'auto-fill'}, minmax(${minChildWidth}, 1fr))`;
    }
    if (rows) {
      customStyle.gridTemplateRows = `repeat(${rows}, 1fr)`;
    }

    const classes = [
      'grid',
      colClasses,
      gapClass,
      alignItems ? alignItemsStyles[alignItems] : '',
      justifyItems ? justifyItemsStyles[justifyItems] : '',
      fullWidth ? 'w-full' : '',
      className,
    ].filter(Boolean).join(' ');

    return (
      <div 
        ref={ref} 
        className={classes} 
        style={customStyle}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

Grid.displayName = 'Grid';

// ============================================================
// GRID ITEM
// ============================================================

export interface GridItemProps extends HTMLAttributes<HTMLDivElement> {
  /** Column span */
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'full';
  /** Row span */
  rowSpan?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Column start */
  colStart?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 'auto';
  /** Row start */
  rowStart?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'auto';
  /** Grid item content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const colSpanStyles: Record<string, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  7: 'col-span-7',
  8: 'col-span-8',
  9: 'col-span-9',
  10: 'col-span-10',
  11: 'col-span-11',
  12: 'col-span-12',
  full: 'col-span-full',
};

const rowSpanStyles: Record<number, string> = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
  4: 'row-span-4',
  5: 'row-span-5',
  6: 'row-span-6',
};

export const GridItem = forwardRef<HTMLDivElement, GridItemProps>(
  (props, ref) => {
    const {
      colSpan,
      rowSpan,
      colStart,
      rowStart,
      children,
      className = '',
      style,
      ...rest
    } = props;

    const customStyle: CSSProperties = { ...style };
    if (colStart && colStart !== 'auto') {
      customStyle.gridColumnStart = colStart;
    }
    if (rowStart && rowStart !== 'auto') {
      customStyle.gridRowStart = rowStart;
    }

    const classes = [
      colSpan ? colSpanStyles[colSpan] : '',
      rowSpan ? rowSpanStyles[rowSpan] : '',
      className,
    ].filter(Boolean).join(' ');

    return (
      <div ref={ref} className={classes} style={customStyle} {...rest}>
        {children}
      </div>
    );
  }
);

GridItem.displayName = 'GridItem';

export default Grid;


