import { Filter } from 'bad-words';

// Create filter instance
const filter = new Filter();

// Add Telugu/Hindi common profanity words (sanitized list)
// In production, you'd want a more comprehensive list
const additionalWords: string[] = [
  // Add region-specific words here
  // These are placeholder examples
];

if (additionalWords.length > 0) {
  filter.addWords(...additionalWords);
}

/**
 * Check if text is clean (no profanity)
 */
export function isClean(text: string): boolean {
  try {
    return !filter.isProfane(text);
  } catch {
    // If filter fails, assume clean
    return true;
  }
}

/**
 * Clean text by replacing profanity with asterisks
 */
export function cleanText(text: string): string {
  try {
    return filter.clean(text);
  } catch {
    return text;
  }
}

/**
 * Check if text contains only positive/neutral content
 * Basic implementation - can be enhanced with sentiment analysis
 */
export function isPositive(text: string): boolean {
  // Check for profanity first
  if (!isClean(text)) {
    return false;
  }

  // Check for excessive negativity indicators
  const negativePatterns = [
    /hate/i,
    /kill/i,
    /die/i,
    /death threat/i,
    /attack/i,
  ];

  for (const pattern of negativePatterns) {
    if (pattern.test(text)) {
      return false;
    }
  }

  return true;
}
