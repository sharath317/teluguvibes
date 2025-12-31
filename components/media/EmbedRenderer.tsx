'use client';

import { useEffect, useRef, useState } from 'react';
import type { MediaType } from '@/types/media';

interface EmbedRendererProps {
  embedHtml: string;
  mediaType: MediaType;
  className?: string;
  fallbackThumbnail?: string;
  title?: string;
}

/**
 * Safe Embed Renderer
 * Renders social media embeds with proper script loading
 */
export function EmbedRenderer({
  embedHtml,
  mediaType,
  className = '',
  fallbackThumbnail,
  title,
}: EmbedRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !embedHtml) return;

    // Set HTML content
    containerRef.current.innerHTML = embedHtml;

    // Load platform-specific scripts
    const loadScript = (src: string) => {
      // Check if already loaded
      if (document.querySelector(`script[src="${src}"]`)) {
        // Re-process embeds
        triggerEmbedReprocess();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => {
        setLoaded(true);
        triggerEmbedReprocess();
      };
      script.onerror = () => setError(true);
      document.body.appendChild(script);
    };

    const triggerEmbedReprocess = () => {
      // Instagram
      if ((window as any).instgrm?.Embeds?.process) {
        (window as any).instgrm.Embeds.process();
      }
      // Twitter
      if ((window as any).twttr?.widgets?.load) {
        (window as any).twttr.widgets.load(containerRef.current);
      }
      // Facebook
      if ((window as any).FB?.XFBML?.parse) {
        (window as any).FB.XFBML.parse(containerRef.current);
      }
    };

    switch (mediaType) {
      case 'instagram_post':
      case 'instagram_reel':
        loadScript('https://www.instagram.com/embed.js');
        break;
      case 'twitter_post':
        loadScript('https://platform.twitter.com/widgets.js');
        break;
      case 'facebook_post':
        loadScript('https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0');
        break;
      case 'youtube_video':
      case 'youtube_short':
        // YouTube iframes don't need additional scripts
        setLoaded(true);
        break;
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [embedHtml, mediaType]);

  if (error && fallbackThumbnail) {
    return (
      <div className={`relative ${className}`}>
        <img
          src={fallbackThumbnail}
          alt={title || 'Media thumbnail'}
          className="w-full h-auto rounded-lg"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <span className="text-white text-sm">Failed to load embed</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`embed-container ${className}`}>
      <div
        ref={containerRef}
        className="embed-content w-full overflow-hidden"
        style={{ minHeight: '300px' }}
      />
      {!loaded && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}

/**
 * Lazy loading wrapper for embeds
 */
export function LazyEmbed(props: EmbedRendererProps) {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {inView ? (
        <EmbedRenderer {...props} />
      ) : (
        <div className="h-[400px] bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
          <span className="text-gray-500">Loading...</span>
        </div>
      )}
    </div>
  );
}



