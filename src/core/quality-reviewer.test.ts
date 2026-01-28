import { describe, it, expect } from 'vitest';
import { reviewTestFile, reviewTestFiles } from './quality-reviewer.js';
import {
  flakyTestRules,
  theaterRules,
  overMockingRules,
  assertionRules,
  isolationRules,
  maintainabilityRules,
  allRules,
} from './quality-rules.js';

describe('Quality Reviewer', () => {
  describe('reviewTestFile', () => {
    it('should return perfect score for well-written test', () => {
      const goodTest = `
        import { describe, it, expect } from 'vitest';
        import { add } from './math';

        describe('add function', () => {
          it('should return sum of two positive numbers', () => {
            const result = add(2, 3);
            expect(result).toBe(5);
          });

          it('should handle negative numbers', () => {
            const result = add(-1, 5);
            expect(result).toBe(4);
          });

          it('should return 0 when adding 0 to 0', () => {
            expect(add(0, 0)).toBe(0);
          });
        });
      `;

      const review = reviewTestFile(goodTest, 'math.test.ts');
      
      expect(review.score).toBeGreaterThanOrEqual(80);
      expect(review.testCount).toBe(3);
      expect(review.assertionCount).toBe(3);
    });

    it('should detect empty tests', () => {
      const emptyTest = `
        import { describe, it, expect } from 'vitest';

        describe('something', () => {
          it('should do something', () => {});
        });
      `;

      const review = reviewTestFile(emptyTest, 'empty.test.ts');
      
      const emptyViolation = review.violations.find(v => v.ruleId === 'theater/empty-test');
      expect(emptyViolation).toBeDefined();
      expect(review.score).toBeLessThan(100);
    });

    it('should detect tests without assertions', () => {
      const noAssertionTest = `
        import { describe, it } from 'vitest';
        import { fetchData } from './api';

        describe('API', () => {
          it('should fetch data', async () => {
            const data = await fetchData();
            console.log(data);
          });
        });
      `;

      const review = reviewTestFile(noAssertionTest, 'api.test.ts');
      
      const noAssertViolation = review.violations.find(v => v.ruleId === 'theater/no-assertions');
      expect(noAssertViolation).toBeDefined();
    });

    it('should detect always-true assertions', () => {
      const alwaysTrueTest = `
        import { describe, it, expect } from 'vitest';

        describe('fake tests', () => {
          it('should always pass', () => {
            expect(true).toBe(true);
            expect(1).toBe(1);
          });
        });
      `;

      const review = reviewTestFile(alwaysTrueTest, 'fake.test.ts');
      
      const alwaysTrueViolations = review.violations.filter(v => v.ruleId === 'theater/always-true');
      expect(alwaysTrueViolations.length).toBeGreaterThan(0);
    });

    it('should detect timing dependencies', () => {
      const flakyTest = `
        import { describe, it, expect } from 'vitest';

        describe('async stuff', () => {
          it('should wait for something', async () => {
            await new Promise(r => setTimeout(r, 1000));
            expect(true).toBe(true);
          });
        });
      `;

      const review = reviewTestFile(flakyTest, 'flaky.test.ts');
      
      const timingViolation = review.violations.find(v => v.ruleId === 'flaky/timing-dependency');
      expect(timingViolation).toBeDefined();
    });

    it('should detect random data usage', () => {
      const randomTest = `
        import { describe, it, expect } from 'vitest';

        describe('random tests', () => {
          it('should handle random id', () => {
            const id = Math.random();
            const obj = { id };
            expect(obj.id).toBe(id);
          });
        });
      `;

      const review = reviewTestFile(randomTest, 'random.test.ts');
      
      const randomViolation = review.violations.find(v => v.ruleId === 'flaky/random-data');
      expect(randomViolation).toBeDefined();
    });

    it('should detect excessive mocking', () => {
      const overMockedTest = `
        import { describe, it, expect, vi } from 'vitest';

        vi.mock('./module1');
        vi.mock('./module2');
        vi.mock('./module3');
        vi.mock('./module4');
        vi.mock('./module5');
        vi.mock('./module6');

        describe('over-mocked', () => {
          it('should test something', () => {
            expect(true).toBe(true);
          });
        });
      `;

      const review = reviewTestFile(overMockedTest, 'mocked.test.ts');
      
      const mockViolation = review.violations.find(v => v.ruleId === 'mock/excessive-mocking');
      expect(mockViolation).toBeDefined();
    });

    it('should detect weak assertions', () => {
      const weakTest = `
        import { describe, it, expect } from 'vitest';

        describe('weak', () => {
          it('should return something', () => {
            const result = getData();
            expect(result).toBeTruthy();
            expect(result).toBeDefined();
          });
        });
      `;

      const review = reviewTestFile(weakTest, 'weak.test.ts');
      
      const weakViolations = review.violations.filter(v => v.ruleId === 'assertion/weak-assertion');
      expect(weakViolations.length).toBeGreaterThan(0);
    });

    it('should detect global state modification', () => {
      const globalStateTest = `
        import { describe, it, expect } from 'vitest';

        describe('env tests', () => {
          it('should modify env', () => {
            process.env.NODE_ENV = 'test';
            expect(process.env.NODE_ENV).toBe('test');
          });
        });
      `;

      const review = reviewTestFile(globalStateTest, 'env.test.ts');
      
      const globalViolation = review.violations.find(v => v.ruleId === 'isolation/global-state');
      expect(globalViolation).toBeDefined();
    });

    it('should detect poor test names', () => {
      const poorNameTest = `
        import { describe, it, expect } from 'vitest';

        describe('stuff', () => {
          it('test', () => {
            expect(1 + 1).toBe(2);
          });

          it('test 1', () => {
            expect(2 + 2).toBe(4);
          });
        });
      `;

      const review = reviewTestFile(poorNameTest, 'naming.test.ts');
      
      const nameViolations = review.violations.filter(v => v.ruleId === 'maintain/poor-test-name');
      expect(nameViolations.length).toBeGreaterThan(0);
    });

    it('should detect commented out tests', () => {
      const commentedTest = `
        import { describe, it, expect } from 'vitest';

        describe('tests', () => {
          it('should work', () => {
            expect(true).toBe(true);
          });

          // it('should also work', () => {
          //   expect(false).toBe(false);
          // });
        });
      `;

      const review = reviewTestFile(commentedTest, 'commented.test.ts');
      
      const commentViolation = review.violations.find(v => v.ruleId === 'maintain/commented-test');
      expect(commentViolation).toBeDefined();
    });

    it('should detect missing describe blocks', () => {
      const noDescribeTest = `
        import { it, expect } from 'vitest';

        it('standalone test 1', () => {
          expect(1).toBe(1);
        });

        it('standalone test 2', () => {
          expect(2).toBe(2);
        });
      `;

      const review = reviewTestFile(noDescribeTest, 'no-describe.test.ts');
      
      const structureViolation = review.violations.find(v => v.ruleId === 'structure/missing-describe');
      expect(structureViolation).toBeDefined();
    });
  });

  describe('Score Calculation', () => {
    it('should give higher scores to tests with fewer violations', () => {
      const goodTest = `
        import { describe, it, expect } from 'vitest';

        describe('Calculator', () => {
          it('should add two numbers correctly', () => {
            expect(add(2, 3)).toBe(5);
          });
        });
      `;

      const badTest = `
        import { describe, it, expect } from 'vitest';

        describe('Calculator', () => {
          it('test', () => {});
          it('test 2', () => {
            console.log('hello');
          });
          it('test 3', () => {
            expect(true).toBe(true);
          });
        });
      `;

      const goodReview = reviewTestFile(goodTest, 'good.test.ts');
      const badReview = reviewTestFile(badTest, 'bad.test.ts');

      expect(goodReview.score).toBeGreaterThan(badReview.score);
    });

    it('should weight categories appropriately', () => {
      const review = reviewTestFile(`
        import { describe, it, expect } from 'vitest';

        describe('test', () => {
          it('should work', () => {
            expect(1).toBe(1);
          });
        });
      `, 'test.ts');

      // Check that all categories are scored
      const categories = review.scoreBreakdown.map(s => s.category);
      expect(categories).toContain('flaky');
      expect(categories).toContain('theater');
      expect(categories).toContain('assertions');
    });
  });

  describe('Category Breakdown', () => {
    it('should provide score breakdown by category', () => {
      const testContent = `
        import { describe, it, expect, vi } from 'vitest';

        vi.mock('./dep1');
        vi.mock('./dep2');
        vi.mock('./dep3');
        vi.mock('./dep4');
        vi.mock('./dep5');
        vi.mock('./dep6');

        describe('over-mocked test', () => {
          it('test 1', () => {
            expect(true).toBe(true);
          });
        });
      `;

      const review = reviewTestFile(testContent, 'mocked.test.ts');

      // Should have lower score in over-mocking category
      const mockingScore = review.scoreBreakdown.find(s => s.category === 'over-mocking');
      expect(mockingScore).toBeDefined();
      expect(mockingScore!.violations).toBeGreaterThan(0);
    });
  });

  describe('Quality Rules', () => {
    describe('Flaky Test Rules', () => {
      it('should have rules for common flaky patterns', () => {
        const ruleIds = flakyTestRules.map(r => r.id);
        
        expect(ruleIds).toContain('flaky/timing-dependency');
        expect(ruleIds).toContain('flaky/random-data');
        expect(ruleIds).toContain('flaky/async-without-await');
        expect(ruleIds).toContain('flaky/shared-state');
        expect(ruleIds).toContain('flaky/network-dependency');
      });
    });

    describe('Testing Theater Rules', () => {
      it('should have rules for tests that dont test', () => {
        const ruleIds = theaterRules.map(r => r.id);
        
        expect(ruleIds).toContain('theater/no-assertions');
        expect(ruleIds).toContain('theater/always-true');
        expect(ruleIds).toContain('theater/empty-test');
        expect(ruleIds).toContain('theater/console-only');
      });
    });

    describe('Over-Mocking Rules', () => {
      it('should have rules for excessive mocking', () => {
        const ruleIds = overMockingRules.map(r => r.id);
        
        expect(ruleIds).toContain('mock/excessive-mocking');
        expect(ruleIds).toContain('mock/mocking-what-you-test');
      });
    });

    describe('Assertion Rules', () => {
      it('should have rules for assertion quality', () => {
        const ruleIds = assertionRules.map(r => r.id);
        
        expect(ruleIds).toContain('assertion/weak-assertion');
        expect(ruleIds).toContain('assertion/no-error-assertion');
      });
    });

    describe('Isolation Rules', () => {
      it('should have rules for test isolation', () => {
        const ruleIds = isolationRules.map(r => r.id);
        
        expect(ruleIds).toContain('isolation/test-order-dependency');
        expect(ruleIds).toContain('isolation/global-state');
        expect(ruleIds).toContain('isolation/filesystem-side-effects');
      });
    });

    describe('Maintainability Rules', () => {
      it('should have rules for test maintainability', () => {
        const ruleIds = maintainabilityRules.map(r => r.id);
        
        expect(ruleIds).toContain('maintain/poor-test-name');
        expect(ruleIds).toContain('maintain/deeply-nested');
        expect(ruleIds).toContain('maintain/large-test-file');
        expect(ruleIds).toContain('maintain/commented-test');
      });
    });
  });

  describe('Review Options', () => {
    it('should filter by minimum severity', () => {
      const testWithInfoIssue = `
        import { describe, it, expect } from 'vitest';

        describe('test', () => {
          it('x', () => {
            expect(1).toBe(1);
          });
        });
      `;

      const withInfo = reviewTestFile(testWithInfoIssue, 'test.ts', { minSeverity: 'info' });
      const withWarning = reviewTestFile(testWithInfoIssue, 'test.ts', { minSeverity: 'warning' });

      // Info-level issues should be filtered out when minSeverity is 'warning'
      const infoViolationsWithInfo = withInfo.violations.filter(v => {
        const rule = allRules.find(r => r.id === v.ruleId);
        return rule?.severity === 'info';
      });

      const infoViolationsWithWarning = withWarning.violations.filter(v => {
        const rule = allRules.find(r => r.id === v.ruleId);
        return rule?.severity === 'info';
      });

      expect(infoViolationsWithWarning.length).toBeLessThanOrEqual(infoViolationsWithInfo.length);
    });

    it('should filter by included categories', () => {
      const testContent = `
        import { describe, it, expect } from 'vitest';

        describe('test', () => {
          it('test 1', () => {});  // theater/empty-test
          setTimeout(() => {}, 100);  // flaky/timing-dependency
        });
      `;

      const flakyOnly = reviewTestFile(testContent, 'test.ts', { 
        includedCategories: ['flaky'] 
      });

      const theaterOnly = reviewTestFile(testContent, 'test.ts', { 
        includedCategories: ['theater'] 
      });

      // Flaky-only should not have theater violations
      const flakyTheaterViolations = flakyOnly.violations.filter(v => 
        v.ruleId.startsWith('theater/')
      );
      expect(flakyTheaterViolations).toHaveLength(0);

      // Theater-only should not have flaky violations
      const theaterFlakyViolations = theaterOnly.violations.filter(v =>
        v.ruleId.startsWith('flaky/')
      );
      expect(theaterFlakyViolations).toHaveLength(0);
    });

    it('should filter by excluded categories', () => {
      const testContent = `
        import { describe, it, expect } from 'vitest';

        describe('test', () => {
          it('test 1', () => {});  // theater issue
        });
      `;

      const excludeTheater = reviewTestFile(testContent, 'test.ts', {
        excludedCategories: ['theater']
      });

      const theaterViolations = excludeTheater.violations.filter(v =>
        v.ruleId.startsWith('theater/')
      );
      expect(theaterViolations).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty test file', () => {
      const emptyContent = '';
      const review = reviewTestFile(emptyContent, 'empty.test.ts');
      
      expect(review.testCount).toBe(0);
      expect(review.assertionCount).toBe(0);
    });

    it('should handle non-test TypeScript file', () => {
      const nonTestContent = `
        export function add(a: number, b: number): number {
          return a + b;
        }
      `;
      
      const review = reviewTestFile(nonTestContent, 'math.ts');
      
      expect(review.testCount).toBe(0);
    });

    it('should handle malformed test content gracefully', () => {
      const malformedContent = `
        describe('broken', () => {
          it('incomplete
      `;
      
      // Should not throw
      const review = reviewTestFile(malformedContent, 'broken.test.ts');
      expect(review).toBeDefined();
    });
  });

  describe('Summary Generation', () => {
    it('should generate meaningful file summary', () => {
      const goodTest = `
        import { describe, it, expect } from 'vitest';

        describe('good tests', () => {
          it('should work correctly', () => {
            expect(calculate(1, 2)).toBe(3);
          });
        });
      `;

      const review = reviewTestFile(goodTest, 'good.test.ts');
      
      expect(review.summary).toContain('test');
      expect(review.summary).toContain('assertion');
    });

    it('should indicate issues in summary when present', () => {
      const badTest = `
        import { describe, it, expect } from 'vitest';

        describe('bad tests', () => {
          it('empty test', () => {});
          it('always true', () => {
            expect(true).toBe(true);
          });
        });
      `;

      const review = reviewTestFile(badTest, 'bad.test.ts');
      
      // Summary should mention issues
      expect(review.summary.toLowerCase()).toMatch(/error|warning|score/);
    });
  });
});

