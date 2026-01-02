'use client';

/**
 * Skip Link Component
 * 
 * Allows keyboard users to skip directly to main content.
 * Hidden by default, visible on focus.
 * 
 * Usage:
 * <SkipLink targetId="main-content" />
 * 
 * Ensure the main content has: id="main-content" tabIndex={-1}
 */

import { useCallback } from 'react';

interface SkipLinkProps {
  /** ID of the target element to skip to */
  targetId?: string;
  /** Custom link text */
  text?: string;
  /** Additional CSS classes */
  className?: string;
}

export function SkipLink({
  targetId = 'main-content',
  text = 'Skip to main content',
  className = '',
}: SkipLinkProps) {
  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [targetId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      
      const target = document.getElementById(targetId);
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [targetId]);

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        sr-only focus:not-sr-only
        fixed top-4 left-4 z-[9999]
        px-4 py-2
        bg-[var(--brand-primary)] text-white
        font-medium text-sm
        rounded-md
        shadow-lg
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--brand-primary)]
        transition-opacity
        ${className}
      `}
    >
      {text}
    </a>
  );
}

/**
 * Navigation Skip Links - multiple skip targets
 */
interface MultiSkipLinksProps {
  links: Array<{
    targetId: string;
    text: string;
  }>;
}

export function MultiSkipLinks({ links }: MultiSkipLinksProps) {
  return (
    <nav aria-label="Skip links" className="sr-only focus-within:not-sr-only">
      <ul className="fixed top-4 left-4 z-[9999] flex flex-col gap-2">
        {links.map(({ targetId, text }) => (
          <li key={targetId}>
            <SkipLink targetId={targetId} text={text} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default SkipLink;

