/**
 * Self-Healing Test Generator
 * 
 * This is the critical differentiator for AgentQA.
 * It generates tests, runs them, and automatically fixes errors.
 */

import OpenAI from 'openai';
import type { ScannedFile } from './scanner.js';
import type { GeneratedTest, TestFramework } from './generator.js';
import { runTests, type TestResult } from './runner.js';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { mkdirSync } from 'fs';

function generateTemplateTest(file: ScannedFile, framework: TestFramework): GeneratedTest {
  const filename = getTestFilename(file.path, framework);
  const importPath = './' + file.relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');
  
  const exports = file.exports.length > 0 ? file.exports.join(', ') : file.functions.join(', ');
  
  const tests = file.functions.map(fn => `
  it('should handle ${fn}', () => {
    // Template test - needs implementation
    expect(true).toBe(true);
  });
`).join('\n');

  const content = `import { describe, it, expect } from 'vitest';
import { ${exports} } from '${importPath}';

describe('${file.relativePath}', () => {
${tests}
});`;

  return {
    framework,
    filename,
    content,
    sourceFile: file.path,
  };
}

export interface HealingOptions {
  framework: TestFramework;
  apiKey?: string;
  baseURL?: string;
  model?: string;
  maxRetries?: number;
  cwd: string;
}

export interface HealingResult {
  success: boolean;
  test: GeneratedTest;
  attempts: number;
  errors: string[];
  finalResult?: TestResult;
}

const HEAL_PROMPT = `You are fixing a test that failed to run. Analyze the error and fix the test code.

ORIGINAL SOURCE FILE:
\`\`\`
{sourceCode}
\`\`\`

GENERATED TEST THAT FAILED:
\`\`\`
{testCode}
\`\`\`

ERROR OUTPUT:
\`\`\`
{errorOutput}
\`\`\`

Fix the test so it runs successfully. Common issues:
- Wrong import paths (use relative paths from test file location)
- Missing mocks for external dependencies
- Incorrect function signatures
- Async/await issues
- Missing test setup/teardown

Return ONLY the fixed test code, no explanations.`;

export async function generateAndHealTest(
  file: ScannedFile,
  options: HealingOptions
): Promise<HealingResult> {
  const {
    framework,
    apiKey,
    baseURL,
    model = 'gpt-4o',
    maxRetries = 3,
    cwd,
  } = options;

  const key = apiKey || process.env.OPENAI_API_KEY;
  
  // If no API key, generate template-based tests and try to run them
  if (!key) {
    console.log('  ⚠️  No API key - using template generation');
    const templateTest = generateTemplateTest(file, framework);
    return {
      success: false,
      test: templateTest,
      attempts: 0,
      errors: ['No API key available - template tests require manual implementation'],
    };
  }

  const openai = new OpenAI({
    apiKey: key,
    baseURL: baseURL,
  });

  const errors: string[] = [];
  let currentTest: GeneratedTest | null = null;
  let attempts = 0;

  // Generate initial test
  const initialPrompt = getInitialPrompt(file, framework);
  
  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are an expert test engineer. Generate comprehensive, runnable tests.' },
        { role: 'user', content: initialPrompt },
      ],
      temperature: 0.2,
    });

    const testCode = response.choices[0]?.message?.content?.trim() || '';
    const cleanCode = extractCode(testCode);
    
    currentTest = {
      framework,
      filename: getTestFilename(file.path, framework),
      content: cleanCode,
      sourceFile: file.path,
    };
  } catch (error) {
    return {
      success: false,
      test: { framework, filename: '', content: '', sourceFile: file.path },
      attempts: 0,
      errors: [`Failed to generate initial test: ${error}`],
    };
  }

  // Self-healing loop
  while (attempts < maxRetries) {
    attempts++;
    
    // Write test file temporarily
    const testPath = join(cwd, currentTest.filename);
    const testDir = dirname(testPath);
    
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    
    writeFileSync(testPath, currentTest.content);
    
    try {
      // Run the test
      const result = await runTests({
        cwd,
        filter: currentTest.filename,
        timeout: 30000,
      });
      
      if (result.success && result.failed === 0) {
        // Test passes! We're done.
        return {
          success: true,
          test: currentTest,
          attempts,
          errors,
          finalResult: result,
        };
      }
      
      // Test failed - capture error and try to heal
      const errorOutput = result.output || 'Test failed without specific error output';
      errors.push(`Attempt ${attempts}: ${errorOutput.slice(0, 500)}`);
      
      // Don't heal on last attempt
      if (attempts >= maxRetries) break;
      
      // Attempt to heal the test
      const healedCode = await healTest(openai, model, file, currentTest, errorOutput);
      
      if (healedCode) {
        currentTest = {
          ...currentTest,
          content: healedCode,
        };
      }
    } catch (runError) {
      const errorMsg = runError instanceof Error ? runError.message : String(runError);
      errors.push(`Attempt ${attempts} runtime error: ${errorMsg}`);
      
      if (attempts >= maxRetries) break;
      
      // Try to heal based on runtime error
      const healedCode = await healTest(openai, model, file, currentTest, errorMsg);
      
      if (healedCode) {
        currentTest = {
          ...currentTest,
          content: healedCode,
        };
      }
    } finally {
      // Clean up test file after each attempt (will rewrite on next iteration)
      if (existsSync(testPath) && attempts < maxRetries) {
        // Keep for next iteration
      }
    }
  }

  // All attempts exhausted
  return {
    success: false,
    test: currentTest,
    attempts,
    errors,
  };
}

