/**
 * Editorial Rating Utilities
 * Centralized rating display and categorization logic
 */

interface MovieLike {
  avg_rating?: number;
  our_rating?: number;
  editorial_score?: number;
}

export type RatingCategory =
  | "Masterpiece"
  | "Excellent"
  | "Very Good"
  | "Good"
  | "Average"
  | "Below Average"
  | "Poor"
  | "Very Poor"
  | "One-time Watch";

/**
 * Get the display rating for a movie
 * Priority: our_rating (editorial) > avg_rating > editorial_score
 */
export function getDisplayRating(movie: MovieLike): number {
  if (movie.our_rating && movie.our_rating > 0) {
    return movie.our_rating;
  }
  if (movie.avg_rating && movie.avg_rating > 0) {
    return movie.avg_rating;
  }
  if (movie.editorial_score && movie.editorial_score > 0) {
    return movie.editorial_score;
  }
  return 0;
}

/**
 * Get the category for a given rating
 */
export function getRatingCategory(rating: number): RatingCategory {
  if (rating >= 9) return "Masterpiece";
  if (rating >= 8) return "Excellent";
  if (rating >= 7) return "Very Good";
  if (rating >= 6) return "Good";
  if (rating >= 5) return "Average";
  if (rating >= 4) return "Below Average";
  if (rating >= 3) return "Poor";
  if (rating >= 2) return "Very Poor";
  return "One-time Watch";
}

/**
 * Get human-readable label for a category
 */
export function getCategoryLabel(category: RatingCategory): string {
  return category; // Categories are already readable labels
}

/**
 * Get color for rating category (for UI display)
 */
export function getCategoryColor(category: RatingCategory): string {
  switch (category) {
    case "Masterpiece":
      return "#FFD700"; // Gold
    case "Excellent":
      return "#22C55E"; // Green
    case "Very Good":
      return "#4ADE80"; // Light green
    case "Good":
      return "#84CC16"; // Lime
    case "Average":
      return "#FACC15"; // Yellow
    case "Below Average":
      return "#F97316"; // Orange
    case "Poor":
      return "#EF4444"; // Red
    case "Very Poor":
      return "#DC2626"; // Dark red
    case "One-time Watch":
      return "#9CA3AF"; // Gray
    default:
      return "#9CA3AF";
  }
}

/**
 * Get rating with category info
 */
export function getRatingWithCategory(movie: MovieLike): {
  rating: number;
  category: RatingCategory;
  label: string;
  color: string;
} {
  const rating = getDisplayRating(movie);
  const category = getRatingCategory(rating);
  return {
    rating,
    category,
    label: getCategoryLabel(category),
    color: getCategoryColor(category),
  };
}

// Watch recommendation types and functions
export type WatchRecommendation =
  | "masterpiece"
  | "must-watch"
  | "highly-recommended"
  | "recommended"
  | "worth-watching"
  | "one-time-watch"
  | "skip"
  | "mixed";

/**
 * Get watch recommendation based on rating, with optional classic/cult bonuses
 */
export function getWatchRecommendation(
  rating: number,
  isClassic?: boolean,
  isCult?: boolean
): WatchRecommendation {
  // Classic and cult movies get a recommendation boost
  const effectiveRating = rating + (isClassic ? 0.5 : 0) + (isCult ? 0.3 : 0);
  
  if (effectiveRating >= 9) return "masterpiece";
  if (effectiveRating >= 8.5) return "must-watch";
  if (effectiveRating >= 7.5) return "highly-recommended";
  if (effectiveRating >= 7) return "recommended";
  if (effectiveRating >= 6) return "worth-watching";
  if (effectiveRating >= 5) return "one-time-watch";
  if (effectiveRating >= 3) return "mixed";
  return "skip";
}

/**
 * Get human-readable label for watch recommendation
 */
export function getWatchLabel(recommendation: WatchRecommendation): string {
  const labels: Record<WatchRecommendation, string> = {
    masterpiece: "Masterpiece",
    "must-watch": "Must Watch",
    "highly-recommended": "Highly Recommended",
    recommended: "Recommended",
    "worth-watching": "Worth Watching",
    "one-time-watch": "One-Time Watch",
    skip: "Skip It",
    mixed: "Mixed Reviews",
  };
  return labels[recommendation] || "Worth Watching";
}

/**
 * Get style properties for watch recommendation
 */
export function getWatchStyle(recommendation: WatchRecommendation): {
  color: string;
  bgColor: string;
  bg: string;
  text: string;
  border: string;
  emoji: string;
  icon: string;
} {
  const styles: Record<WatchRecommendation, {
    color: string;
    bgColor: string;
    bg: string;
    text: string;
    border: string;
    emoji: string;
    icon: string;
  }> = {
    masterpiece: {
      color: "#fbbf24",
      bgColor: "#fbbf2420",
      bg: "bg-gradient-to-r from-yellow-500 to-amber-500",
      text: "text-black",
      border: "border-yellow-500/50",
      emoji: "🏆",
      icon: "🏆",
    },
    "must-watch": {
      color: "#22c55e",
      bgColor: "#22c55e20",
      bg: "bg-gradient-to-r from-green-600 to-emerald-500",
      text: "text-white",
      border: "border-green-500/50",
      emoji: "🔥",
      icon: "🔥",
    },
    "highly-recommended": {
      color: "#84cc16",
      bgColor: "#84cc1620",
      bg: "bg-gradient-to-r from-lime-600 to-green-500",
      text: "text-white",
      border: "border-lime-500/50",
      emoji: "👍",
      icon: "👍",
    },
    recommended: {
      color: "#10b981",
      bgColor: "#10b98120",
      bg: "bg-emerald-600",
      text: "text-white",
      border: "border-emerald-500/50",
      emoji: "✓",
      icon: "✓",
    },
    "worth-watching": {
      color: "#eab308",
      bgColor: "#eab30820",
      bg: "bg-yellow-600",
      text: "text-black",
      border: "border-yellow-500/50",
      emoji: "👀",
      icon: "👀",
    },
    "one-time-watch": {
      color: "#f97316",
      bgColor: "#f9731620",
      bg: "bg-orange-600",
      text: "text-white",
      border: "border-orange-500/50",
      emoji: "🎬",
      icon: "🎬",
    },
    skip: {
      color: "#ef4444",
      bgColor: "#ef444420",
      bg: "bg-red-600",
      text: "text-white",
      border: "border-red-500/50",
      emoji: "❌",
      icon: "❌",
    },
    mixed: {
      color: "#6b7280",
      bgColor: "#6b728020",
      bg: "bg-gray-600",
      text: "text-white",
      border: "border-gray-500/50",
      emoji: "🤷",
      icon: "🤷",
    },
  };
  return styles[recommendation] || styles["worth-watching"];
}

