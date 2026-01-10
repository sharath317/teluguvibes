'use client';

/**
 * SiteHeader Component
 * 
 * Main site header with logo, navigation, search, and theme toggle.
 */

import Link from 'next/link';
import { Menu, X, Sun, Moon, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import { CategoryNavBar } from './navigation/CategoryNavBar';
import { SearchBar } from './SearchBar';

// Theme management hook - supports dark, light, vibrant
type ThemeType = 'dark' | 'light' | 'vibrant';

function useTheme() {
  const [theme, setTheme] = useState<ThemeType>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check localStorage for saved theme
    const savedTheme = localStorage.getItem('theme') as ThemeType | null;
    if (savedTheme && ['dark', 'light', 'vibrant'].includes(savedTheme)) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      // Default to dark
      applyTheme('dark');
    }
  }, []);

  const applyTheme = (newTheme: ThemeType) => {
    // Remove all theme classes first
    document.documentElement.classList.remove('dark', 'light', 'vibrant');
    // Add the new theme class
    document.documentElement.classList.add(newTheme);
  };

  const toggleTheme = () => {
    const themes: ThemeType[] = ['dark', 'vibrant', 'light'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    applyTheme(nextTheme);
  };

  return { theme, toggleTheme, mounted };
}

export function SiteHeader() {
  const { lang, isEnglish, toggleLanguage } = useLanguage();
  const { theme, toggleTheme, mounted } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Theme display config
  const themeConfig = {
    dark: { icon: <Moon className="w-4 h-4" />, label: 'Dark', labelTe: 'డార్క్' },
    vibrant: { icon: <span className="text-sm">✨</span>, label: 'Vibrant', labelTe: 'వైబ్రంట్' },
    light: { icon: <Sun className="w-4 h-4" />, label: 'Light', labelTe: 'లైట్' },
  };

  const currentTheme = themeConfig[theme] || themeConfig.dark;

  return (
    <header 
      className="sticky top-0 z-50 border-b"
      style={{ 
        background: 'var(--bg-primary)', 
        borderColor: 'var(--border-primary)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Main Header Bar */}
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-bold text-lg sm:text-xl transition-transform group-hover:scale-105"
              style={{ 
                background: 'linear-gradient(135deg, var(--brand-primary), #ca8a04)',
                color: 'var(--bg-primary)',
              }}
            >
              తె
            </div>
            <div className="flex flex-col">
              <span 
                className="font-bold text-base sm:text-lg leading-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                తెలుగు పోర్టల్
              </span>
              <span 
                className="text-[10px] sm:text-xs leading-tight hidden sm:block"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Telugu Entertainment Hub
              </span>
            </div>
          </Link>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <SearchBar 
              variant="header" 
              placeholder={isEnglish ? "Search movies, celebrities..." : "సినిమాలు, సెలబ్రిటీలు వెతకండి..."}
              className="w-full"
            />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="md:hidden p-2 rounded-lg transition-colors"
              style={{ 
                background: searchOpen ? 'var(--bg-tertiary)' : 'transparent',
                color: 'var(--text-secondary)',
              }}
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: theme === 'vibrant' 
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : theme === 'light'
                  ? '#f5f4f0'
                  : 'var(--bg-tertiary)',
                color: theme === 'vibrant' ? 'white' : theme === 'light' ? '#0d0d14' : 'var(--text-primary)',
                border: `1px solid ${theme === 'vibrant' ? '#6366f1' : 'var(--border-primary)'}`,
              }}
              aria-label={`Current theme: ${currentTheme.label}. Click to change.`}
              title={`Theme: ${currentTheme.label}`}
            >
              {mounted ? currentTheme.icon : <Moon className="w-4 h-4" />}
              <span className="hidden sm:inline">{mounted ? currentTheme.label : 'Dark'}</span>
            </button>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
              }}
            >
              {isEnglish ? 'తెలుగు' : 'English'}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg transition-colors"
              style={{ 
                background: mobileMenuOpen ? 'var(--bg-tertiary)' : 'transparent',
                color: 'var(--text-secondary)',
              }}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar (expandable) */}
        {searchOpen && (
          <div className="md:hidden pb-3">
            <SearchBar 
              variant="mobile" 
              placeholder={isEnglish ? "Search..." : "వెతకండి..."}
              onClose={() => setSearchOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Category Navigation Bar */}
      <CategoryNavBar />

      {/* Mobile Menu (expandable) */}
      {mobileMenuOpen && (
        <MobileMenu onClose={() => setMobileMenuOpen(false)} />
      )}
    </header>
  );
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  const { isEnglish } = useLanguage();
  
  const menuItems = [
    { href: '/', label: 'Home', labelTe: 'హోమ్', emoji: '🏠' },
    { href: '/reviews', label: 'Movies', labelTe: 'సినిమాలు', emoji: '🎬' },
    { href: '/category/gossip', label: 'Gossip', labelTe: 'గాసిప్', emoji: '🌶️' },
    { href: '/category/entertainment', label: 'Entertainment', labelTe: 'వినోదం', emoji: '🎭' },
    { href: '/category/sports', label: 'Sports', labelTe: 'స్పోర్ట్స్', emoji: '🏆' },
    { href: '/category/politics', label: 'Politics', labelTe: 'రాజకీయాలు', emoji: '🗳️' },
    { href: '/hot', label: 'Hot', labelTe: 'హాట్', emoji: '🔥' },
    { href: '/videos', label: 'Videos', labelTe: 'వీడియోలు', emoji: '📹' },
  ];

  return (
    <div 
      className="md:hidden border-t"
      style={{ 
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-primary)',
      }}
    >
      <nav className="container mx-auto px-3 py-2">
        <div className="grid grid-cols-2 gap-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              <span>{item.emoji}</span>
              <span className="text-sm font-medium">
                {isEnglish ? item.label : item.labelTe}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default SiteHeader;

