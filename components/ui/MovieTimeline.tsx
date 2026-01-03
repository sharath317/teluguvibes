/**
 * MOVIE TIMELINE COMPONENT
 * 
 * Displays the lifecycle of a movie from announcement to OTT release.
 * Visualizes connected story threads and enables "Continue the story" navigation.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';

// ============================================================
// TYPES
// ============================================================

export interface TimelineEvent {
  id: string;
  type: 'announcement' | 'trailer' | 'release' | 'review' | 'ott' | 'awards' | 'milestone';
  title: string;
  date: string;
  description?: string;
  link?: string;
  icon: string;
}

export interface MovieTimelineProps {
  events: TimelineEvent[];
  movieTitle: string;
  className?: string;
}

// ============================================================
// COMPONENT
// ============================================================

export function MovieTimeline({ events, movieTitle, className = '' }: MovieTimelineProps) {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  if (!events || events.length === 0) {
    return null;
  }

  return (
    <div className={`movie-timeline ${className}`}>
      <h3 className="text-xl font-bold mb-4">Movie Journey</h3>
      
      <div className="timeline-container relative">
        {/* Vertical line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300" />

        {/* Events */}
        <div className="space-y-6">
          {events.map((event, index) => (
            <div
              key={event.id}
              className="relative flex items-start gap-4"
            >
              {/* Icon */}
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-orange-500 text-white flex items-center justify-center text-2xl z-10">
                {event.icon}
              </div>

              {/* Content */}
              <div className="flex-1 bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{event.title}</h4>
                    <p className="text-sm text-gray-500">
                      {new Date(event.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  {event.description && (
                    <button
                      onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                      className="ml-2 text-orange-500 hover:text-orange-600"
                      aria-label={expandedEvent === event.id ? 'Collapse' : 'Expand'}
                    >
                      {expandedEvent === event.id ? '▼' : '▶'}
                    </button>
                  )}
                </div>

                {/* Expanded description */}
                {expandedEvent === event.id && event.description && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-gray-700">{event.description}</p>
                  </div>
                )}

                {/* Link */}
                {event.link && (
                  <Link
                    href={event.link}
                    className="inline-block mt-3 text-orange-500 hover:text-orange-600 text-sm font-medium"
                  >
                    View Details →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .movie-timeline {
          max-width: 800px;
          margin: 0 auto;
        }

        .timeline-container {
          padding-left: 0;
        }

        @media (max-width: 640px) {
          .timeline-container {
            padding-left: 0;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// CONTINUE THE STORY COMPONENT
// ============================================================

export interface RelatedMovie {
  id: string;
  title: string;
  slug: string;
  posterUrl?: string;
  releaseYear?: number;
  relationship: string; // "Same Actor", "Same Director", "Sequel", etc.
}

export interface ContinueTheStoryProps {
  movies: RelatedMovie[];
  className?: string;
}

export function ContinueTheStory({ movies, className = '' }: ContinueTheStoryProps) {
  if (!movies || movies.length === 0) {
    return null;
  }

  return (
    <div className={`continue-the-story ${className}`}>
      <h3 className="text-xl font-bold mb-4">Continue the Story</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {movies.map((movie) => (
          <Link
            key={movie.id}
            href={`/reviews/${movie.slug}`}
            className="group relative block overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow"
          >
            {/* Poster */}
            {movie.posterUrl ? (
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400 text-4xl">🎬</span>
              </div>
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white text-sm font-medium">{movie.title}</p>
                {movie.releaseYear && (
                  <p className="text-white/80 text-xs">{movie.releaseYear}</p>
                )}
                <p className="text-orange-400 text-xs mt-1">{movie.relationship}</p>
              </div>
            </div>

            {/* Relationship badge */}
            <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
              {movie.relationship}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// STORY THREAD COMPONENT
// ============================================================

export interface StoryThread {
  id: string;
  title: string;
  description: string;
  movies: RelatedMovie[];
}

export interface StoryThreadsProps {
  threads: StoryThread[];
  className?: string;
}

export function StoryThreads({ threads, className = '' }: StoryThreadsProps) {
  const [activeThread, setActiveThread] = useState<string | null>(threads[0]?.id || null);

  if (!threads || threads.length === 0) {
    return null;
  }

  const currentThread = threads.find(t => t.id === activeThread);

  return (
    <div className={`story-threads ${className}`}>
      <h3 className="text-xl font-bold mb-4">Story Threads</h3>

      {/* Thread tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {threads.map((thread) => (
          <button
            key={thread.id}
            onClick={() => setActiveThread(thread.id)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              activeThread === thread.id
                ? 'bg-orange-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {thread.title}
          </button>
        ))}
      </div>

      {/* Thread content */}
      {currentThread && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-gray-700 mb-4">{currentThread.description}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {currentThread.movies.map((movie) => (
              <Link
                key={movie.id}
                href={`/reviews/${movie.slug}`}
                className="block group"
              >
                {movie.posterUrl ? (
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    className="w-full h-32 object-cover rounded-lg shadow group-hover:shadow-lg transition-shadow"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-2xl">🎬</span>
                  </div>
                )}
                <p className="text-sm font-medium mt-1 line-clamp-1">{movie.title}</p>
                {movie.releaseYear && (
                  <p className="text-xs text-gray-500">{movie.releaseYear}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

