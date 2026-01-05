/**
 * Lists module - Canonical list generation and management
 */

export {
  // Types
  type ListType,
  type ListCriteria,
  type ListMovie,
  type CanonicalList,
  type ListGenerationResult,
  
  // Generation
  generateList,
  generateYearlyLists,
  generateDirectorLists,
  generateGenreLists,
  generateFeaturedLists,
  
  // Storage
  saveList,
  getActiveList,
  getListHistory,
} from './canonical-lists';

