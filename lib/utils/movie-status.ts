/**
 * Movie Status Utilities
 * Helpers for determining movie release status and display logic
 */

export interface MovieLike {
  release_date?: string | null;
  release_year?: number | null;
  avg_rating?: number | null;
  our_rating?: number | null;
  status?: string;
}

/**
 * Check if a movie release date is unknown/TBA
 */
export function isReleaseDateUnknown(movie: MovieLike): boolean {
  return !movie.release_date && !movie.release_year;
}

/**
 * Check if a movie is upcoming (not yet released)
 */
export function isMovieUpcoming(movie: MovieLike): boolean {
  // If status is upcoming/announced
  if (movie.status === 'upcoming' || movie.status === 'announced' || movie.status === 'in_production') {
    return true;
  }

  // If release year is in the future
  if (movie.release_year && movie.release_year > new Date().getFullYear()) {
    return true;
  }

  // If release date exists and is in the future
  if (movie.release_date) {
    const releaseDate = new Date(movie.release_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return releaseDate > today;
  }

  // If no release info at all, treat as TBA/upcoming
  if (!movie.release_date && !movie.release_year) {
    return true;
  }

  return false;
}

/**
 * Get the upcoming label for display (e.g., "Coming Soon", "Releases Jan 15")
 */
export function getUpcomingLabel(movie: MovieLike): string {
  // No release info at all
  if (!movie.release_date && !movie.release_year) {
    return "📅 Release Date TBA";
  }

  // Has release year but no exact date
  if (!movie.release_date && movie.release_year) {
    const currentYear = new Date().getFullYear();
    if (movie.release_year > currentYear) {
      return `🎬 Coming ${movie.release_year}`;
    } else if (movie.release_year === currentYear) {
      return "🎬 Coming Soon";
    }
    return ""; // Already released (past year)
  }

  // Has exact release date - we've checked above that release_date exists at this point
  if (!movie.release_date) return "";
  const releaseDate = new Date(movie.release_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = releaseDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return ""; // Already released
  }

  if (diffDays === 1) {
    return "🎬 Releases Tomorrow!";
  }

  if (diffDays <= 7) {
    return `🎬 Releases in ${diffDays} days`;
  }

  if (diffDays <= 30) {
    const weeks = Math.ceil(diffDays / 7);
    return `🎬 Releases in ${weeks} week${weeks > 1 ? "s" : ""}`;
  }

  // Format as month, day, and year for distant releases
  const options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  return `🎬 Expected: ${releaseDate.toLocaleDateString("en-US", options)}`;
}

/**
 * Get formatted release date string
 */
export function getFormattedReleaseDate(movie: MovieLike): string {
  if (!movie.release_date) {
    return "TBA";
  }
  
  const releaseDate = new Date(movie.release_date);
  const options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  return releaseDate.toLocaleDateString("en-US", options);
}

/**
 * Determine if rating should be hidden
 * Hide for upcoming movies OR movies without release year (incomplete data)
 */
export function shouldHideRating(movie: MovieLike): boolean {
  // Hide if movie is upcoming
  if (isMovieUpcoming(movie)) {
    return true;
  }

  // Hide if no release year (incomplete data)
  if (!movie.release_year) {
    return true;
  }

  // Hide if no rating data at all
  if (!movie.avg_rating && !movie.our_rating) {
    return true;
  }

  return false;
}

