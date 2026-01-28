import OpenAI from 'openai';
import type { ScannedFile } from './scanner.js';

export type TestFramework = 'jest' | 'vitest' | 'pytest';

export interface GeneratedTest {
  framework: TestFramework;
  filename: string;
  content: string;
  sourceFile: string;
}

export interface GeneratorOptions {
  framework: TestFramework;
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

const FRAMEWORK_PROMPTS: Record<TestFramework, string> = {
  jest: `Generate Jest tests using describe/it blocks. Use expect() assertions.
Import the module using: import { ... } from './filename';
Include beforeEach/afterEach if needed for setup/teardown.`,
  
  vitest: `Generate Vitest tests using describe/it blocks. Use expect() assertions.
Import from 'vitest': import { describe, it, expect, beforeEach } from 'vitest';
Import the module using: import { ... } from './filename';`,
  
  pytest: `Generate pytest tests using def test_* functions.
Use assert statements for assertions.
Import the module using: from filename import ...
Use pytest fixtures if needed for setup.`,
};

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

export async function generateTests(
  file: ScannedFile,
  options: GeneratorOptions
): Promise<GeneratedTest> {
  const { framework, apiKey, baseURL, model = 'gpt-4o-mini' } = options;
  
  // Check for API key in options or environment
  const key = apiKey || process.env.OPENAI_API_KEY;
  
  if (!key) {
    // Return a template if no API key
    return generateTemplate(file, framework);
  }
  
  const openai = new OpenAI({
    apiKey: key,
    baseURL: baseURL || process.env.OPENAI_BASE_URL,
  });
  
  const systemPrompt = `You are an expert test writer. Generate comprehensive, well-structured tests.
${FRAMEWORK_PROMPTS[framework]}

Guidelines:
- Test both happy paths and edge cases
- Use descriptive test names
- Mock external dependencies when appropriate
- Keep tests focused and independent
- Include comments for complex test logic

Output ONLY the test code, no explanations or markdown.`;

  const userPrompt = `Generate tests for this ${file.language} file:

Filename: ${file.relativePath}
Exports: ${file.exports.join(', ') || 'none'}
Functions: ${file.functions.join(', ') || 'none'}
Classes: ${file.classes.join(', ') || 'none'}

Source code:
\`\`\`${file.language}
${file.content}
\`\`\``;

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });
    
    let content = response.choices[0]?.message?.content || '';
    
    // Clean up markdown code blocks if present
    content = content.replace(/^```[\w]*\n?/gm, '').replace(/```$/gm, '').trim();
    
    return {
      framework,
      filename: getTestFilename(file.relativePath, framework),
      content,
      sourceFile: file.relativePath,
    };
  } catch (error) {
    console.error('AI generation failed, using template:', error);
    return generateTemplate(file, framework);
  }
}

function generateTemplate(file: ScannedFile, framework: TestFramework): GeneratedTest {
  const filename = getTestFilename(file.relativePath, framework);
  let content: string;
  
  const importPath = './' + file.relativePath.replace(/\.(ts|tsx|js|jsx|py)$/, '');
  
  if (framework === 'pytest') {
    const imports = file.exports.length > 0 
      ? `from ${importPath.replace(/\//g, '.').replace(/^\.+/, '')} import ${file.exports.join(', ')}`
      : `# import from ${importPath}`;
    
    const tests = file.functions.map(fn => `
def test_${fn}():
    """Test ${fn} function."""
    # TODO: Implement test
    # result = ${fn}(...)
    # assert result == expected
    pass
`).join('\n');

    const classTests = file.classes.map(cls => `
class Test${cls}:
    """Tests for ${cls} class."""
    
    def test_init(self):
        """Test ${cls} initialization."""
        # TODO: Implement test
        pass
`).join('\n');

    content = `"""Tests for ${file.relativePath}"""
import pytest
${imports}

${tests}
${classTests}
`.trim();
  } else {
    // Jest/Vitest
    const vitestImport = framework === 'vitest' 
      ? "import { describe, it, expect, beforeEach } from 'vitest';\n" 
      : '';
    
    const imports = file.exports.length > 0
      ? `import { ${file.exports.join(', ')} } from '${importPath}';`
      : `// import from '${importPath}';`;
    
    const tests = file.functions.map(fn => `
  it('should handle ${fn}', () => {
    // TODO: Implement test
    // const result = ${fn}(...);
    // expect(result).toBe(expected);
  });
`).join('\n');

    const classTests = file.classes.map(cls => `
describe('${cls}', () => {
  it('should initialize correctly', () => {
    // TODO: Implement test
    // const instance = new ${cls}();
    // expect(instance).toBeDefined();
  });
});
`).join('\n');

    content = `${vitestImport}${imports}

describe('${file.relativePath}', () => {
${tests}
});

${classTests}
`.trim();
  }
  
  return {
    framework,
    filename,
    content,
    sourceFile: file.relativePath,
  };
}

export async function generateTestsForFiles(
  files: ScannedFile[],
  options: GeneratorOptions,
  onProgress?: (current: number, total: number, file: string) => void
): Promise<GeneratedTest[]> {
  const results: GeneratedTest[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, files.length, file.relativePath);
    
    const test = await generateTests(file, options);
    results.push(test);
    
    // Small delay to avoid rate limiting
    if (i < files.length - 1) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  
  return results;
}