async function healTest(
  openai: OpenAI,
  model: string,
  file: ScannedFile,
  currentTest: GeneratedTest,
  errorOutput: string
): Promise<string | null> {
  try {
    const prompt = HEAL_PROMPT
      .replace('{sourceCode}', file.content)
      .replace('{testCode}', currentTest.content)
      .replace('{errorOutput}', errorOutput);

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are an expert at debugging and fixing test code. Return only the fixed code.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
    });

    const fixedCode = response.choices[0]?.message?.content?.trim() || '';
    return extractCode(fixedCode);
  } catch {
    return null;
  }
}

function getInitialPrompt(file: ScannedFile, framework: TestFramework): string {
  const frameworkInstructions: Record<TestFramework, string> = {
    jest: `Generate Jest tests. Use describe/it blocks and expect() assertions.
Import using relative path from test location.`,
    vitest: `Generate Vitest tests. Import { describe, it, expect } from 'vitest'.
Import module using relative path.`,
    pytest: `Generate pytest tests. Use def test_* functions with assert statements.
Import using: from module import function`,
  };

  return `Generate comprehensive tests for this code:

FILE: ${file.path}
\`\`\`
${file.content}
\`\`\`

${frameworkInstructions[framework]}

FUNCTIONS TO TEST:
${file.functions.map(f => `- ${f}`).join('\n')}

Generate tests that:
1. Test normal cases
2. Test edge cases
3. Test error handling where applicable
4. Use proper mocking for external dependencies

Return ONLY the test code, no explanations.`;
}

function getTestFilename(sourceFile: string, framework: TestFramework): string {
  const parts = sourceFile.split('/');
  const filename = parts[parts.length - 1];
  
  if (framework === 'pytest') {
    const nameWithoutExt = filename.replace(/\.py$/, '');
    return `test_${nameWithoutExt}.py`;
  }
  
  const ext = filename.match(/\.(ts|tsx|js|jsx)$/)?.[0] || '.ts';
  const nameWithoutExt = filename.replace(/\.(ts|tsx|js|jsx)$/, '');
  return `${nameWithoutExt}.test${ext}`;
}

function extractCode(text: string): string {
  // Remove markdown code blocks if present
  const codeBlockMatch = text.match(/```(?:typescript|javascript|python|ts|js|py)?\n?([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  return text.trim();
}
