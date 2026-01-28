/**
 * Test Quality Reviewer
 * 
 * Analyzes test files for quality issues, anti-patterns, and provides
 * a comprehensive quality score with detailed breakdown.
 */

import { readFile } from 'fs/promises';
import { glob } from 'glob';
import { basename, relative, extname } from 'path';
import {
  QualityRule,
  RuleViolation,
  Severity,
  RuleCategory,
  allRules,
  rulesByCategory,
  categoryDescriptions,
} from './quality-rules.js';

// ============================================
// Types
// ============================================

export interface ReviewedFile {
  path: string;
  relativePath: string;
  violations: RuleViolation[];
  score: number;
  scoreBreakdown: CategoryScore[];
  testCount: number;
  assertionCount: number;
  summary: string;
}

export interface CategoryScore {
  category: RuleCategory;
  description: string;
  score: number; // 0-100 for this category
  weight: number; // How much this contributes to overall
  violations: number;
  maxDeduction: number;
  actualDeduction: number;
}

export interface ReviewReport {
  rootDir: string;
  timestamp: string;
  files: ReviewedFile[];
  summary: ReviewSummary;
  recommendations: string[];
}

export interface ReviewSummary {
  totalFiles: number;
  totalTests: number;
  totalAssertions: number;
  totalViolations: number;
  overallScore: number; // 0-100
  scoreBreakdown: CategoryScore[];
  violationsByCategory: Record<RuleCategory, number>;
  violationsBySeverity: Record<Severity, number>;
  topIssues: Array<{ rule: string; count: number; severity: Severity }>;
}

export interface ReviewOptions {
  rules?: QualityRule[];
  includedCategories?: RuleCategory[];
  excludedCategories?: RuleCategory[];
  minSeverity?: Severity;
  ignorePatterns?: string[];
}

// ============================================
// Constants
// ============================================

const TEST_FILE_PATTERNS = [
  '**/*.test.{ts,tsx,js,jsx,mjs}',
  '**/*.spec.{ts,tsx,js,jsx,mjs}',
  '**/__tests__/**/*.{ts,tsx,js,jsx,mjs}',
  '**/test_*.py',
  '**/*_test.py',
  '**/tests/test_*.py',
];

const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.git/**',
];

const CATEGORY_WEIGHTS: Record<RuleCategory, number> = {
  theater: 25,      // Most critical - tests that don't test
  flaky: 20,        // Very critical - unreliable tests
  'over-mocking': 15,
  assertions: 15,
  isolation: 10,
  maintainability: 10,
  structure: 5,
};

const SEVERITY_MULTIPLIERS: Record<Severity, number> = {
  error: 1.0,
  warning: 0.6,
  info: 0.3,
};

// ============================================
// Core Review Functions
// ============================================

/**
 * Review a single test file for quality issues
 */
export function reviewTestFile(
  content: string,
  filename: string,
  options: ReviewOptions = {}
): ReviewedFile {
  const rules = filterRules(options);
  const violations: RuleViolation[] = [];
  
  // Run all applicable rules
  for (const rule of rules) {
    try {
      const ruleViolations = rule.detect(content, filename);
      violations.push(...ruleViolations);
    } catch (error) {
      // Rule failed - skip silently
      console.error(`Rule ${rule.id} failed on ${filename}:`, error);
    }
  }
  
  // Calculate metrics
  const testCount = countTests(content);
  const assertionCount = countAssertions(content);
  
  // Calculate score
  const { score, scoreBreakdown } = calculateScore(violations, rules);
  
  // Generate summary
  const summary = generateFileSummary(violations, testCount, assertionCount, score);
  
  return {
    path: filename,
    relativePath: basename(filename),
    violations,
    score,
    scoreBreakdown,
    testCount,
    assertionCount,
    summary,
  };
}

/**
 * Review all test files in a directory
 */
