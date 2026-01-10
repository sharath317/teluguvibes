/**
 * Enrichment Reporter
 * 
 * Generates formatted reports for enrichment sessions:
 * - Console output with colors and tables
 * - Markdown reports for documentation
 * - Before/after comparison tables
 * - Manual review sections
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import type { EnrichmentSummary, AnomalyReport, CoverageComparison, AnomalySeverity } from './types';

// ============================================================
// CONSOLE REPORTER
// ============================================================

/**
 * Print enrichment summary to console with colors
 */
export function printConsoleSummary(summary: EnrichmentSummary): void {
  const { session, coverage, changes, anomalies, movies } = summary;

  // Header
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════════╗
║           ENRICHMENT SUMMARY                                         ║
║     Session: ${session.sessionId.substring(0, 25).padEnd(25)}                        ║
╚══════════════════════════════════════════════════════════════════════╝
`));

  // Session info
  console.log(chalk.gray(`  Duration: ${(session.duration_ms / 1000).toFixed(1)}s`));
  console.log(chalk.gray(`  Phases: ${session.phases.join(', ')}`));
  console.log('');

  // Movie statistics
  console.log(chalk.cyan.bold('📊 MOVIE STATISTICS'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(`  Processed:   ${chalk.cyan(movies.processed.toString().padStart(5))}`);
  console.log(`  Enriched:    ${chalk.green(movies.enriched.toString().padStart(5))}`);
  console.log(`  Unchanged:   ${chalk.gray(movies.unchanged.toString().padStart(5))}`);
  console.log(`  Failed:      ${chalk.red(movies.failed.toString().padStart(5))}`);
  console.log(`  Needs Review:${chalk.yellow(movies.needsReview.toString().padStart(5))}`);
  console.log('');

  // Coverage changes table
  console.log(chalk.cyan.bold('📈 COVERAGE CHANGES'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  printCoverageTable(coverage);
  console.log('');

  // Change statistics
  console.log(chalk.cyan.bold('🔄 CHANGES BY FIELD'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  
  const sortedFields = Object.entries(changes.byField)
    .sort((a, b) => b[1].enriched - a[1].enriched);
  
  for (const [field, stats] of sortedFields.slice(0, 15)) {
    const bar = '█'.repeat(Math.min(Math.ceil(stats.enriched / 10), 30));
    console.log(`  ${field.padEnd(22)} ${chalk.green(bar)} ${stats.enriched}`);
  }
  console.log('');

  // Source distribution
  console.log(chalk.cyan.bold('📡 CHANGES BY SOURCE'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  
  const sortedSources = Object.entries(changes.bySource)
    .sort((a, b) => b[1] - a[1]);
  
  for (const [source, count] of sortedSources) {
    const bar = '█'.repeat(Math.min(Math.ceil(count / 5), 30));
    const color = getSourceColor(source);
    console.log(`  ${source.padEnd(18)} ${color(bar)} ${count}`);
  }
  console.log('');

  // Anomalies
  if (anomalies.total > 0) {
    console.log(chalk.yellow.bold('⚠️  ANOMALIES DETECTED'));
    console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    
    console.log(`  Total: ${anomalies.total}`);
    console.log(`    ${chalk.red('CRITICAL')}: ${anomalies.bySeverity.CRITICAL}`);
    console.log(`    ${chalk.yellow('HIGH')}: ${anomalies.bySeverity.HIGH}`);
    console.log(`    ${chalk.blue('MEDIUM')}: ${anomalies.bySeverity.MEDIUM}`);
    console.log(`    ${chalk.gray('LOW')}: ${anomalies.bySeverity.LOW}`);
    console.log('');

    if (anomalies.needsManualReview.length > 0) {
      console.log(chalk.red.bold(`  ⚠️  MANUAL REVIEW REQUIRED: ${anomalies.needsManualReview.length} items`));
      console.log('');
      
      // Show top 5 items needing review
      for (const item of anomalies.needsManualReview.slice(0, 5)) {
        const severityColor = getSeverityColor(item.anomalies[0]?.severity || 'LOW');
        console.log(`    ${severityColor('●')} ${item.title} (${item.year})`);
        for (const anomaly of item.anomalies.slice(0, 2)) {
          console.log(`      - ${anomaly.message}`);
        }
      }
      
      if (anomalies.needsManualReview.length > 5) {
        console.log(chalk.gray(`    ... and ${anomalies.needsManualReview.length - 5} more`));
      }
    }
  }

  console.log('');
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
}

/**
 * Print coverage comparison table
 */
function printCoverageTable(coverage: CoverageComparison): void {
  // Table header
  console.log('  ┌─────────────────────┬──────────┬──────────┬────────────┐');
  console.log('  │ Field               │ Before   │ After    │ Change     │');
  console.log('  ├─────────────────────┼──────────┼──────────┼────────────┤');

  // Sort by change (most improved first)
  const sortedImprovements = [...coverage.improvement]
    .sort((a, b) => b.changePct - a.changePct)
    .filter(i => i.changePct !== 0);

  for (const imp of sortedImprovements.slice(0, 15)) {
    const changeStr = imp.changePct > 0 
      ? chalk.green(`+${imp.changePct.toFixed(0)}% (+${imp.changeCount})`)
      : chalk.red(`${imp.changePct.toFixed(0)}% (${imp.changeCount})`);
    
    console.log(
      `  │ ${imp.field.padEnd(19)} │ ${imp.beforePct.toFixed(0).padStart(6)}% │ ${imp.afterPct.toFixed(0).padStart(6)}% │ ${changeStr.padStart(20)} │`
    );
  }

  console.log('  └─────────────────────┴──────────┴──────────┴────────────┘');
}

// ============================================================
// MARKDOWN REPORTER
// ============================================================

/**
 * Generate markdown report
 */
export function generateMarkdownReport(summary: EnrichmentSummary): string {
  const { session, coverage, changes, anomalies, movies, skipped } = summary;
  
  let md = '';

  // Header
  md += `# Enrichment Report\n\n`;
  md += `**Session ID:** ${session.sessionId}\n`;
  md += `**Date:** ${new Date(session.startedAt).toLocaleString()}\n`;
  md += `**Duration:** ${(session.duration_ms / 1000).toFixed(1)} seconds\n`;
  md += `**Phases:** ${session.phases.join(', ')}\n\n`;

  // Summary table
  md += `## Summary\n\n`;
  md += `| Metric | Count |\n`;
  md += `|--------|-------|\n`;
  md += `| Movies Processed | ${movies.processed} |\n`;
  md += `| Movies Enriched | ${movies.enriched} |\n`;
  md += `| Movies Unchanged | ${movies.unchanged} |\n`;
  md += `| Movies Failed | ${movies.failed} |\n`;
  md += `| Needs Manual Review | ${movies.needsReview} |\n`;
  md += `| Total Changes | ${changes.total} |\n`;
  md += `| Total Anomalies | ${anomalies.total} |\n\n`;

  // Coverage changes
  md += `## Coverage Changes\n\n`;
  md += `| Field | Before | After | Change |\n`;
  md += `|-------|--------|-------|--------|\n`;
  
  const sortedCoverage = [...coverage.improvement]
    .sort((a, b) => b.changePct - a.changePct)
    .filter(i => i.changePct !== 0);
  
  for (const imp of sortedCoverage) {
    const changePrefix = imp.changePct > 0 ? '+' : '';
    md += `| ${imp.field} | ${imp.beforePct.toFixed(0)}% | ${imp.afterPct.toFixed(0)}% | ${changePrefix}${imp.changePct.toFixed(0)}% (${changePrefix}${imp.changeCount}) |\n`;
  }
  md += '\n';

  // Changes by field
  md += `## Changes by Field\n\n`;
  md += `| Field | Enriched | Skipped | Failed |\n`;
  md += `|-------|----------|---------|--------|\n`;
  
  for (const [field, stats] of Object.entries(changes.byField).sort((a, b) => b[1].enriched - a[1].enriched)) {
    md += `| ${field} | ${stats.enriched} | ${stats.skipped} | ${stats.failed} |\n`;
  }
  md += '\n';

  // Changes by source
  md += `## Changes by Source\n\n`;
  md += `| Source | Count |\n`;
  md += `|--------|-------|\n`;
  
  for (const [source, count] of Object.entries(changes.bySource).sort((a, b) => b[1] - a[1])) {
    md += `| ${source} | ${count} |\n`;
  }
  md += '\n';

  // Anomalies section
  if (anomalies.total > 0) {
    md += `## Anomalies\n\n`;
    md += `| Severity | Count |\n`;
    md += `|----------|-------|\n`;
    md += `| Critical | ${anomalies.bySeverity.CRITICAL} |\n`;
    md += `| High | ${anomalies.bySeverity.HIGH} |\n`;
    md += `| Medium | ${anomalies.bySeverity.MEDIUM} |\n`;
    md += `| Low | ${anomalies.bySeverity.LOW} |\n\n`;

    // Manual review section
    if (anomalies.needsManualReview.length > 0) {
      md += `### Manual Review Required\n\n`;
      md += `The following ${anomalies.needsManualReview.length} items require manual review:\n\n`;
      
      for (const item of anomalies.needsManualReview) {
        md += `#### ${item.title} (${item.year})\n\n`;
        md += `- **Priority:** ${item.priority}\n`;
        md += `- **Issues:**\n`;
        
        for (const anomaly of item.anomalies) {
          md += `  - [${anomaly.severity}] ${anomaly.message}\n`;
          if (anomaly.suggestedAction) {
            md += `    - Suggested: ${anomaly.suggestedAction}\n`;
          }
        }
        md += '\n';
      }
    }
  }

  // Skipped section
  md += `## Skipped Fields\n\n`;
  md += `| Reason | Count |\n`;
  md += `|--------|-------|\n`;
  md += `| Already had value | ${skipped.alreadyHadValue} |\n`;
  md += `| No source found | ${skipped.noSourceFound} |\n`;
  md += `| Below threshold | ${skipped.belowThreshold} |\n`;
  md += `| **Total** | ${skipped.total} |\n\n`;

  return md;
}

