import { describe, it, expect } from 'vitest';
import { generateTests, TestFramework } from './generator.js';
import type { ScannedFile } from './scanner.js';

describe('generator', () => {
  const mockFile: ScannedFile = {
    path: '/test/utils.ts',
    relativePath: 'utils.ts',
    language: 'typescript',
    content: `
export function add(a: number, b: number): number {
  return a + b;
}

export class Calculator {
  multiply(a: number, b: number) {
    return a * b;
  }
}
`,
    exports: ['add', 'Calculator'],
    functions: ['add'],
    classes: ['Calculator'],
    hasTests: false,
  };
  
  describe('generateTests', () => {
    it('should generate vitest tests template', async () => {
      const result = await generateTests(mockFile, { framework: 'vitest' });
      
      expect(result.framework).toBe('vitest');
      expect(result.filename).toBe('utils.test.ts');
      expect(result.content).toContain('vitest');
      expect(result.content).toContain('describe');
    });
    
    it('should generate jest tests template', async () => {
      const result = await generateTests(mockFile, { framework: 'jest' });
      
      expect(result.framework).toBe('jest');
      expect(result.filename).toBe('utils.test.ts');
      expect(result.content).toContain('describe');
      expect(result.content).not.toContain("from 'vitest'");
    });
    
    it('should generate pytest tests template', async () => {
      const pythonFile: ScannedFile = {
        ...mockFile,
        path: '/test/utils.py',
        relativePath: 'utils.py',
        language: 'python',
      };
      
      const result = await generateTests(pythonFile, { framework: 'pytest' });
      
      expect(result.framework).toBe('pytest');
      expect(result.filename).toBe('test_utils.py');
      expect(result.content).toContain('def test_');
      expect(result.content).toContain('pytest');
    });
    
    it('should include function and class tests', async () => {
      const result = await generateTests(mockFile, { framework: 'vitest' });
      
      expect(result.content).toContain('add');
      expect(result.content).toContain('Calculator');
    });
  });
});
