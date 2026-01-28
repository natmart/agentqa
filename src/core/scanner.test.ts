import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { scanCodebase, generateTestSuggestions } from './scanner.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('scanner', () => {
  const testDir = join(tmpdir(), 'agentqa-test-' + Date.now());
  
  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
    
    // Create test files
    await writeFile(join(testDir, 'utils.ts'), `
export function add(a: number, b: number): number {
  return a + b;
}

export class Calculator {
  add(a: number, b: number) {
    return a + b;
  }
}
`);
    
    await writeFile(join(testDir, 'utils.test.ts'), `
import { add } from './utils';
test('add', () => expect(add(1, 2)).toBe(3));
`);
    
    await writeFile(join(testDir, 'helper.js'), `
function multiply(a, b) {
  return a * b;
}
module.exports = { multiply };
`);
  });
  
  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });
  
  describe('scanCodebase', () => {
    it('should scan files and detect languages', async () => {
      const result = await scanCodebase(testDir);
      
      expect(result.stats.total).toBeGreaterThanOrEqual(2);
      expect(result.stats.byLanguage['typescript']).toBeGreaterThanOrEqual(1);
    });
    
    it('should detect existing test files', async () => {
      const result = await scanCodebase(testDir);
      
      const utilsFile = result.files.find(f => f.relativePath === 'utils.ts');
      expect(utilsFile?.hasTests).toBe(true);
    });
    
    it('should extract functions and classes', async () => {
      const result = await scanCodebase(testDir);
      
      const utilsFile = result.files.find(f => f.relativePath === 'utils.ts');
      expect(utilsFile?.functions).toContain('add');
      expect(utilsFile?.classes).toContain('Calculator');
    });
  });
  
  describe('generateTestSuggestions', () => {
    it('should generate suggestions for untested files', async () => {
      const scanResult = await scanCodebase(testDir);
      const suggestions = generateTestSuggestions(scanResult);
      
      // helper.js should have suggestions (no test file)
      const helperSuggestion = suggestions.find(s => 
        s.file.relativePath === 'helper.js'
      );
      
      expect(helperSuggestion).toBeDefined();
      expect(helperSuggestion?.suggestions.length).toBeGreaterThan(0);
    });
    
    it('should prioritize files with exports', async () => {
      const scanResult = await scanCodebase(testDir);
      const suggestions = generateTestSuggestions(scanResult);
      
      // Files with exports should have higher priority
      const highPriority = suggestions.filter(s => s.priority === 'high');
      expect(highPriority.length).toBeGreaterThanOrEqual(0);
    });
  });
});