/**
 * Save markdown report to file
 */
export function saveMarkdownReport(summary: EnrichmentSummary): string {
  const markdown = generateMarkdownReport(summary);
  
  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `enrichment-report-${dateStr}.md`;
  const filepath = path.join(docsDir, filename);

  fs.writeFileSync(filepath, markdown);
  
  console.log(chalk.green(`  📄 Report saved to: ${filepath}`));
  
  return filepath;
}

/**
 * Generate JSON report
 */
export function saveJSONReport(summary: EnrichmentSummary): string {
  const docsDir = path.join(process.cwd(), 'docs', 'enrichment-logs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `report-${dateStr}.json`;
  const filepath = path.join(docsDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(summary, null, 2));
  
  return filepath;
}

// ============================================================
// MANUAL REVIEW REPORT
// ============================================================

/**
 * Generate manual review report (for items needing human attention)
 */
export function generateManualReviewReport(reports: AnomalyReport[]): string {
  let md = '';
  
  md += `# Manual Review Required\n\n`;
  md += `Generated: ${new Date().toLocaleString()}\n\n`;
  md += `**Total items requiring review:** ${reports.length}\n\n`;

  // Group by severity
  const critical = reports.filter(r => r.anomalies.some(a => a.severity === 'CRITICAL'));
  const high = reports.filter(r => !critical.includes(r) && r.anomalies.some(a => a.severity === 'HIGH'));
  const medium = reports.filter(r => !critical.includes(r) && !high.includes(r));

  if (critical.length > 0) {
    md += `## 🔴 Critical (${critical.length})\n\n`;
    for (const item of critical) {
      md += formatReviewItem(item);
    }
  }

  if (high.length > 0) {
    md += `## 🟠 High Priority (${high.length})\n\n`;
    for (const item of high) {
      md += formatReviewItem(item);
    }
  }

  if (medium.length > 0) {
    md += `## 🟡 Medium Priority (${medium.length})\n\n`;
    for (const item of medium) {
      md += formatReviewItem(item);
    }
  }

  return md;
}

function formatReviewItem(item: AnomalyReport): string {
  let md = `### ${item.title} (${item.year})\n\n`;
  md += `**Movie ID:** \`${item.movieId}\`\n\n`;
  md += `**Issues:**\n`;
  
  for (const anomaly of item.anomalies) {
    md += `- [${anomaly.severity}] ${anomaly.type}\n`;
    md += `  - ${anomaly.message}\n`;
    if (anomaly.suggestedAction) {
      md += `  - **Action:** ${anomaly.suggestedAction}\n`;
    }
    if (anomaly.autoFixable) {
      md += `  - ✅ Auto-fixable\n`;
    }
  }
  md += '\n';
  
  return md;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getSourceColor(source: string): (text: string) => string {
  const colors: Record<string, (text: string) => string> = {
    'wikipedia': chalk.green,
    'tmdb': chalk.blue,
    'wikidata': chalk.cyan,
    'omdb': chalk.yellow,
    'archive_org': chalk.magenta,
    'generated': chalk.gray,
    'inference': chalk.gray,
  };
  
  return colors[source] || chalk.white;
}

function getSeverityColor(severity: AnomalySeverity): (text: string) => string {
  const colors: Record<AnomalySeverity, (text: string) => string> = {
    'CRITICAL': chalk.red,
    'HIGH': chalk.yellow,
    'MEDIUM': chalk.blue,
    'LOW': chalk.gray,
  };
  
  return colors[severity];
}

// ============================================================
// EXPORTS
// ============================================================

export const reporter = {
  console: printConsoleSummary,
  markdown: generateMarkdownReport,
  saveMarkdown: saveMarkdownReport,
  saveJSON: saveJSONReport,
  manualReview: generateManualReviewReport,
};

