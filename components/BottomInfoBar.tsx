'use client';

/**
 * BottomInfoBar Component
 * Footer information bar with site links and information
 */

import React from 'react';
import Link from 'next/link';

interface BottomInfoBarProps {
  className?: string;
}

export function BottomInfoBar({ className = '' }: BottomInfoBarProps) {
  return (
    <footer className={`bg-[#0a0a0a] border-t border-[#262626] py-8 mt-12 ${className}`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h4 className="text-[#eab308] font-bold mb-4">About</h4>
            <ul className="space-y-2 text-sm text-[#a3a3a3]">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-[#eab308] font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-[#a3a3a3]">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Use</Link></li>
              <li><Link href="/disclaimer" className="hover:text-white transition-colors">Disclaimer</Link></li>
            </ul>
          </div>

          {/* Follow Us */}
          <div>
            <h4 className="text-[#eab308] font-bold mb-4">Follow Us</h4>
            <ul className="space-y-2 text-sm text-[#a3a3a3]">
              <li><a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Twitter</a></li>
              <li><a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Facebook</a></li>
              <li><a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a></li>
            </ul>
          </div>

          {/* More */}
          <div>
            <h4 className="text-[#eab308] font-bold mb-4">More</h4>
            <ul className="space-y-2 text-sm text-[#a3a3a3]">
              <li><Link href="/rss" className="hover:text-white transition-colors">RSS Feed</Link></li>
              <li><Link href="/sitemap" className="hover:text-white transition-colors">Sitemap</Link></li>
              <li><Link href="/advertise" className="hover:text-white transition-colors">Advertise</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-[#262626] text-center text-sm text-[#525252]">
          <p>© {new Date().getFullYear()} Telugu Portal. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

