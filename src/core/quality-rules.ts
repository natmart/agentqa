/**
 * Quality Rules for Test Review
 * 
 * Defines patterns and rules for detecting test quality issues.
 */

export type Severity = 'error' | 'warning' | 'info';
export type RuleCategory = 
  | 'flaky'
  | 'theater'
  | 'over-mocking'
  | 'assertions'
  | 'isolation'
  | 'maintainability'
  | 'structure';

export interface QualityRule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  severity: Severity;
  weight: number; // Impact on score (0-10)
  detect: (content: string, filename: string) => RuleViolation[];
}

export interface RuleViolation {
  ruleId: string;
  message: string;
  line?: number;
  column?: number;
  snippet?: string;
  suggestion?: string;
}

// ============================================
// Helper Functions
// ============================================

function findLineNumber(content: string, index: number): number {
  return content.substring(0, index).split('\n').length;
}

function getLineContent(content: string, lineNumber: number): string {
  const lines = content.split('\n');
  return lines[lineNumber - 1]?.trim() || '';
}

function matchAllWithLineNumbers(
  content: string,
  pattern: RegExp
): Array<{ match: RegExpMatchArray; line: number; snippet: string }> {
  const results: Array<{ match: RegExpMatchArray; line: number; snippet: string }> = [];
  let match;
  
  // Ensure global flag
  const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  
  while ((match = globalPattern.exec(content)) !== null) {
    const line = findLineNumber(content, match.index);
    results.push({
      match,
      line,
      snippet: getLineContent(content, line),
    });
  }
  
  return results;
}

// ============================================
// Flaky Test Detection Rules
// ============================================

