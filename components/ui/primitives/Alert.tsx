'use client';

/**
 * Alert Primitive Component
 * 
 * A dismissible alert component for status messages.
 * Uses design tokens for consistent styling across themes.
 * 
 * @example
 * // Success alert
 * <Alert severity="success">Operation completed successfully!</Alert>
 * 
 * // Error alert with dismiss
 * <Alert severity="error" dismissible onDismiss={() => setShow(false)}>
 *   Something went wrong. Please try again.
 * </Alert>
 * 
 * // Info alert with icon
 * <Alert severity="info" icon={<InfoIcon />}>
 *   New updates are available.
 * </Alert>
 */

import { forwardRef, ReactNode, HTMLAttributes, useState } from 'react';

// ============================================================
// TYPES
// ============================================================

export type AlertSeverity = 'info' | 'success' | 'warning' | 'error';
export type AlertVariant = 'filled' | 'outlined' | 'soft';

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Alert severity/type */
  severity?: AlertSeverity;
  /** Visual variant */
  variant?: AlertVariant;
  /** Alert title */
  title?: ReactNode;
  /** Custom icon (overrides default) */
  icon?: ReactNode;
  /** Hide icon */
  hideIcon?: boolean;
  /** Show dismiss button */
  dismissible?: boolean;
  /** Called when dismissed */
  onDismiss?: () => void;
  /** Alert content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================
// ICONS
// ============================================================

const icons: Record<AlertSeverity, ReactNode> = {
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// ============================================================
// STYLES
// ============================================================

const baseStyles = `
  relative flex items-start gap-3
  p-4 rounded-[var(--radius-lg)]
  text-sm
`.replace(/\s+/g, ' ').trim();

const filledStyles: Record<AlertSeverity, string> = {
  info: 'bg-[var(--info)] text-white',
  success: 'bg-[var(--success)] text-white',
  warning: 'bg-[var(--warning)] text-black',
  error: 'bg-[var(--error)] text-white',
};

const outlinedStyles: Record<AlertSeverity, string> = {
  info: 'border-2 border-[var(--info)] text-[var(--info)] bg-transparent',
  success: 'border-2 border-[var(--success)] text-[var(--success)] bg-transparent',
  warning: 'border-2 border-[var(--warning)] text-[var(--warning)] bg-transparent',
  error: 'border-2 border-[var(--error)] text-[var(--error)] bg-transparent',
};

const softStyles: Record<AlertSeverity, string> = {
  info: 'bg-[var(--info-bg)] text-[var(--info)] border border-[var(--info)]/20',
  success: 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]/20',
  warning: 'bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]/20',
  error: 'bg-[var(--error-bg)] text-[var(--error)] border border-[var(--error)]/20',
};

const variantStyles: Record<AlertVariant, Record<AlertSeverity, string>> = {
  filled: filledStyles,
  outlined: outlinedStyles,
  soft: softStyles,
};

// ============================================================
// COMPONENT
// ============================================================

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (props, ref) => {
    const {
      severity = 'info',
      variant = 'soft',
      title,
      icon,
      hideIcon = false,
      dismissible = false,
      onDismiss,
      children,
      className = '',
      ...rest
    } = props;

    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    const handleDismiss = () => {
      setDismissed(true);
      onDismiss?.();
    };

    const displayIcon = icon ?? icons[severity];

    const classes = [
      baseStyles,
      variantStyles[variant][severity],
      className,
    ].filter(Boolean).join(' ');

    return (
      <div
        ref={ref}
        role="alert"
        className={classes}
        {...rest}
      >
        {/* Icon */}
        {!hideIcon && displayIcon && (
          <span className="flex-shrink-0 mt-0.5">
            {displayIcon}
          </span>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <div className="font-semibold mb-1">
              {title}
            </div>
          )}
          <div className={title ? 'opacity-90' : ''}>
            {children}
          </div>
        </div>

        {/* Dismiss button */}
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 -m-1 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Dismiss alert"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export default Alert;


