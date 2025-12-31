'use client';

import Link from 'next/link';
import { Newspaper, Menu, Sun, Moon, ChevronDown, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

// Navigation structure
const NAV_ITEMS = {
  featured: [
    { href: '/hot', label: '🔥 హాట్', labelEn: 'Hot', gradient: 'from-orange-500 to-pink-500', textColor: 'text-white' },
    { href: '/reviews', label: '⭐ రివ్యూలు', labelEn: 'Reviews', gradient: 'from-yellow-500 to-amber-500', textColor: 'text-black' },
    { href: '/games', label: '🎮 గేమ్స్', labelEn: 'Games', gradient: 'from-purple-500 to-indigo-500', textColor: 'text-white' },
    { href: '/challenges', label: '🏆 ఛాలెంజ్', labelEn: 'Challenges', gradient: 'from-green-500 to-emerald-500', textColor: 'text-white' },
  ],
  categories: [
    { href: '/category/gossip', label: 'గాసిప్', labelEn: 'Gossip', emoji: '💬' },
    { href: '/category/sports', label: 'స్పోర్ట్స్', labelEn: 'Sports', emoji: '🏏' },
    { href: '/category/politics', label: 'రాజకీయాలు', labelEn: 'Politics', emoji: '🏛️' },
    { href: '/category/entertainment', label: 'వినోదం', labelEn: 'Entertainment', emoji: '🎬' },
    { href: '/category/trending', label: 'ట్రెండింగ్', labelEn: 'Trending', emoji: '📈' },
  ],
  explore: [
    { href: '/stories', label: 'కథలు', labelEn: 'Stories', emoji: '📖' },
    { href: '/on-this-day', label: 'ఈ రోజు', labelEn: 'On This Day', emoji: '📅' },
    { href: '/celebrities', label: 'సెలబ్రిటీలు', labelEn: 'Celebrities', emoji: '🌟' },
    { href: '/movies', label: 'సినిమాలు', labelEn: 'Movies', emoji: '🎥' },
  ],
};

export function Header() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('teluguvibes-theme');
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
      localStorage.setItem('teluguvibes-theme', theme);
    }
  }, [theme, mounted]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleDropdown = (name: string) => {
    setActiveDropdown(prev => prev === name ? null : name);
  };

  return (
    <header className="bg-[var(--bg-secondary)] border-b border-[var(--border-secondary)] sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <Newspaper className="w-8 h-8 text-[var(--brand-primary)]" />
            <span className="text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors hidden sm:block">
              తెలుగు వార్తలు
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1" ref={dropdownRef}>
            {/* Featured Tabs */}
            {NAV_ITEMS.featured.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r ${item.gradient} ${item.textColor} font-bold rounded-full text-sm hover:opacity-90 transition-opacity`}
              >
                {item.label}
              </Link>
            ))}

            {/* Categories Dropdown */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('categories')}
                className="flex items-center gap-1 px-3 py-1.5 text-[var(--text-primary)] hover:text-[var(--brand-primary)] font-medium transition-colors"
              >
                వర్గాలు
                <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'categories' ? 'rotate-180' : ''}`} />
              </button>
              {activeDropdown === 'categories' && (
                <div className="absolute top-full left-0 mt-1 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-xl shadow-lg py-2 min-w-[180px] z-50">
                  {NAV_ITEMS.categories.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2 px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <span>{item.emoji}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Explore Dropdown */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('explore')}
                className="flex items-center gap-1 px-3 py-1.5 text-[var(--text-primary)] hover:text-[var(--brand-primary)] font-medium transition-colors"
              >
                ఎక్స్‌ప్లోర్
                <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'explore' ? 'rotate-180' : ''}`} />
              </button>
              {activeDropdown === 'explore' && (
                <div className="absolute top-full left-0 mt-1 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-xl shadow-lg py-2 min-w-[180px] z-50">
                  {NAV_ITEMS.explore.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2 px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <span>{item.emoji}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Theme Toggle & Mobile menu */}
          <div className="flex items-center gap-2">
            {mounted && (
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-yellow-400" />
                ) : (
                  <Moon className="w-5 h-5 text-[var(--text-secondary)]" />
                )}
              </button>
            )}
            <button
              className="lg:hidden p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-[var(--text-primary)]" />
              ) : (
                <Menu className="w-6 h-6 text-[var(--text-primary)]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden py-4 border-t border-[var(--border-secondary)] animate-fade-in">
            {/* Featured */}
            <div className="mb-4">
              <p className="px-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                ప్రత్యేకం
              </p>
              <div className="grid grid-cols-2 gap-2">
                {NAV_ITEMS.featured.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-center gap-1 px-3 py-2.5 bg-gradient-to-r ${item.gradient} ${item.textColor} font-bold rounded-lg text-sm`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="mb-4">
              <p className="px-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                వర్గాలు
              </p>
              <div className="grid grid-cols-2 gap-1">
                {NAV_ITEMS.categories.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>{item.emoji}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Explore */}
            <div>
              <p className="px-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                ఎక్స్‌ప్లోర్
              </p>
              <div className="grid grid-cols-2 gap-1">
                {NAV_ITEMS.explore.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>{item.emoji}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

export default Header;