export async function reviewTestFiles(
  rootDir: string,
  options: ReviewOptions = {}
): Promise<ReviewReport> {
  const ignorePatterns = [...DEFAULT_IGNORE, ...(options.ignorePatterns || [])];
  
  // Find all test files
  const testFiles = await glob(TEST_FILE_PATTERNS, {
    cwd: rootDir,
    ignore: ignorePatterns,
    absolute: true,
  });
  
  if (testFiles.length === 0) {
    return {
      rootDir,
      timestamp: new Date().toISOString(),
      files: [],
      summary: createEmptySummary(),
      recommendations: ['No test files found. Start by adding tests!'],
    };
  }
  
  // Review each file
  const reviewedFiles: ReviewedFile[] = [];
  
  for (const filepath of testFiles) {
    try {
      const content = await readFile(filepath, 'utf-8');
      const review = reviewTestFile(content, filepath, options);
      review.relativePath = relative(rootDir, filepath);
      reviewedFiles.push(review);
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  // Generate summary
  const summary = generateSummary(reviewedFiles);
  const recommendations = generateRecommendations(summary, reviewedFiles);
  
  return {
    rootDir,
    timestamp: new Date().toISOString(),
    files: reviewedFiles,
    summary,
    recommendations,
  };
}

// ============================================
// Scoring Logic
// ============================================

function calculateScore(
  violations: RuleViolation[],
  rules: QualityRule[]
): { score: number; scoreBreakdown: CategoryScore[] } {
  const categoryScores: Map<RuleCategory, CategoryScore> = new Map();
  
  // Initialize category scores
  for (const category of Object.keys(CATEGORY_WEIGHTS) as RuleCategory[]) {
    const categoryRules = rules.filter(r => r.category === category);
    const maxDeduction = categoryRules.reduce((sum, r) => sum + r.weight, 0);
    
    categoryScores.set(category, {
      category,
      description: categoryDescriptions[category],
      score: 100,
      weight: CATEGORY_WEIGHTS[category],
      violations: 0,
      maxDeduction,
      actualDeduction: 0,
    });
  }
  
  // Apply violations
  const ruleMap = new Map(rules.map(r => [r.id, r]));
  
  for (const violation of violations) {
    const rule = ruleMap.get(violation.ruleId);
    if (!rule) continue;
    
    const categoryScore = categoryScores.get(rule.category);
    if (!categoryScore) continue;
    
    const severityMultiplier = SEVERITY_MULTIPLIERS[rule.severity];
    const deduction = rule.weight * severityMultiplier;
    
    categoryScore.violations++;
    categoryScore.actualDeduction += deduction;
  }
  
  // Calculate category scores (capped at 0)
  const scoreBreakdown: CategoryScore[] = [];
  
  for (const [category, data] of Array.from(categoryScores)) {
    // Normalize deduction based on max possible
    const normalizedDeduction = data.maxDeduction > 0
      ? (data.actualDeduction / data.maxDeduction) * 100
      : 0;
    
    data.score = Math.max(0, Math.round(100 - normalizedDeduction));
    scoreBreakdown.push(data);
  }
  
  // Calculate overall weighted score
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const catScore of scoreBreakdown) {
    weightedSum += catScore.score * catScore.weight;
    totalWeight += catScore.weight;
  }
  
  const overallScore = totalWeight > 0
    ? Math.round(weightedSum / totalWeight)
    : 100;
  
  return { score: overallScore, scoreBreakdown };
}

// ============================================
// Helper Functions
// ============================================

function filterRules(options: ReviewOptions): QualityRule[] {
  let rules = options.rules || allRules;
  
  if (options.includedCategories && options.includedCategories.length > 0) {
    rules = rules.filter(r => options.includedCategories!.includes(r.category));
  }
  
  if (options.excludedCategories && options.excludedCategories.length > 0) {
    rules = rules.filter(r => !options.excludedCategories!.includes(r.category));
  }
  
  if (options.minSeverity) {
    const severityOrder: Severity[] = ['info', 'warning', 'error'];
    const minIndex = severityOrder.indexOf(options.minSeverity);
    rules = rules.filter(r => severityOrder.indexOf(r.severity) >= minIndex);
  }
  
  return rules;
}

function countTests(content: string): number {
  const matches = content.match(/(?:it|test)\s*\(/g);
  return matches ? matches.length : 0;
}

function countAssertions(content: string): number {
  const patterns = [
    /expect\s*\(/g,
    /assert[\.\(]/g,
    /should[\.\(]/g,
  ];
  
  let count = 0;
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) count += matches.length;
  }
  
  return count;
}

function generateFileSummary(
  violations: RuleViolation[],
  testCount: number,
  assertionCount: number,
  score: number
): string {
  if (violations.length === 0) {
    return `✅ Clean! ${testCount} tests, ${assertionCount} assertions, no issues detected.`;
  }
  
  const errors = violations.filter(v => {
    const rule = allRules.find(r => r.id === v.ruleId);
    return rule?.severity === 'error';
  }).length;
  
  const warnings = violations.filter(v => {
    const rule = allRules.find(r => r.id === v.ruleId);
    return rule?.severity === 'warning';
  }).length;
  
  const parts = [];
  if (errors > 0) parts.push(`${errors} error${errors > 1 ? 's' : ''}`);
  if (warnings > 0) parts.push(`${warnings} warning${warnings > 1 ? 's' : ''}`);
  
  const scoreEmoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
  
  return `${scoreEmoji} Score: ${score}/100. ${parts.join(', ')}. ${testCount} tests, ${assertionCount} assertions.`;
}

function generateSummary(files: ReviewedFile[]): ReviewSummary {
  const totalFiles = files.length;
  const totalTests = files.reduce((sum, f) => sum + f.testCount, 0);
  const totalAssertions = files.reduce((sum, f) => sum + f.assertionCount, 0);
  
  // Aggregate violations
  const allViolations = files.flatMap(f => f.violations);
  const totalViolations = allViolations.length;
  
  // Count by category
  const violationsByCategory: Record<RuleCategory, number> = {
    flaky: 0,
    theater: 0,
    'over-mocking': 0,
    assertions: 0,
    isolation: 0,
    maintainability: 0,
    structure: 0,
  };
  
  const violationsBySeverity: Record<Severity, number> = {
    error: 0,
    warning: 0,
    info: 0,
  };
  
  const violationCounts: Map<string, { count: number; severity: Severity }> = new Map();
  
  for (const violation of allViolations) {
    const rule = allRules.find(r => r.id === violation.ruleId);
    if (!rule) continue;
    
    violationsByCategory[rule.category]++;
    violationsBySeverity[rule.severity]++;
    
    const existing = violationCounts.get(rule.id);
    if (existing) {
      existing.count++;
    } else {
      violationCounts.set(rule.id, { count: 1, severity: rule.severity });
    }
  }
  
  // Top issues
  const topIssues = Array.from(violationCounts.entries())
    .map(([rule, data]) => ({ rule, ...data }))
    .sort((a, b) => {
      // Sort by severity first, then count
      const severityOrder: Severity[] = ['error', 'warning', 'info'];
      const severityDiff = severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
      return severityDiff !== 0 ? severityDiff : b.count - a.count;
    })
    .slice(0, 10);
  
  // Aggregate category scores
  const categoryTotals: Map<RuleCategory, { total: number; count: number }> = new Map();
  
  for (const file of files) {
    for (const catScore of file.scoreBreakdown) {
      const existing = categoryTotals.get(catScore.category);
      if (existing) {
        existing.total += catScore.score;
        existing.count++;
      } else {
        categoryTotals.set(catScore.category, { total: catScore.score, count: 1 });
      }
    }
  }
  
  const scoreBreakdown: CategoryScore[] = [];
  for (const category of Object.keys(CATEGORY_WEIGHTS) as RuleCategory[]) {
    const data = categoryTotals.get(category);
    const avgScore = data ? Math.round(data.total / data.count) : 100;
    
    scoreBreakdown.push({
      category,
      description: categoryDescriptions[category],
      score: avgScore,
      weight: CATEGORY_WEIGHTS[category],
      violations: violationsByCategory[category],
      maxDeduction: 0, // Not meaningful in aggregate
      actualDeduction: 0,
    });
  }
  
  // Calculate overall score
  const overallScore = files.length > 0
    ? Math.round(files.reduce((sum, f) => sum + f.score, 0) / files.length)
    : 100;
  
  return {
    totalFiles,
    totalTests,
    totalAssertions,
    totalViolations,
    overallScore,
    scoreBreakdown,
    violationsByCategory,
    violationsBySeverity,
    topIssues,
  };
}

function createEmptySummary(): ReviewSummary {
  return {
    totalFiles: 0,
    totalTests: 0,
    totalAssertions: 0,
    totalViolations: 0,
    overallScore: 0,
    scoreBreakdown: [],
    violationsByCategory: {
      flaky: 0,
      theater: 0,
      'over-mocking': 0,
      assertions: 0,
      isolation: 0,
      maintainability: 0,
      structure: 0,
    },
    violationsBySeverity: {
      error: 0,
      warning: 0,
      info: 0,
    },
    topIssues: [],
  };
}

function generateRecommendations(summary: ReviewSummary, files: ReviewedFile[]): string[] {
  const recommendations: string[] = [];
  
  // Critical: Testing theater
  if (summary.violationsByCategory.theater > 0) {
    recommendations.push(
      '🎭 CRITICAL: Some tests don\'t actually test anything (testing theater). ' +
      'Review empty tests and tests without assertions.'
    );
  }
  
  // Critical: Flaky tests
  if (summary.violationsByCategory.flaky > 3) {
    recommendations.push(
      '⚡ CRITICAL: Multiple flaky test patterns detected. ' +
      'These cause intermittent CI failures. Address timing dependencies and random data usage.'
    );
  }
  
  // Over-mocking
  if (summary.violationsByCategory['over-mocking'] > 2) {
    recommendations.push(
      '🎪 WARNING: Excessive mocking detected. ' +
      'Tests that mock everything verify nothing. Consider integration tests for complex interactions.'
    );
  }
  
  // Test isolation
  if (summary.violationsByCategory.isolation > 0) {
    recommendations.push(
      '🔒 Address test isolation issues to prevent tests from affecting each other. ' +
      'Use beforeEach() for setup and afterEach() for cleanup.'
    );
  }
  
  // Low overall score
  if (summary.overallScore < 60) {
    recommendations.push(
      '📉 Overall test quality is below acceptable threshold. ' +
      'Prioritize fixing error-level issues before adding new tests.'
    );
  }
  
  // Missing assertions
  if (summary.totalTests > 0 && summary.totalAssertions / summary.totalTests < 1) {
    recommendations.push(
      '🎯 Low assertion density. ' +
      'Aim for at least 1-2 meaningful assertions per test.'
    );
  }
  
  // Positive feedback
  if (summary.overallScore >= 80) {
    recommendations.push(
      '✨ Good test quality! Focus on maintaining standards and adding edge case coverage.'
    );
  }
  
  if (summary.totalViolations === 0) {
    recommendations.push(
      '🏆 Excellent! No quality issues detected. Consider adding more edge case tests.'
    );
  }
  
  // Category-specific recommendations based on lowest scores
  const lowestCategories = summary.scoreBreakdown
    .filter(c => c.violations > 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);
  
  for (const cat of lowestCategories) {
    if (cat.score < 70) {
      recommendations.push(
        `📋 Focus area: ${cat.description}. Score: ${cat.score}/100.`
      );
    }
  }
  
  return recommendations;
}

// ============================================
// Formatting Functions
// ============================================

export function formatReviewReport(report: ReviewReport, verbose = false): string {
  const lines: string[] = [];
  
  // Header
  lines.push('═'.repeat(60));
  lines.push('  📊 TEST QUALITY REVIEW REPORT');
  lines.push('═'.repeat(60));
  lines.push('');
  
  // Overall Score
  const scoreEmoji = report.summary.overallScore >= 80 ? '🟢' : 
                     report.summary.overallScore >= 60 ? '🟡' : '🔴';
  lines.push(`${scoreEmoji} Overall Score: ${report.summary.overallScore}/100`);
  lines.push('');
  
  // Stats
  lines.push('📁 Statistics:');
  lines.push(`   Files reviewed:  ${report.summary.totalFiles}`);
  lines.push(`   Total tests:     ${report.summary.totalTests}`);
  lines.push(`   Total assertions: ${report.summary.totalAssertions}`);
  lines.push(`   Issues found:    ${report.summary.totalViolations}`);
  lines.push('');
  
  // Category Breakdown
  lines.push('📈 Score Breakdown:');
  for (const cat of report.summary.scoreBreakdown) {
    const bar = createProgressBar(cat.score, 20);
    const emoji = cat.score >= 80 ? '✅' : cat.score >= 60 ? '⚠️' : '❌';
    lines.push(`   ${emoji} ${cat.category.padEnd(15)} ${bar} ${cat.score}%`);
  }
  lines.push('');
  
  // Violations by Severity
  const { error, warning, info } = report.summary.violationsBySeverity;
  if (error + warning + info > 0) {
    lines.push('🚨 Issues by Severity:');
    if (error > 0) lines.push(`   ❌ Errors:   ${error}`);
    if (warning > 0) lines.push(`   ⚠️  Warnings: ${warning}`);
    if (info > 0) lines.push(`   ℹ️  Info:     ${info}`);
    lines.push('');
  }
  
  // Top Issues
  if (report.summary.topIssues.length > 0) {
    lines.push('🔝 Top Issues:');
    for (const issue of report.summary.topIssues.slice(0, 5)) {
      const severityIcon = issue.severity === 'error' ? '❌' : 
                          issue.severity === 'warning' ? '⚠️' : 'ℹ️';
      lines.push(`   ${severityIcon} ${issue.rule} (${issue.count}x)`);
    }
    lines.push('');
  }
  
  // Recommendations
  if (report.recommendations.length > 0) {
    lines.push('💡 Recommendations:');
    for (const rec of report.recommendations) {
      lines.push(`   • ${rec}`);
    }
    lines.push('');
  }
  
  // Detailed file reports (verbose mode)
  if (verbose && report.files.length > 0) {
    lines.push('─'.repeat(60));
    lines.push('📄 File Details:');
    lines.push('');
    
    // Sort by score (worst first)
    const sortedFiles = [...report.files].sort((a, b) => a.score - b.score);
    
    for (const file of sortedFiles) {
      lines.push(`  ${file.relativePath}`);
      lines.push(`  ${file.summary}`);
      
      if (file.violations.length > 0) {
        for (const violation of file.violations.slice(0, 5)) {
          const rule = allRules.find(r => r.id === violation.ruleId);
          const severityIcon = rule?.severity === 'error' ? '❌' : 
                              rule?.severity === 'warning' ? '⚠️' : 'ℹ️';
          const lineInfo = violation.line ? `:${violation.line}` : '';
          lines.push(`    ${severityIcon} ${violation.message}${lineInfo}`);
          if (violation.suggestion) {
            lines.push(`       💡 ${violation.suggestion}`);
          }
        }
        if (file.violations.length > 5) {
          lines.push(`    ... and ${file.violations.length - 5} more issues`);
        }
      }
      lines.push('');
    }
  }
  
  lines.push('═'.repeat(60));
  
  return lines.join('\n');
}

function createProgressBar(value: number, width: number): string {
  const filled = Math.round((value / 100) * width);
  const empty = width - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}

export function formatAsJSON(report: ReviewReport): string {
  return JSON.stringify(report, null, 2);
}

// ============================================
// Exports
// ============================================

export {
  allRules,
  rulesByCategory,
  categoryDescriptions,
  type QualityRule,
  type RuleViolation,
  type Severity,
  type RuleCategory,
};