export const flakyTestRules: QualityRule[] = [
  {
    id: 'flaky/timing-dependency',
    name: 'Timing Dependency',
    description: 'Tests that depend on specific timing are flaky',
    category: 'flaky',
    severity: 'error',
    weight: 8,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      // Detect setTimeout/setInterval in tests without proper mocking
      const timingPatterns = [
        /setTimeout\s*\([^,]+,\s*\d+\)/g,
        /setInterval\s*\([^,]+,\s*\d+\)/g,
        /new\s+Promise\s*\(\s*(?:resolve|r)\s*=>\s*setTimeout/g,
        /await\s+new\s+Promise\s*\(\s*r\s*=>\s*setTimeout\s*\(\s*r\s*,/g,
      ];
      
      for (const pattern of timingPatterns) {
        const matches = matchAllWithLineNumbers(content, pattern);
        for (const { line, snippet } of matches) {
          violations.push({
            ruleId: 'flaky/timing-dependency',
            message: 'Avoid hardcoded delays in tests. Use fake timers or waitFor utilities.',
            line,
            snippet,
            suggestion: 'Use vi.useFakeTimers() or jest.useFakeTimers(), or use waitFor/waitForExpect patterns.',
          });
        }
      }
      
      return violations;
    },
  },
  {
    id: 'flaky/random-data',
    name: 'Random Data Without Seed',
    description: 'Tests using random data without seeds are non-deterministic',
    category: 'flaky',
    severity: 'warning',
    weight: 6,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      const randomPatterns = [
        /Math\.random\s*\(\)/g,
        /crypto\.randomUUID\s*\(\)/g,
        /uuid\s*\(\)/g,
        /faker\.\w+/g,
        /Date\.now\s*\(\)/g,
        /new\s+Date\s*\(\s*\)/g,
      ];
      
      for (const pattern of randomPatterns) {
        const matches = matchAllWithLineNumbers(content, pattern);
        for (const { match, line, snippet } of matches) {
          // Check if there's a seed nearby
          const hasSeed = content.includes('faker.seed') || content.includes('Math.seedrandom');
          
          if (!hasSeed) {
            violations.push({
              ruleId: 'flaky/random-data',
              message: `Random/dynamic value "${match[0]}" can cause flaky tests.`,
              line,
              snippet,
              suggestion: 'Use seeded random generators or fixed test data. For dates, mock Date.now().',
            });
          }
        }
      }
      
      return violations;
    },
  },
  {
    id: 'flaky/async-without-await',
    name: 'Async Without Await',
    description: 'Async operations without proper awaiting cause race conditions',
    category: 'flaky',
    severity: 'error',
    weight: 9,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      // Detect async calls that might not be awaited
      const unawaitedPatterns = [
        /(?<!await\s+)(?<!return\s+)fetch\s*\(/g,
        /(?<!await\s+)(?<!return\s+)axios\.\w+\s*\(/g,
        /\.then\s*\([^)]*\)\s*;?\s*\n\s*expect/g, // .then() immediately followed by expect
      ];
      
      for (const pattern of unawaitedPatterns) {
        const matches = matchAllWithLineNumbers(content, pattern);
        for (const { line, snippet } of matches) {
          violations.push({
            ruleId: 'flaky/async-without-await',
            message: 'Async operation may not be properly awaited.',
            line,
            snippet,
            suggestion: 'Ensure all async operations are awaited before assertions.',
          });
        }
      }
      
      // Check for fire-and-forget patterns
      const fireAndForget = matchAllWithLineNumbers(
        content,
        /(?:it|test)\s*\([^,]+,\s*(?:async\s*)?\(\s*\)\s*=>\s*\{[^}]*(?<!await\s+)\w+\([^)]*\)\s*;\s*\}\s*\)/g
      );
      
      return violations;
    },
  },
  {
    id: 'flaky/shared-state',
    name: 'Shared Mutable State',
    description: 'Tests sharing mutable state can interfere with each other',
    category: 'flaky',
    severity: 'error',
    weight: 8,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      // Detect global variable mutations
      const globalMutations = matchAllWithLineNumbers(
        content,
        /(?:^|\n)\s*(?:let|var)\s+\w+\s*=[^;]+;(?=[\s\S]*(?:beforeEach|beforeAll|it|test|describe))/g
      );
      
      for (const { line, snippet } of globalMutations) {
        if (!snippet.includes('const') && !snippet.includes('//')) {
          violations.push({
            ruleId: 'flaky/shared-state',
            message: 'Mutable variable declared outside test scope may cause test interference.',
            line,
            snippet,
            suggestion: 'Move variable declaration inside beforeEach or individual tests, or use const.',
          });
        }
      }
      
      return violations;
    },
  },
  {
    id: 'flaky/network-dependency',
    name: 'Network Dependency',
    description: 'Tests making real network calls are unreliable',
    category: 'flaky',
    severity: 'error',
    weight: 9,
    detect: (content, filename) => {
      const violations: RuleViolation[] = [];
      
      // Skip if it's explicitly an integration/e2e test
      if (filename.includes('.e2e.') || filename.includes('.integration.')) {
        return violations;
      }
      
      // Detect real network calls without mocking
      const hasMocking = 
        content.includes('mock') || 
        content.includes('Mock') ||
        content.includes('nock') ||
        content.includes('msw') ||
        content.includes('fetchMock');
      
      const networkCalls = matchAllWithLineNumbers(
        content,
        /(?:fetch|axios|http|https)\s*[\.\(]/g
      );
      
      if (!hasMocking && networkCalls.length > 0) {
        for (const { line, snippet } of networkCalls) {
          violations.push({
            ruleId: 'flaky/network-dependency',
            message: 'Real network call detected without mocking.',
            line,
            snippet,
            suggestion: 'Use MSW, nock, or mock the HTTP client for reliable tests.',
          });
        }
      }
      
      return violations;
    },
  },
];

// ============================================
// Testing Theater Rules (Tests that don't test)
// ============================================

