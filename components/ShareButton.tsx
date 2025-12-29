'use client';

import { Share2 } from 'lucide-react';

interface ShareButtonProps {
  title: string;
}

export function ShareButton({ title }: ShareButtonProps) {
  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title,
        url: window.location.href
      }).catch(() => {
        // User cancelled or share failed - silently ignore
      });
    } else {
      // Fallback: copy to clipboard
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
        alert('లింక్ కాపీ అయింది!');
      }
    }
  };

  return (
    <button
      className="flex items-center gap-1 hover:text-[#eab308] transition-colors"
      onClick={handleShare}
    >
      <Share2 className="w-4 h-4" />
      షేర్ చేయండి
    </button>
  );
}
