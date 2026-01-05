'use client';

/**
 * RelatedSections Component
 * 
 * Shows ALL other sections from the same menu group below the current section.
 * When on /stories, shows Games, Memes, Quizzes, Web Series, Jobs sections below.
 * 
 * Features:
 * - Displays all sections from the same group
 * - Each section has title + preview content
 * - Prev/Next floating navigation
 */

import React, { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { 
  MORE_MENU_SECTIONS, 
  getLocalizedLabel, 
  getLocalizedSectionTitle,
  getCategoryMeta,
  type NavItem,
  type MenuSection 
} from '@/lib/config/navigation';
import { SampleContentGrid, generateSampleItems } from '@/components/SampleContentGrid';

interface RelatedSectionsProps {
  /** Current section ID (e.g., 'stories', 'games', 'quizzes') */
  currentSectionId: string;
}

// Find which menu group a section belongs to
function findSectionGroup(sectionId: string): { group: MenuSection | null; items: NavItem[] } {
  for (const section of MORE_MENU_SECTIONS) {
    const found = section.items.find(item => item.id === sectionId);
    if (found) {
      return { group: section, items: section.items };
    }
  }
  return { group: null, items: [] };
}

export function RelatedSections({ currentSectionId }: RelatedSectionsProps) {
  const { lang, isEnglish } = useLanguage();
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [currentVisibleSection, setCurrentVisibleSection] = useState(currentSectionId);
  const [showNav, setShowNav] = useState(false);

  // Find the menu group this section belongs to
  const { group, items } = findSectionGroup(currentSectionId);
  
  // Filter out the current section
  const otherSections = items.filter(item => item.id !== currentSectionId);

  // Track which section is currently visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute('data-section-id');
            if (sectionId) {
              setCurrentVisibleSection(sectionId);
            }
          }
        });
      },
      { threshold: 0.3, rootMargin: '-100px 0px -50% 0px' }
    );

    otherSections.forEach(item => {
      const element = sectionRefs.current[item.id];
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [otherSections]);

  // Show/hide navigation based on scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowNav(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Navigate to section
  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!group || otherSections.length === 0) {
    return null;
  }

  const visibleIndex = otherSections.findIndex(item => item.id === currentVisibleSection);
  const hasPrev = visibleIndex > 0;
  const hasNext = visibleIndex < otherSections.length - 1;

  return (
    <div className="border-t" style={{ borderColor: 'var(--border-primary)' }}>
      {/* Group Header */}
      <div 
        className="py-4 sm:py-6"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{group.emoji}</span>
            <div>
              <h2 
                className={`text-lg sm:text-xl font-bold ${isEnglish ? 'font-heading' : ''}`}
                style={{ color: 'var(--text-primary)' }}
              >
                {isEnglish ? 'More from' : 'మరిన్ని'} {getLocalizedSectionTitle(group, lang)}
              </h2>
              <p 
                className="text-sm" 
                style={{ color: 'var(--text-tertiary)' }}
              >
                {isEnglish ? `${otherSections.length} more sections` : `మరో ${otherSections.length} సెక్షన్లు`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Other Sections */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="space-y-8 sm:space-y-12">
          {otherSections.map((item) => {
            const meta = getCategoryMeta(item.id);
            const sampleItems = generateSampleItems(item.id, 4);

            return (
              <section
                key={item.id}
                id={`related-section-${item.id}`}
                data-section-id={item.id}
                ref={el => { sectionRefs.current[item.id] = el; }}
                className="scroll-mt-20 rounded-2xl overflow-hidden"
                style={{ 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-primary)',
                }}
              >
                {/* Section Header */}
                <div 
                  className={`px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r ${meta.gradient}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl sm:text-3xl">{item.emoji}</span>
                      <h3 
                        className={`text-lg sm:text-xl font-bold text-white ${isEnglish ? 'font-heading' : ''}`}
                      >
                        {getLocalizedLabel(item, lang)}
                      </h3>
                      {item.isNew && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-white/20 text-white">
                          NEW
                        </span>
                      )}
                    </div>
                    <Link
                      href={item.href}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/20 text-white hover:bg-white/30 transition-colors"
                    >
                      {isEnglish ? 'View All →' : 'అన్నీ చూడండి →'}
                    </Link>
                  </div>
                </div>

                {/* Section Content Preview */}
                <div className="p-4 sm:p-6">
                  <SampleContentGrid
                    sectionId={item.id}
                    items={sampleItems}
                    showAsFeatured={false}
                  />
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Floating Section Navigator */}
      {showNav && otherSections.length > 1 && (
        <div className="fixed right-4 bottom-20 z-40 flex flex-col gap-2">
          {/* Current Section Indicator */}
          <div 
            className="px-3 py-2 rounded-lg text-xs font-medium text-center mb-1"
            style={{ 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border-primary)',
              color: 'var(--text-secondary)',
            }}
          >
            <span className="text-base">{otherSections[Math.max(0, visibleIndex)]?.emoji || group.emoji}</span>
          </div>

          {/* Navigation Buttons */}
          {otherSections.map((item, idx) => {
            const meta = getCategoryMeta(item.id);
            const isActive = item.id === currentVisibleSection;
            
            return (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                  isActive ? 'ring-2 ring-white' : ''
                }`}
                style={{ 
                  background: meta.color,
                  opacity: isActive ? 1 : 0.6,
                }}
                title={getLocalizedLabel(item, lang)}
              >
                <span className="text-sm">{item.emoji}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RelatedSections;






