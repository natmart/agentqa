import { glob } from 'glob';
import { readFile } from 'fs/promises';
import { extname, basename, dirname, relative } from 'path';

export interface ScannedFile {
  path: string;
  relativePath: string;
  language: 'typescript' | 'javascript' | 'python' | 'unknown';
  content: string;
  exports: string[];
  functions: string[];
  classes: string[];
  hasTests: boolean;
  testFile?: string;
}

export interface ScanResult {
  rootDir: string;
  files: ScannedFile[];
  stats: {
    total: number;
    withTests: number;
    withoutTests: number;
    byLanguage: Record<string, number>;
  };
}

const LANGUAGE_MAP: Record<string, ScannedFile['language']> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.py': 'python',
};

const TEST_PATTERNS = [
  '**/*.test.{ts,tsx,js,jsx}',
  '**/*.spec.{ts,tsx,js,jsx}',
  '**/__tests__/**/*.{ts,tsx,js,jsx}',
  '**/test_*.py',
  '**/*_test.py',
  '**/tests/**/*.py',
];

const SOURCE_PATTERNS = [
  '**/*.{ts,tsx,js,jsx,py}',
];

const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/coverage/**',
  '**/__pycache__/**',
  '**/venv/**',
  '**/.venv/**',
];

function extractFunctions(content: string, language: string): string[] {
  const functions: string[] = [];
  
  if (language === 'typescript' || language === 'javascript') {
    // Match function declarations, arrow functions, and methods
    const patterns = [
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
      /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/g,
      /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\w*\s*=>/g,
      /^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*[:{]/gm,
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1] && !['if', 'for', 'while', 'switch', 'catch'].includes(match[1])) {
          functions.push(match[1]);
        }
      }
    }
  } else if (language === 'python') {
    const pattern = /^def\s+(\w+)\s*\(/gm;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (!match[1].startsWith('_') || match[1].startsWith('__')) {
        functions.push(match[1]);
      }
    }
  }
  
  return [...new Set(functions)];
}

function extractClasses(content: string, language: string): string[] {
  const classes: string[] = [];
  
  if (language === 'typescript' || language === 'javascript') {
    const pattern = /(?:export\s+)?class\s+(\w+)/g;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      classes.push(match[1]);
    }
  } else if (language === 'python') {
    const pattern = /^class\s+(\w+)/gm;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      classes.push(match[1]);
    }
  }
  
  return classes;
}

function extractExports(content: string, language: string): string[] {
  const exports: string[] = [];
  
  if (language === 'typescript' || language === 'javascript') {
    // Named exports
    const namedPattern = /export\s+(?:const|let|var|function|class|async function)\s+(\w+)/g;
    let match;
    while ((match = namedPattern.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    // Export list
    const listPattern = /export\s*\{([^}]+)\}/g;
    while ((match = listPattern.exec(content)) !== null) {
      const items = match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim());
      exports.push(...items.filter(Boolean));
    }
  }
  
  return [...new Set(exports)];
}

function isTestFile(filepath: string): boolean {
  const name = basename(filepath);
  return (
    name.includes('.test.') ||
    name.includes('.spec.') ||
    name.startsWith('test_') ||
    name.endsWith('_test.py') ||
    filepath.includes('__tests__') ||
    filepath.includes('/tests/')
  );
}

function findTestFile(filepath: string, testFiles: Set<string>): string | undefined {
  const base = basename(filepath);
  const dir = dirname(filepath);
  const ext = extname(filepath);
  const nameWithoutExt = base.replace(ext, '');
  
  // Check common test file patterns
  const possibleTests = [
    `${dir}/${nameWithoutExt}.test${ext}`,
    `${dir}/${nameWithoutExt}.spec${ext}`,
    `${dir}/__tests__/${nameWithoutExt}.test${ext}`,
    `${dir}/__tests__/${nameWithoutExt}.spec${ext}`,
    `${dir}/test_${nameWithoutExt}.py`,
    `${dir}/${nameWithoutExt}_test.py`,
  ];
  
  return possibleTests.find(p => testFiles.has(p));
}

export async function scanCodebase(rootDir: string): Promise<ScanResult> {
  const allFiles = await glob(SOURCE_PATTERNS, {
    cwd: rootDir,
    ignore: IGNORE_PATTERNS,
    absolute: true,
  });
  
  const testFiles = new Set(
    allFiles.filter(f => isTestFile(f))
  );
  
  const sourceFiles = allFiles.filter(f => !isTestFile(f));
  
  const scannedFiles: ScannedFile[] = [];
  const stats = {
    total: 0,
    withTests: 0,
    withoutTests: 0,
    byLanguage: {} as Record<string, number>,
  };
  
  for (const filepath of sourceFiles) {
    try {
      const content = await readFile(filepath, 'utf-8');
      const ext = extname(filepath);
      const language = LANGUAGE_MAP[ext] || 'unknown';
      const testFile = findTestFile(filepath, testFiles);
      
      const file: ScannedFile = {
        path: filepath,
        relativePath: relative(rootDir, filepath),
        language,
        content,
        exports: extractExports(content, language),
        functions: extractFunctions(content, language),
        classes: extractClasses(content, language),
        hasTests: !!testFile,
        testFile,
      };
      
      scannedFiles.push(file);
      stats.total++;
      stats.byLanguage[language] = (stats.byLanguage[language] || 0) + 1;
      
      if (file.hasTests) {
        stats.withTests++;
      } else {
        stats.withoutTests++;
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  return { rootDir, files: scannedFiles, stats };
}

export function generateTestSuggestions(scanResult: ScanResult): Array<{
  file: ScannedFile;
  suggestions: string[];
  priority: 'high' | 'medium' | 'low';
}> {
  return scanResult.files
    .filter(f => !f.hasTests && (f.functions.length > 0 || f.classes.length > 0))
    .map(file => {
      const suggestions: string[] = [];
      
      for (const fn of file.functions) {
        suggestions.push(`Test function: ${fn}()`);
      }
      
      for (const cls of file.classes) {
        suggestions.push(`Test class: ${cls}`);
      }
      
      // Determine priority based on exports and complexity
      let priority: 'high' | 'medium' | 'low' = 'low';
      if (file.exports.length > 0) {
        priority = 'high';
      } else if (file.functions.length > 3 || file.classes.length > 0) {
        priority = 'medium';
      }
      
      return { file, suggestions, priority };
    })
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}
