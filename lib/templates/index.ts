/**
 * Template Evolution System
 * 
 * This module provides:
 * - Atomic blocks for building content
 * - Template compositions for different content types
 * - Performance tracking and evolution
 * 
 * Key Principle: Templates should continuously improve
 * based on performance data, reducing AI dependency.
 */

// Atomic Blocks
export {
  AtomicBlock,
  BlockPerformance,
  ATOMIC_BLOCKS,
  getBlocksByType,
  getBlocksByCluster,
  selectBestBlock,
  updateBlockPerformance,
} from './atomic-blocks';

// Template Evolution
export {
  TemplateComposition,
  ContentType,
  TEMPLATE_COMPOSITIONS,
  buildContent,
  getTemplateForContent,
  recordTemplateOutcome,
  getTopPerformingTemplates,
} from './template-evolution';






