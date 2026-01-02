'use client';

/**
 * useModalState Hook
 * 
 * Manages modal state with:
 * - Focus trap inside modal
 * - Background scroll lock
 * - Escape key to close
 * - Focus restoration on close
 * - ARIA-compliant modal behavior
 */

import { useEffect, useCallback, useRef, useState } from 'react';

interface UseModalStateOptions {
  /** Whether modal is initially open */
  initialOpen?: boolean;
  /** Callback when modal opens */
  onOpen?: () => void;
  /** Callback when modal closes */
  onClose?: () => void;
  /** Whether to close on escape key (default: true) */
  closeOnEscape?: boolean;
  /** Whether to close on outside click (default: true) */
  closeOnOutsideClick?: boolean;
  /** Whether to lock background scroll (default: true) */
  lockScroll?: boolean;
  /** Whether to trap focus inside modal (default: true) */
  trapFocus?: boolean;
}

interface ModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  modalRef: React.RefObject<HTMLDivElement | null>;
  triggerRef: React.RefObject<HTMLElement | null>;
  getModalProps: () => ModalProps;
  getBackdropProps: () => BackdropProps;
}

interface ModalProps {
  role: 'dialog';
  'aria-modal': true;
  'aria-hidden': boolean;
  tabIndex: -1;
  ref: React.RefObject<HTMLDivElement | null>;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

interface BackdropProps {
  onClick: (e: React.MouseEvent) => void;
  'aria-hidden': true;
}

const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Get all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS));
}

/**
 * Main modal state hook
 */
export function useModalState(options: UseModalStateOptions = {}): ModalState {
  const {
    initialOpen = false,
    onOpen,
    onClose,
    closeOnEscape = true,
    closeOnOutsideClick = true,
    lockScroll = true,
    trapFocus = true,
  } = options;

  const [isOpen, setIsOpen] = useState(initialOpen);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const scrollPositionRef = useRef<number>(0);

  /**
   * Open modal
   */
  const open = useCallback(() => {
    // Store the element that triggered the modal
    previousActiveElementRef.current = document.activeElement as HTMLElement;
    scrollPositionRef.current = window.scrollY;
    
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  /**
   * Close modal
   */
  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
    
    // Restore focus to trigger element
    requestAnimationFrame(() => {
      if (previousActiveElementRef.current && previousActiveElementRef.current.focus) {
        previousActiveElementRef.current.focus();
      }
    });
  }, [onClose]);

  /**
   * Toggle modal
   */
  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    // Close on escape
    if (closeOnEscape && e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }

    // Focus trap on Tab
    if (trapFocus && e.key === 'Tab' && modalRef.current) {
      const focusableElements = getFocusableElements(modalRef.current);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: go to last element if on first
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: go to first element if on last
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  }, [isOpen, closeOnEscape, trapFocus, close]);

  /**
   * Handle outside click
   */
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (closeOnOutsideClick && e.target === e.currentTarget) {
      close();
    }
  }, [closeOnOutsideClick, close]);

  // Lock scroll when modal is open
  useEffect(() => {
    if (!lockScroll) return;

    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen, lockScroll]);

  // Focus first element when modal opens
  useEffect(() => {
    if (isOpen && trapFocus && modalRef.current) {
      // Delay to ensure modal is rendered
      requestAnimationFrame(() => {
        const focusableElements = getFocusableElements(modalRef.current!);
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else {
          modalRef.current?.focus();
        }
      });
    }
  }, [isOpen, trapFocus]);

  // Handle escape key globally when modal is open
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('keydown', handleGlobalEscape);
    return () => document.removeEventListener('keydown', handleGlobalEscape);
  }, [isOpen, closeOnEscape, close]);

  /**
   * Get props for the modal container
   */
  const getModalProps = useCallback((): ModalProps => ({
    role: 'dialog',
    'aria-modal': true,
    'aria-hidden': !isOpen,
    tabIndex: -1,
    ref: modalRef,
    onKeyDown: handleKeyDown,
  }), [isOpen, handleKeyDown]);

  /**
   * Get props for the backdrop
   */
  const getBackdropProps = useCallback((): BackdropProps => ({
    onClick: handleBackdropClick,
    'aria-hidden': true,
  }), [handleBackdropClick]);

  return {
    isOpen,
    open,
    close,
    toggle,
    modalRef,
    triggerRef,
    getModalProps,
    getBackdropProps,
  };
}

/**
 * Focus trap utility hook
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, isActive]);
}

/**
 * Scroll lock utility hook
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;

      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isLocked]);
}

export default useModalState;