export const theaterRules: QualityRule[] = [
  {
    id: 'theater/no-assertions',
    name: 'No Assertions',
    description: 'Tests without assertions prove nothing',
    category: 'theater',
    severity: 'error',
    weight: 10,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      // Find all test blocks
      const testBlocks = matchAllWithLineNumbers(
        content,
        /(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g
      );
      
      for (const { match, line, snippet } of testBlocks) {
        const testBody = match[2];
        const testName = match[1];
        
        // Check for any assertion
        const hasAssertion = 
          /expect\s*\(/.test(testBody) ||
          /assert[\.\(]/.test(testBody) ||
          /should[\.\(]/.test(testBody) ||
          /\.to\./.test(testBody) ||
          /\.toBe/.test(testBody) ||
          /toThrow/.test(testBody) ||
          /rejects/.test(testBody) ||
          /resolves/.test(testBody);
        
        if (!hasAssertion) {
          violations.push({
            ruleId: 'theater/no-assertions',
            message: `Test "${testName}" has no assertions.`,
            line,
            snippet: `test("${testName}", ...)`,
            suggestion: 'Add expect() calls to verify behavior, or mark as .todo() if incomplete.',
          });
        }
      }
      
      return violations;
    },
  },
  {
    id: 'theater/always-true',
    name: 'Always-True Assertion',
    description: 'Assertions that always pass are meaningless',
    category: 'theater',
    severity: 'error',
    weight: 9,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      const alwaysTruePatterns = [
        /expect\s*\(\s*true\s*\)\s*\.toBe\s*\(\s*true\s*\)/g,
        /expect\s*\(\s*1\s*\)\s*\.toBe\s*\(\s*1\s*\)/g,
        /expect\s*\(\s*['"`][^'"`]*['"`]\s*\)\s*\.toBe\s*\(\s*['"`][^'"`]*['"`]\s*\)/g,
        /expect\s*\(\s*\d+\s*\+\s*\d+\s*\)\s*\.toBe\s*\(\s*\d+\s*\)/g,
        /assert\.ok\s*\(\s*true\s*\)/g,
        /expect\s*\(\s*['"]\w+['"]\s*\)\s*\.toContain\s*\(\s*['"]\w*['"]\s*\)/g,
      ];
      
      for (const pattern of alwaysTruePatterns) {
        const matches = matchAllWithLineNumbers(content, pattern);
        for (const { line, snippet } of matches) {
          violations.push({
            ruleId: 'theater/always-true',
            message: 'This assertion always passes and tests nothing meaningful.',
            line,
            snippet,
            suggestion: 'Assert on actual function outputs, not hardcoded values.',
          });
        }
      }
      
      return violations;
    },
  },
  {
    id: 'theater/empty-test',
    name: 'Empty Test',
    description: 'Empty tests provide no coverage',
    category: 'theater',
    severity: 'error',
    weight: 10,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      const emptyTests = matchAllWithLineNumbers(
        content,
        /(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:async\s*)?\(\s*\)\s*=>\s*\{\s*\}\s*\)/g
      );
      
      for (const { match, line } of emptyTests) {
        violations.push({
          ruleId: 'theater/empty-test',
          message: `Test "${match[1]}" is empty.`,
          line,
          snippet: `test("${match[1]}", () => {})`,
          suggestion: 'Implement the test or mark as .todo() if planned for later.',
        });
      }
      
      return violations;
    },
  },
  {
    id: 'theater/console-only',
    name: 'Console-Only Test',
    description: 'Tests that only console.log without asserting',
    category: 'theater',
    severity: 'warning',
    weight: 7,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      // Find tests that only have console statements
      const testBlocks = matchAllWithLineNumbers(
        content,
        /(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g
      );
      
      for (const { match, line } of testBlocks) {
        const testBody = match[2];
        const testName = match[1];
        
        const hasConsole = /console\.\w+\s*\(/.test(testBody);
        const hasAssertion = /expect\s*\(|assert[\.\(]|should[\.\(]/.test(testBody);
        
        if (hasConsole && !hasAssertion) {
          violations.push({
            ruleId: 'theater/console-only',
            message: `Test "${testName}" only logs to console without assertions.`,
            line,
            snippet: `test("${testName}", ...)`,
            suggestion: 'Replace console.log with proper assertions.',
          });
        }
      }
      
      return violations;
    },
  },
  {
    id: 'theater/expect-nothing',
    name: 'Expect on Undefined',
    description: 'Expecting on undefined/null without meaningful comparison',
    category: 'theater',
    severity: 'warning',
    weight: 6,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      const suspiciousPatterns = [
        /expect\s*\(\s*undefined\s*\)\s*\.(?!toBeUndefined|toBeDefined)/g,
        /expect\s*\(\s*null\s*\)\s*\.(?!toBeNull|toBe\(null)/g,
        /expect\s*\(\s*\)\s*\./g, // Empty expect()
      ];
      
      for (const pattern of suspiciousPatterns) {
        const matches = matchAllWithLineNumbers(content, pattern);
        for (const { line, snippet } of matches) {
          violations.push({
            ruleId: 'theater/expect-nothing',
            message: 'Assertion on undefined/null may not test actual behavior.',
            line,
            snippet,
            suggestion: 'Verify you are testing the right variable and behavior.',
          });
        }
      }
      
      return violations;
    },
  },
];

// ============================================
// Over-Mocking Rules
// ============================================

export const overMockingRules: QualityRule[] = [
  {
    id: 'mock/excessive-mocking',
    name: 'Excessive Mocking',
    description: 'Over-mocking defeats the purpose of testing',
    category: 'over-mocking',
    severity: 'warning',
    weight: 7,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      // Count mock declarations
      const mockCounts = {
        jest: (content.match(/jest\.mock\s*\(/g) || []).length,
        viMock: (content.match(/vi\.mock\s*\(/g) || []).length,
        spyOn: (content.match(/(?:jest|vi)\.spyOn\s*\(/g) || []).length,
        mockFn: (content.match(/(?:jest|vi)\.fn\s*\(/g) || []).length,
        mockImplementation: (content.match(/\.mockImplementation\s*\(/g) || []).length,
      };
      
      const totalMocks = Object.values(mockCounts).reduce((a, b) => a + b, 0);
      
      // Count actual test assertions
      const assertionCount = (content.match(/expect\s*\(/g) || []).length;
      
      // If mocks >> assertions, likely over-mocking
      if (totalMocks > 5 && totalMocks > assertionCount * 2) {
        violations.push({
          ruleId: 'mock/excessive-mocking',
          message: `File has ${totalMocks} mocks but only ${assertionCount} assertions. Possible over-mocking.`,
          line: 1,
          suggestion: 'Consider testing with fewer mocks. Each mock reduces test confidence.',
        });
      }
      
      return violations;
    },
  },
  {
    id: 'mock/mocking-what-you-test',
    name: 'Mocking What You Test',
    description: 'Mocking the module under test defeats the purpose',
    category: 'over-mocking',
    severity: 'error',
    weight: 9,
    detect: (content, filename) => {
      const violations: RuleViolation[] = [];
      
      // Extract what file is being tested from imports
      const importMatches = Array.from(content.matchAll(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g));
      const relativeImports = importMatches
        .map(m => m[1])
        .filter(i => i.startsWith('./') || i.startsWith('../'));
      
      // Check if any mocked module matches an imported module
      const mockMatches = Array.from(content.matchAll(/(?:jest|vi)\.mock\s*\(\s*['"]([^'"]+)['"]/g));
      
      for (const mockMatch of mockMatches) {
        const mockedPath = mockMatch[1];
        
        if (relativeImports.some(imp => 
          imp === mockedPath || 
          imp.endsWith(mockedPath) ||
          mockedPath.endsWith(imp.replace('./', ''))
        )) {
          violations.push({
            ruleId: 'mock/mocking-what-you-test',
            message: `Mocking "${mockedPath}" which appears to be the module under test.`,
            line: findLineNumber(content, mockMatch.index || 0),
            snippet: mockMatch[0],
            suggestion: 'Mock dependencies, not the code you are testing.',
          });
        }
      }
      
      return violations;
    },
  },
  {
    id: 'mock/mock-return-ignores-input',
    name: 'Mock Ignores Input',
    description: 'Mocks that always return the same value regardless of input',
    category: 'over-mocking',
    severity: 'info',
    weight: 3,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      // Detect mocks that return fixed values
      const fixedReturnPatterns = matchAllWithLineNumbers(
        content,
        /\.mockReturnValue\s*\([^)]+\)/g
      );
      
      const mockImplementations = matchAllWithLineNumbers(
        content,
        /\.mockImplementation\s*\(\s*\(\s*\)\s*=>/g
      );
      
      // Multiple fixed returns might indicate testing implementation not behavior
      if (fixedReturnPatterns.length > 3) {
        violations.push({
          ruleId: 'mock/mock-return-ignores-input',
          message: 'Multiple fixed mock return values may indicate over-specification.',
          line: fixedReturnPatterns[0]?.line || 1,
          suggestion: 'Consider if the test is too coupled to implementation details.',
        });
      }
      
      return violations;
    },
  },
];

// ============================================
// Missing Assertions Rules
// ============================================

export const assertionRules: QualityRule[] = [
  {
    id: 'assertion/weak-assertion',
    name: 'Weak Assertion',
    description: 'Using weak assertions that barely verify anything',
    category: 'assertions',
    severity: 'warning',
    weight: 5,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      const weakPatterns = [
        { pattern: /expect\s*\([^)]+\)\s*\.toBeTruthy\s*\(\)/g, issue: 'toBeTruthy() is weak - be specific about expected value' },
        { pattern: /expect\s*\([^)]+\)\s*\.toBeFalsy\s*\(\)/g, issue: 'toBeFalsy() is weak - be specific (null, undefined, false, 0?)' },
        { pattern: /expect\s*\([^)]+\)\s*\.toBeDefined\s*\(\)/g, issue: 'toBeDefined() only checks existence - verify the actual value' },
        { pattern: /expect\s*\(typeof\s+\w+\)\s*\.toBe\s*\(/g, issue: 'Checking type alone is weak - verify behavior' },
      ];
      
      for (const { pattern, issue } of weakPatterns) {
        const matches = matchAllWithLineNumbers(content, pattern);
        for (const { line, snippet } of matches) {
          violations.push({
            ruleId: 'assertion/weak-assertion',
            message: issue,
            line,
            snippet,
            suggestion: 'Use specific assertions like toBe(), toEqual(), or toMatchObject().',
          });
        }
      }
      
      return violations;
    },
  },
  {
    id: 'assertion/no-error-assertion',
    name: 'No Error Assertions',
    description: 'Async code should verify error handling',
    category: 'assertions',
    severity: 'info',
    weight: 4,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      // Check if test file has async tests but no error assertions
      const hasAsyncTests = /(?:it|test)\s*\([^,]+,\s*async/.test(content);
      const hasErrorAssertions = 
        /\.rejects\./.test(content) ||
        /toThrow/.test(content) ||
        /\.catch\s*\(/.test(content) ||
        /try\s*\{[^}]*\}\s*catch/.test(content);
      
      if (hasAsyncTests && !hasErrorAssertions) {
        violations.push({
          ruleId: 'assertion/no-error-assertion',
          message: 'Async tests should include error handling verification.',
          line: 1,
          suggestion: 'Add tests for error cases using .rejects.toThrow() or try/catch.',
        });
      }
      
      return violations;
    },
  },
  {
    id: 'assertion/single-assertion-syndrome',
    name: 'Single Assertion Per Test File',
    description: 'Test file with very few assertions may be incomplete',
    category: 'assertions',
    severity: 'info',
    weight: 3,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      const testCount = (content.match(/(?:it|test)\s*\(/g) || []).length;
      const assertionCount = (content.match(/expect\s*\(/g) || []).length;
      
      if (testCount >= 3 && assertionCount < testCount) {
        violations.push({
          ruleId: 'assertion/single-assertion-syndrome',
          message: `${testCount} tests with only ${assertionCount} assertions. Some tests may be incomplete.`,
          line: 1,
          suggestion: 'Ensure each test has meaningful assertions.',
        });
      }
      
      return violations;
    },
  },
];

// ============================================
// Poor Test Isolation Rules
// ============================================

export const isolationRules: QualityRule[] = [
  {
    id: 'isolation/test-order-dependency',
    name: 'Test Order Dependency',
    description: 'Tests that depend on execution order are fragile',
    category: 'isolation',
    severity: 'warning',
    weight: 7,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      // Detect shared variables modified across tests
      const hasSharedState = /(?:let|var)\s+\w+\s*;?\s*\n[\s\S]*?beforeEach[\s\S]*?(?:it|test)\s*\(/m.test(content);
      const modifiesInTest = /(?:it|test)\s*\([^)]*\)\s*=>\s*\{[^}]*(?:\w+\s*=\s*[^=]|\.push\(|\.pop\(|\.splice\()/m.test(content);
      
      if (hasSharedState && modifiesInTest) {
        // Check if there's proper reset in beforeEach
        const hasBeforeEach = /beforeEach\s*\(/m.test(content);
        const hasProperReset = /beforeEach\s*\([^)]*\)\s*=>\s*\{[^}]*(?:\w+\s*=\s*[\[\{]|\.length\s*=\s*0)/m.test(content);
        
        if (!hasBeforeEach || !hasProperReset) {
          violations.push({
            ruleId: 'isolation/test-order-dependency',
            message: 'Tests may depend on execution order due to shared mutable state.',
            line: 1,
            suggestion: 'Reset all shared state in beforeEach() or create fresh instances per test.',
          });
        }
      }
      
      return violations;
    },
  },
  {
    id: 'isolation/global-state',
    name: 'Global State Modification',
    description: 'Tests modifying global state can affect other tests',
    category: 'isolation',
    severity: 'error',
    weight: 8,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      const globalModifications = [
        { pattern: /process\.env\.\w+\s*=/g, msg: 'Modifying process.env' },
        { pattern: /global\.\w+\s*=/g, msg: 'Modifying global object' },
        { pattern: /window\.\w+\s*=/g, msg: 'Modifying window object' },
        { pattern: /document\.\w+\s*=/g, msg: 'Modifying document' },
      ];
      
      for (const { pattern, msg } of globalModifications) {
        const matches = matchAllWithLineNumbers(content, pattern);
        for (const { line, snippet } of matches) {
          // Check if it's cleaned up in afterEach
          const hasCleanup = /afterEach\s*\([^)]*\)\s*=>\s*\{/.test(content);
          
          violations.push({
            ruleId: 'isolation/global-state',
            message: `${msg} without ${hasCleanup ? 'verifying' : 'any'} cleanup.`,
            line,
            snippet,
            suggestion: 'Restore original value in afterEach() or use vi.stubEnv()/jest.replaceProperty().',
          });
        }
      }
      
      return violations;
    },
  },
  {
    id: 'isolation/filesystem-side-effects',
    name: 'Filesystem Side Effects',
    description: 'Tests creating files without cleanup',
    category: 'isolation',
    severity: 'warning',
    weight: 6,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      const fsOperations = matchAllWithLineNumbers(
        content,
        /(?:writeFile|writeFileSync|mkdir|mkdirSync|appendFile)\s*\(/g
      );
      
      const hasCleanup = 
        /(?:unlink|unlinkSync|rm|rmSync|rmdir)\s*\(/.test(content) ||
        /afterEach\s*\([^)]*\)\s*=>\s*\{[^}]*(?:unlink|rm)/.test(content) ||
        /tmp|temp/i.test(content);
      
      if (fsOperations.length > 0 && !hasCleanup) {
        for (const { line, snippet } of fsOperations) {
          violations.push({
            ruleId: 'isolation/filesystem-side-effects',
            message: 'File system operation without visible cleanup.',
            line,
            snippet,
            suggestion: 'Clean up created files in afterEach() or use temp directories.',
          });
        }
      }
      
      return violations;
    },
  },
];

// ============================================
// Maintainability Rules
// ============================================

export const maintainabilityRules: QualityRule[] = [
  {
    id: 'maintain/poor-test-name',
    name: 'Poor Test Name',
    description: 'Test names should describe behavior, not implementation',
    category: 'maintainability',
    severity: 'info',
    weight: 3,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      const testNames = matchAllWithLineNumbers(
        content,
        /(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g
      );
      
      const badPatterns = [
        { pattern: /^test\s*\d+$/i, issue: 'Numbered test name (test 1, test 2)' },
        { pattern: /^it works$/i, issue: 'Vague "it works" name' },
        { pattern: /^should work$/i, issue: 'Vague "should work" name' },
        { pattern: /^basic test$/i, issue: 'Vague "basic test" name' },
        { pattern: /^test$/i, issue: 'Just "test" as name' },
        { pattern: /function\s+\w+$/, issue: 'Name just describes what function, not behavior' },
      ];
      
      for (const { match, line } of testNames) {
        const name = match[1];
        
        for (const { pattern, issue } of badPatterns) {
          if (pattern.test(name)) {
            violations.push({
              ruleId: 'maintain/poor-test-name',
              message: `Test name "${name}": ${issue}.`,
              line,
              snippet: `test("${name}", ...)`,
              suggestion: 'Use descriptive names like "should return empty array when input is null".',
            });
            break;
          }
        }
        
        // Check for very short names
        if (name.length < 5 && !name.includes('should')) {
          violations.push({
            ruleId: 'maintain/poor-test-name',
            message: `Test name "${name}" is too short to be descriptive.`,
            line,
            snippet: `test("${name}", ...)`,
            suggestion: 'Describe what behavior is being tested.',
          });
        }
      }
      
      return violations;
    },
  },
  {
    id: 'maintain/deeply-nested',
    name: 'Deeply Nested Tests',
    description: 'Excessive nesting makes tests hard to read',
    category: 'maintainability',
    severity: 'warning',
    weight: 4,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      // Count nested describe blocks
      const describeMatches = Array.from(content.matchAll(/describe\s*\(/g));
      
      // Simple heuristic: if more than 4 describes and the deepest nesting > 3
      let maxNesting = 0;
      let currentNesting = 0;
      
      for (const char of content) {
        if (char === '{') currentNesting++;
        if (char === '}') currentNesting--;
        maxNesting = Math.max(maxNesting, currentNesting);
      }
      
      if (describeMatches.length > 4 && maxNesting > 8) {
        violations.push({
          ruleId: 'maintain/deeply-nested',
          message: 'Test file has deeply nested describe blocks.',
          line: 1,
          suggestion: 'Flatten structure or split into multiple test files.',
        });
      }
      
      return violations;
    },
  },
  {
    id: 'maintain/large-test-file',
    name: 'Large Test File',
    description: 'Very large test files are hard to maintain',
    category: 'maintainability',
    severity: 'info',
    weight: 2,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      const lines = content.split('\n').length;
      const testCount = (content.match(/(?:it|test)\s*\(/g) || []).length;
      
      if (lines > 500) {
        violations.push({
          ruleId: 'maintain/large-test-file',
          message: `Test file is ${lines} lines with ${testCount} tests. Consider splitting.`,
          line: 1,
          suggestion: 'Split into focused test files organized by feature or component.',
        });
      }
      
      return violations;
    },
  },
  {
    id: 'maintain/magic-numbers',
    name: 'Magic Numbers in Tests',
    description: 'Unexplained magic numbers reduce test clarity',
    category: 'maintainability',
    severity: 'info',
    weight: 2,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      // Find expect statements with magic numbers
      const magicNumbers = matchAllWithLineNumbers(
        content,
        /expect\s*\([^)]+\)\s*\.toBe\s*\(\s*(\d{3,})\s*\)/g
      );
      
      for (const { match, line, snippet } of magicNumbers) {
        violations.push({
          ruleId: 'maintain/magic-numbers',
          message: `Magic number ${match[1]} in assertion.`,
          line,
          snippet,
          suggestion: 'Extract to a named constant that explains the expected value.',
        });
      }
      
      return violations;
    },
  },
  {
    id: 'maintain/commented-test',
    name: 'Commented Out Test',
    description: 'Commented tests should be deleted or fixed',
    category: 'maintainability',
    severity: 'warning',
    weight: 4,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      const commentedTests = matchAllWithLineNumbers(
        content,
        /\/\/\s*(?:it|test|describe)\s*\(/g
      );
      
      const blockCommentedTests = matchAllWithLineNumbers(
        content,
        /\/\*[\s\S]*?(?:it|test|describe)\s*\([\s\S]*?\*\//g
      );
      
      for (const { line, snippet } of [...commentedTests, ...blockCommentedTests]) {
        violations.push({
          ruleId: 'maintain/commented-test',
          message: 'Commented out test code found.',
          line,
          snippet,
          suggestion: 'Delete commented tests or use .skip() / .todo() for temporary skipping.',
        });
      }
      
      return violations;
    },
  },
];

// ============================================
// Structure Rules
// ============================================

export const structureRules: QualityRule[] = [
  {
    id: 'structure/missing-describe',
    name: 'Missing Describe Block',
    description: 'Tests should be organized in describe blocks',
    category: 'structure',
    severity: 'info',
    weight: 2,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      const hasDescribe = /describe\s*\(/.test(content);
      const hasTests = /(?:it|test)\s*\(/.test(content);
      
      if (hasTests && !hasDescribe) {
        violations.push({
          ruleId: 'structure/missing-describe',
          message: 'Tests are not organized in describe blocks.',
          line: 1,
          suggestion: 'Wrap related tests in describe() blocks for better organization.',
        });
      }
      
      return violations;
    },
  },
  {
    id: 'structure/arrange-act-assert',
    name: 'Missing AAA Pattern',
    description: 'Tests should follow Arrange-Act-Assert pattern',
    category: 'structure',
    severity: 'info',
    weight: 2,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      // Find tests with complex bodies that don't have clear sections
      const testBlocks = matchAllWithLineNumbers(
        content,
        /(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g
      );
      
      for (const { match, line } of testBlocks) {
        const body = match[2];
        const name = match[1];
        
        // Skip short tests (likely simple enough)
        if (body.split('\n').length < 5) continue;
        
        // Check for AAA comments or clear structure
        const hasAAA = 
          /\/\/\s*(?:arrange|act|assert|given|when|then|setup)/i.test(body) ||
          body.split('expect')[0].includes('\n\n'); // Blank line separating setup from assertion
        
        if (!hasAAA && body.length > 200) {
          violations.push({
            ruleId: 'structure/arrange-act-assert',
            message: `Test "${name}" may benefit from clearer AAA structure.`,
            line,
            suggestion: 'Add comments (// Arrange, // Act, // Assert) or blank lines to separate sections.',
          });
        }
      }
      
      return violations;
    },
  },
  {
    id: 'structure/multiple-acts',
    name: 'Multiple Acts Per Test',
    description: 'Tests with multiple acts are testing multiple things',
    category: 'structure',
    severity: 'warning',
    weight: 5,
    detect: (content) => {
      const violations: RuleViolation[] = [];
      
      const testBlocks = matchAllWithLineNumbers(
        content,
        /(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g
      );
      
      for (const { match, line } of testBlocks) {
        const body = match[2];
        const name = match[1];
        
        // Count distinct expect blocks separated by non-assertion code
        const expectGroups = body.split(/expect\s*\(/);
        let actCount = 0;
        
        for (let i = 1; i < expectGroups.length; i++) {
          // Check if there's significant code between expect groups
          const betweenCode = expectGroups[i].split(/\)\s*;/)[1] || '';
          if (betweenCode.match(/\w+\s*\(/)) {
            actCount++;
          }
        }
        
        if (actCount >= 2) {
          violations.push({
            ruleId: 'structure/multiple-acts',
            message: `Test "${name}" appears to have multiple act phases.`,
            line,
            suggestion: 'Split into separate tests, each testing one behavior.',
          });
        }
      }
      
      return violations;
    },
  },
];

// ============================================
// Export All Rules
// ============================================

export const allRules: QualityRule[] = [
  ...flakyTestRules,
  ...theaterRules,
  ...overMockingRules,
  ...assertionRules,
  ...isolationRules,
  ...maintainabilityRules,
  ...structureRules,
];

export const rulesByCategory: Record<RuleCategory, QualityRule[]> = {
  flaky: flakyTestRules,
  theater: theaterRules,
  'over-mocking': overMockingRules,
  assertions: assertionRules,
  isolation: isolationRules,
  maintainability: maintainabilityRules,
  structure: structureRules,
};

export const categoryDescriptions: Record<RuleCategory, string> = {
  flaky: 'Flaky Test Detection - Tests that may pass or fail randomly',
  theater: 'Testing Theater - Tests that appear to test but actually verify nothing',
  'over-mocking': 'Over-Mocking - Tests that mock so much they test nothing real',
  assertions: 'Assertion Quality - Weak or missing assertions',
  isolation: 'Test Isolation - Tests that may interfere with each other',
  maintainability: 'Maintainability - Tests that are hard to understand or maintain',
  structure: 'Test Structure - Organization and clarity issues',
};
