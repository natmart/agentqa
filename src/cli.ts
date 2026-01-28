#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { scanCodebase, generateTestSuggestions } from './core/scanner.js';
import { generateTests, generateTestsForFiles, TestFramework } from './core/generator.js';
import { runTests, formatTestResult } from './core/runner.js';
import { generateAndHealTest } from './core/healer.js';
import { reviewTestFiles, formatReviewReport, formatAsJSON } from './core/quality-reviewer.js';

const program = new Command();

program
  .name('agentqa')
  .description('AI-powered automated QA testing orchestration tool')
  .version('1.0.0');

// Scan command
program
  .command('scan')
  .description('Scan a codebase and show test coverage gaps')
  .argument('[path]', 'Path to scan', '.')
  .option('-j, --json', 'Output as JSON')
  .action(async (path: string, options: { json?: boolean }) => {
    console.log(pc.cyan('🔍 Scanning codebase...'));
    
    const result = await scanCodebase(path);
    const suggestions = generateTestSuggestions(result);
    
    if (options.json) {
      console.log(JSON.stringify({ stats: result.stats, suggestions }, null, 2));
      return;
    }
    
    console.log(pc.green(`\n✅ Scanned ${result.stats.total} files\n`));
    
    console.log(pc.bold('📊 Statistics:'));
    console.log(`   With tests:    ${pc.green(String(result.stats.withTests))}`);
    console.log(`   Without tests: ${pc.yellow(String(result.stats.withoutTests))}`);
    console.log(`   Languages:     ${Object.entries(result.stats.byLanguage).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
    
    if (suggestions.length > 0) {
      console.log(pc.bold('\n📝 Test Suggestions:'));
      
      const priorityColors = {
        high: pc.red,
        medium: pc.yellow,
        low: pc.gray,
      };
      
      for (const { file, suggestions: sugg, priority } of suggestions.slice(0, 10)) {
        const color = priorityColors[priority];
        console.log(`\n   ${color(`[${priority.toUpperCase()}]`)} ${file.relativePath}`);
        for (const s of sugg.slice(0, 5)) {
          console.log(`      • ${s}`);
        }
        if (sugg.length > 5) {
          console.log(`      ... and ${sugg.length - 5} more`);
        }
      }
      
      if (suggestions.length > 10) {
        console.log(pc.gray(`\n   ... and ${suggestions.length - 10} more files need tests`));
      }
    } else {
      console.log(pc.green('\n🎉 All files have tests!'));
    }
  });

// Generate command
program
  .command('generate')
  .description('Generate tests for files without coverage')
  .argument('[path]', 'Path to scan', '.')
  .option('-f, --framework <framework>', 'Test framework (jest|vitest|pytest)', 'vitest')
  .option('-o, --output <dir>', 'Output directory for tests')
  .option('--dry-run', 'Show what would be generated without writing files')
  .option('-l, --limit <n>', 'Limit number of files to generate', '5')
  .option('--api-key <key>', 'OpenAI API key')
  .option('--model <model>', 'AI model to use', 'gpt-4o-mini')
  .action(async (path: string, options: {
    framework: string;
    output?: string;
    dryRun?: boolean;
    limit: string;
    apiKey?: string;
    model?: string;
  }) => {
    const framework = options.framework as TestFramework;
    
    if (!['jest', 'vitest', 'pytest'].includes(framework)) {
      console.error(pc.red(`Invalid framework: ${framework}. Use jest, vitest, or pytest.`));
      process.exit(1);
    }
    
    console.log(pc.cyan('🔍 Scanning codebase...'));
    const scanResult = await scanCodebase(path);
    const suggestions = generateTestSuggestions(scanResult);
    
    const filesToGenerate = suggestions
      .slice(0, parseInt(options.limit, 10))
      .map(s => s.file);
    
    if (filesToGenerate.length === 0) {
      console.log(pc.green('🎉 No files need tests!'));
      return;
    }
    
    console.log(pc.cyan(`\n🤖 Generating tests for ${filesToGenerate.length} files...\n`));
    
    const tests = await generateTestsForFiles(filesToGenerate, {
      framework,
      apiKey: options.apiKey,
      model: options.model,
    }, (current, total, file) => {
      console.log(pc.gray(`   [${current}/${total}] ${file}`));
    });
    
    console.log('');
    
    for (const test of tests) {
      const outputDir = options.output || dirname(join(path, test.sourceFile));
      const outputPath = join(outputDir, test.filename);
      
      if (options.dryRun) {
        console.log(pc.yellow(`Would create: ${outputPath}`));
        console.log(pc.gray('─'.repeat(60)));
        console.log(test.content.split('\n').slice(0, 20).join('\n'));
        if (test.content.split('\n').length > 20) {
          console.log(pc.gray('... (truncated)'));
        }
        console.log('');
      } else {
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, test.content);
        console.log(pc.green(`✅ Created: ${outputPath}`));
      }
    }
    
    if (options.dryRun) {
      console.log(pc.yellow('\n⚠️  Dry run - no files were written'));
    } else {
      console.log(pc.green(`\n🎉 Generated ${tests.length} test files!`));
    }
  });

// Heal command - CRITICAL DIFFERENTIATOR
// Generates tests, runs them, and auto-fixes until they pass
program
  .command('heal')
  .description('Generate self-healing tests (generates, runs, and auto-fixes)')
  .argument('[path]', 'Path to scan', '.')
  .option('-f, --framework <framework>', 'Test framework (jest|vitest|pytest)', 'vitest')
  .option('-l, --limit <n>', 'Limit number of files to process', '3')
  .option('-r, --retries <n>', 'Max retries per test', '3')
  .option('--api-key <key>', 'OpenAI API key')
  .option('--model <model>', 'AI model to use', 'gpt-4o')
  .action(async (path: string, options: {
    framework: string;
    limit: string;
    retries: string;
    apiKey?: string;
    model?: string;
  }) => {
    const framework = options.framework as TestFramework;
    
    if (!['jest', 'vitest', 'pytest'].includes(framework)) {
      console.error(pc.red(`Invalid framework: ${framework}. Use jest, vitest, or pytest.`));
      process.exit(1);
    }
    
    console.log(pc.cyan('🔍 Scanning codebase...'));
    const scanResult = await scanCodebase(path);
    const suggestions = generateTestSuggestions(scanResult);
    
    const filesToProcess = suggestions
      .slice(0, parseInt(options.limit, 10))
      .map(s => s.file);
    
    if (filesToProcess.length === 0) {
      console.log(pc.green('🎉 No files need tests!'));
      return;
    }
    
    console.log(pc.cyan(`\n🤖 Generating self-healing tests for ${filesToProcess.length} files...\n`));
    console.log(pc.gray(`   Max retries per file: ${options.retries}`));
    console.log(pc.gray(`   Model: ${options.model || 'gpt-4o'}\n`));
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      console.log(pc.bold(`\n[${i + 1}/${filesToProcess.length}] ${file.relativePath}`));
      console.log(pc.gray('─'.repeat(60)));
      
      const result = await generateAndHealTest(file, {
        framework,
        apiKey: options.apiKey,
        model: options.model,
        maxRetries: parseInt(options.retries, 10),
        cwd: path,
      });
      
      if (result.success) {
        successCount++;
        console.log(pc.green(`✅ SUCCESS after ${result.attempts} attempt(s)`));
        console.log(pc.gray(`   Created: ${result.test.filename}`));
        if (result.finalResult) {
          console.log(pc.gray(`   Tests: ${result.finalResult.passed} passed`));
        }
      } else {
        failCount++;
        console.log(pc.red(`❌ FAILED after ${result.attempts} attempts`));
        for (const error of result.errors.slice(-2)) {
          console.log(pc.gray(`   ${error.slice(0, 200)}...`));
        }
      }
    }
    
    console.log(pc.bold('\n' + '═'.repeat(60)));
    console.log(pc.bold('📊 Summary:'));
    console.log(`   ${pc.green(`✅ Success: ${successCount}`)}`);
    console.log(`   ${pc.red(`❌ Failed:  ${failCount}`)}`);
    console.log(`   Success rate: ${Math.round((successCount / (successCount + failCount)) * 100)}%`);
    
    if (successCount > 0) {
      console.log(pc.green(`\n🎉 Generated ${successCount} working tests!`));
    }
  });

// Run command
program
  .command('run')
  .description('Run tests and report coverage')
  .argument('[path]', 'Path to run tests', '.')
  .option('-c, --coverage', 'Include coverage report')
  .option('-f, --filter <pattern>', 'Filter tests by pattern')
  .option('-w, --watch', 'Watch mode')
  .option('--json', 'Output as JSON')
  .action(async (path: string, options: {
    coverage?: boolean;
    filter?: string;
    watch?: boolean;
    json?: boolean;
  }) => {
    console.log(pc.cyan('🧪 Running tests...\n'));
    
    const result = await runTests({
      cwd: path,
      coverage: options.coverage,
      filter: options.filter,
      watch: options.watch,
    });
    
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatTestResult(result));
      
      if (!result.success && result.output) {
        console.log(pc.red('\n📋 Test Output:'));
        console.log(pc.gray('─'.repeat(60)));
        console.log(result.output);
      }
    }
    
    process.exit(result.success ? 0 : 1);
  });

// Quick test generation for a single file
program
  .command('gen-file')
  .description('Generate tests for a single file')
  .argument('<file>', 'File to generate tests for')
  .option('-f, --framework <framework>', 'Test framework', 'vitest')
  .option('-o, --output <path>', 'Output path')
  .option('--api-key <key>', 'OpenAI API key')
  .action(async (file: string, options: {
    framework: string;
    output?: string;
    apiKey?: string;
  }) => {
    const { readFile } = await import('fs/promises');
    const { basename, extname, dirname: pathDirname } = await import('path');
    
    const content = await readFile(file, 'utf-8');
    const ext = extname(file);
    
    const language = ['.ts', '.tsx'].includes(ext) ? 'typescript' 
      : ['.js', '.jsx', '.mjs'].includes(ext) ? 'javascript'
      : ext === '.py' ? 'python' : 'unknown';
    
    const scannedFile = {
      path: file,
      relativePath: basename(file),
      language: language as any,
      content,
      exports: [],
      functions: [],
      classes: [],
      hasTests: false,
    };
    
    console.log(pc.cyan(`🤖 Generating tests for ${file}...`));
    
    const test = await generateTests(scannedFile, {
      framework: options.framework as TestFramework,
      apiKey: options.apiKey,
    });
    
    if (options.output) {
      await writeFile(options.output, test.content);
      console.log(pc.green(`✅ Created: ${options.output}`));
    } else {
      console.log(pc.gray('─'.repeat(60)));
      console.log(test.content);
    }
  });

// Review command - Test Quality Analysis
program
  .command('review')
  .description('Review existing tests for quality issues and anti-patterns')
  .argument('[path]', 'Path to review', '.')
  .option('-j, --json', 'Output as JSON')
  .option('-v, --verbose', 'Show detailed file-by-file analysis')
  .option('--min-severity <level>', 'Minimum severity to report (error|warning|info)', 'info')
  .option('--category <categories>', 'Comma-separated categories to check')
  .option('--exclude <categories>', 'Comma-separated categories to exclude')
  .action(async (path: string, options: {
    json?: boolean;
    verbose?: boolean;
    minSeverity?: string;
    category?: string;
    exclude?: string;
  }) => {
    console.log(pc.cyan('🔍 Reviewing test quality...\n'));
    
    const reviewOptions: any = {};
    
    if (options.minSeverity && ['error', 'warning', 'info'].includes(options.minSeverity)) {
      reviewOptions.minSeverity = options.minSeverity;
    }
    
    if (options.category) {
      reviewOptions.includedCategories = options.category.split(',').map(s => s.trim());
    }
    
    if (options.exclude) {
      reviewOptions.excludedCategories = options.exclude.split(',').map(s => s.trim());
    }
    
    try {
      const report = await reviewTestFiles(path, reviewOptions);
      
      if (options.json) {
        console.log(formatAsJSON(report));
      } else {
        console.log(formatReviewReport(report, options.verbose));
      }
      
      // Exit with non-zero if score is below threshold
      if (report.summary.overallScore < 50 || report.summary.violationsBySeverity.error > 5) {
        process.exit(1);
      }
    } catch (error) {
      console.error(pc.red(`Error reviewing tests: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

program.parse();