describe('Quality Rules Unit Tests', () => {
  describe('flaky/timing-dependency rule', () => {
    const rule = flakyTestRules.find(r => r.id === 'flaky/timing-dependency')!;

    it('should detect setTimeout with delay', () => {
      const content = 'setTimeout(() => {}, 1000);';
      const violations = rule.detect(content, 'test.ts');
      expect(violations.length).toBeGreaterThan(0);
    });

    it('should detect setInterval', () => {
      const content = 'setInterval(check, 500);';
      const violations = rule.detect(content, 'test.ts');
      expect(violations.length).toBeGreaterThan(0);
    });

    it('should detect Promise-based delays', () => {
      const content = 'await new Promise(r => setTimeout(r, 100));';
      const violations = rule.detect(content, 'test.ts');
      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe('theater/empty-test rule', () => {
    const rule = theaterRules.find(r => r.id === 'theater/empty-test')!;

    it('should detect empty it() blocks', () => {
      const content = `it('should work', () => {})`;
      const violations = rule.detect(content, 'test.ts');
      expect(violations.length).toBe(1);
    });

    it('should detect empty test() blocks', () => {
      const content = `test('should work', () => {})`;
      const violations = rule.detect(content, 'test.ts');
      expect(violations.length).toBe(1);
    });

    it('should not flag tests with content', () => {
      const content = `it('should work', () => { expect(1).toBe(1); })`;
      const violations = rule.detect(content, 'test.ts');
      expect(violations.length).toBe(0);
    });
  });

  describe('theater/always-true rule', () => {
    const rule = theaterRules.find(r => r.id === 'theater/always-true')!;

    it('should detect expect(true).toBe(true)', () => {
      const content = 'expect(true).toBe(true)';
      const violations = rule.detect(content, 'test.ts');
      expect(violations.length).toBe(1);
    });

    it('should detect expect(1).toBe(1)', () => {
      const content = 'expect(1).toBe(1)';
      const violations = rule.detect(content, 'test.ts');
      expect(violations.length).toBe(1);
    });
  });

  describe('isolation/global-state rule', () => {
    const rule = isolationRules.find(r => r.id === 'isolation/global-state')!;

    it('should detect process.env modification', () => {
      const content = `process.env.NODE_ENV = 'test';`;
      const violations = rule.detect(content, 'test.ts');
      expect(violations.length).toBe(1);
    });

    it('should detect global object modification', () => {
      const content = `global.fetch = mockFetch;`;
      const violations = rule.detect(content, 'test.ts');
      expect(violations.length).toBe(1);
    });
  });
});
