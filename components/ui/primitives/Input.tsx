'use client';

/**
 * Input Primitive Component
 * 
 * An accessible input component with validation states and helper text.
 * Uses design tokens for consistent styling across themes.
 * 
 * @example
 * // Basic input
 * <Input label="Email" type="email" />
 * 
 * // With error state
 * <Input label="Password" type="password" error="Password is required" />
 * 
 * // With helper text
 * <Input label="Username" helper="Must be unique" />
 * 
 * // With icon
 * <Input label="Search" leftIcon={<SearchIcon />} />
 */

import { forwardRef, ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, useId } from 'react';

// ============================================================
// TYPES
// ============================================================

export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'default' | 'filled' | 'ghost';

interface BaseInputProps {
  /** Input label */
  label?: string;
  /** Helper text below input */
  helper?: string;
  /** Error message (also sets error state) */
  error?: string;
  /** Size preset */
  size?: InputSize;
  /** Visual variant */
  variant?: InputVariant;
  /** Left icon/element */
  leftIcon?: ReactNode;
  /** Right icon/element */
  rightIcon?: ReactNode;
  /** Full width input */
  fullWidth?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Container class */
  containerClassName?: string;
}

export type InputProps = BaseInputProps & 
  Omit<InputHTMLAttributes<HTMLInputElement>, keyof BaseInputProps | 'size'>;

export type TextareaProps = BaseInputProps & 
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, keyof BaseInputProps | 'size'> & {
    /** Number of rows for textarea */
    rows?: number;
  };

// ============================================================
// STYLES
// ============================================================

const labelStyles = `
  block text-sm font-medium text-[var(--text-primary)] mb-1.5
`.replace(/\s+/g, ' ').trim();

const inputBaseStyles = `
  w-full
  bg-[var(--bg-secondary)]
  text-[var(--text-primary)]
  placeholder:text-[var(--text-tertiary)]
  border border-[var(--border-primary)]
  rounded-[var(--radius-md)]
  transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]
  disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--bg-tertiary)]
`.replace(/\s+/g, ' ').trim();

const variantStyles: Record<InputVariant, string> = {
  default: '',
  filled: 'bg-[var(--bg-tertiary)] border-transparent focus:bg-[var(--bg-secondary)]',
  ghost: 'bg-transparent border-transparent hover:bg-[var(--bg-hover)] focus:bg-[var(--bg-secondary)] focus:border-[var(--border-primary)]',
};

const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-[32px]',
  md: 'px-4 py-2 text-sm min-h-[40px]',
  lg: 'px-4 py-3 text-base min-h-[48px]',
};

const errorStyles = `
  border-[var(--error)] 
  focus:ring-[var(--error)]/50 
  focus:border-[var(--error)]
`.replace(/\s+/g, ' ').trim();

const helperStyles = 'text-xs mt-1.5 text-[var(--text-tertiary)]';
const errorMessageStyles = 'text-xs mt-1.5 text-[var(--error)]';

// ============================================================
// INPUT COMPONENT
// ============================================================

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => {
    const {
      label,
      helper,
      error,
      size = 'md',
      variant = 'default',
      leftIcon,
      rightIcon,
      fullWidth = true,
      className = '',
      containerClassName = '',
      id: providedId,
      ...rest
    } = props;

    const generatedId = useId();
    const id = providedId || generatedId;
    const helperId = `${id}-helper`;
    const errorId = `${id}-error`;

    const inputClasses = [
      inputBaseStyles,
      variantStyles[variant],
      sizeStyles[size],
      error ? errorStyles : '',
      leftIcon ? 'pl-10' : '',
      rightIcon ? 'pr-10' : '',
      className,
    ].filter(Boolean).join(' ');

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
        {label && (
          <label htmlFor={id} className={labelStyles}>
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
              {leftIcon}
            </span>
          )}
          
          <input
            ref={ref}
            id={id}
            className={inputClasses}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helper ? helperId : undefined}
            {...rest}
          />
          
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
              {rightIcon}
            </span>
          )}
        </div>
        
        {error && (
          <p id={errorId} className={errorMessageStyles} role="alert">
            {error}
          </p>
        )}
        
        {helper && !error && (
          <p id={helperId} className={helperStyles}>
            {helper}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ============================================================
// TEXTAREA COMPONENT
// ============================================================

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (props, ref) => {
    const {
      label,
      helper,
      error,
      size = 'md',
      variant = 'default',
      fullWidth = true,
      className = '',
      containerClassName = '',
      rows = 4,
      id: providedId,
      ...rest
    } = props;

    const generatedId = useId();
    const id = providedId || generatedId;
    const helperId = `${id}-helper`;
    const errorId = `${id}-error`;

    const textareaClasses = [
      inputBaseStyles,
      variantStyles[variant],
      'px-4 py-3 text-sm resize-y min-h-[100px]',
      error ? errorStyles : '',
      className,
    ].filter(Boolean).join(' ');

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
        {label && (
          <label htmlFor={id} className={labelStyles}>
            {label}
          </label>
        )}
        
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          className={textareaClasses}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helper ? helperId : undefined}
          {...rest}
        />
        
        {error && (
          <p id={errorId} className={errorMessageStyles} role="alert">
            {error}
          </p>
        )}
        
        {helper && !error && (
          <p id={helperId} className={helperStyles}>
            {helper}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Input;


