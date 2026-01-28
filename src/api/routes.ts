import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { scanCodebase, generateTestSuggestions } from '../core/scanner.js';
import { generateTests, generateTestsForFiles, TestFramework } from '../core/generator.js';
import { runTests } from '../core/runner.js';
import { reviewTestFiles, reviewTestFile, type ReviewOptions, type RuleCategory, type Severity } from '../core/quality-reviewer.js';
import {
  isStripeConfigured,
  createCheckoutSession,
  getCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
  handleWebhookEvent,
  validateLicenseKey,
  getLicenseInfo,
  hasFeature,
} from '../billing/index.js';

const api = new Hono();

// Enable CORS for CI tools
api.use('/*', cors());

// Health check
api.get('/health', (c) => {
  return c.json({ status: 'ok', version: '1.0.0' });
});

// Scan endpoint
api.post('/scan', async (c) => {
  try {
    const body = await c.req.json();
    const path = body.path || process.cwd();
    
    const result = await scanCodebase(path);
    const suggestions = generateTestSuggestions(result);
    
    return c.json({
      success: true,
      stats: result.stats,
      suggestions: suggestions.map(s => ({
        file: s.file.relativePath,
        priority: s.priority,
        suggestions: s.suggestions,
        functions: s.file.functions,
        classes: s.file.classes,
      })),
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Scan failed',
    }, 500);
  }
});

// Generate tests endpoint
api.post('/generate', async (c) => {
  try {
    const body = await c.req.json();
    const { 
      path = process.cwd(), 
      framework = 'vitest',
      limit = 5,
      apiKey,
      model,
    } = body;
    
    if (!['jest', 'vitest', 'pytest'].includes(framework)) {
      return c.json({
        success: false,
        error: 'Invalid framework. Use jest, vitest, or pytest.',
      }, 400);
    }
    
    const scanResult = await scanCodebase(path);
    const suggestions = generateTestSuggestions(scanResult);
    const filesToGenerate = suggestions.slice(0, limit).map(s => s.file);
    
    if (filesToGenerate.length === 0) {
      return c.json({
        success: true,
        tests: [],
        message: 'No files need tests',
      });
    }
    
    const tests = await generateTestsForFiles(filesToGenerate, {
      framework: framework as TestFramework,
      apiKey,
      model,
    });
    
    return c.json({
      success: true,
      tests: tests.map(t => ({
        filename: t.filename,
        sourceFile: t.sourceFile,
        framework: t.framework,
        content: t.content,
      })),
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Generation failed',
    }, 500);
  }
});

// Run tests endpoint
api.post('/run', async (c) => {
  try {
    const body = await c.req.json();
    const { 
      path = process.cwd(),
      coverage = false,
      filter,
      timeout,
    } = body;
    
    const result = await runTests({
      cwd: path,
      coverage,
      filter,
      timeout,
    });
    
    return c.json({
      success: result.success,
      result: {
        framework: result.framework,
        passed: result.passed,
        failed: result.failed,
        skipped: result.skipped,
        total: result.total,
        duration: result.duration,
        coverage: result.coverage,
      },
      // Don't include full output in API response by default
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test run failed',
    }, 500);
  }
});

// Review tests for quality issues
api.post('/review', async (c) => {
  try {
    const body = await c.req.json();
    const {
      path = process.cwd(),
      minSeverity = 'info',
      includedCategories,
      excludedCategories,
      ignorePatterns,
    } = body;
    
    // Validate severity
    if (!['error', 'warning', 'info'].includes(minSeverity)) {
      return c.json({
        success: false,
        error: 'Invalid minSeverity. Use error, warning, or info.',
      }, 400);
    }
    
    const options: ReviewOptions = {
      minSeverity: minSeverity as Severity,
    };
    
    if (includedCategories && Array.isArray(includedCategories)) {
      options.includedCategories = includedCategories as RuleCategory[];
    }
    
    if (excludedCategories && Array.isArray(excludedCategories)) {
      options.excludedCategories = excludedCategories as RuleCategory[];
    }
    
    if (ignorePatterns && Array.isArray(ignorePatterns)) {
      options.ignorePatterns = ignorePatterns;
    }
    
    const report = await reviewTestFiles(path, options);
    
    return c.json({
      success: true,
      report: {
        timestamp: report.timestamp,
        summary: report.summary,
        recommendations: report.recommendations,
        files: report.files.map(f => ({
          path: f.relativePath,
          score: f.score,
          testCount: f.testCount,
          assertionCount: f.assertionCount,
          summary: f.summary,
          violations: f.violations.map(v => ({
            ruleId: v.ruleId,
            message: v.message,
            line: v.line,
            snippet: v.snippet,
            suggestion: v.suggestion,
          })),
          scoreBreakdown: f.scoreBreakdown.map(s => ({
            category: s.category,
            score: s.score,
            violations: s.violations,
          })),
        })),
      },
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Review failed',
    }, 500);
  }
});

// Review a single test file inline (useful for CI pre-commit hooks)
api.post('/review-inline', async (c) => {
  try {
    const body = await c.req.json();
    const {
      filename,
      content,
      minSeverity = 'info',
    } = body;
    
    if (!filename || !content) {
      return c.json({
        success: false,
        error: 'filename and content are required',
      }, 400);
    }
    
    const options: ReviewOptions = {
      minSeverity: minSeverity as Severity,
    };
    
    const review = reviewTestFile(content, filename, options);
    
    return c.json({
      success: true,
      review: {
        path: review.relativePath,
        score: review.score,
        testCount: review.testCount,
        assertionCount: review.assertionCount,
        summary: review.summary,
        violations: review.violations,
        scoreBreakdown: review.scoreBreakdown.map(s => ({
          category: s.category,
          score: s.score,
          violations: s.violations,
        })),
      },
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Review failed',
    }, 500);
  }
});

// Generate tests for specific file content (useful for CI)
api.post('/generate-inline', async (c) => {
  try {
    const body = await c.req.json();
    const { 
      filename,
      content,
      framework = 'vitest',
      apiKey,
      model,
    } = body;
    
    if (!filename || !content) {
      return c.json({
        success: false,
        error: 'filename and content are required',
      }, 400);
    }
    
    const ext = filename.split('.').pop() || '';
    const language = ['ts', 'tsx'].includes(ext) ? 'typescript'
      : ['js', 'jsx', 'mjs'].includes(ext) ? 'javascript'
      : ext === 'py' ? 'python' : 'unknown';
    
    const scannedFile = {
      path: filename,
      relativePath: filename,
      language: language as any,
      content,
      exports: [],
      functions: [],
      classes: [],
      hasTests: false,
    };
    
    const test = await generateTests(scannedFile, {
      framework: framework as TestFramework,
      apiKey,
      model,
    });
    
    return c.json({
      success: true,
      test: {
        filename: test.filename,
        content: test.content,
        framework: test.framework,
      },
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Generation failed',
    }, 500);
  }
});

// ============================================
// Billing Routes
// ============================================

/**
 * POST /billing/checkout
 * Create a Stripe checkout session for team license subscription
 */
api.post('/billing/checkout', async (c) => {
  if (!isStripeConfigured()) {
    return c.json({
      success: false,
      error: 'Stripe is not configured. Set STRIPE_SECRET_KEY, STRIPE_PRICE_ID, and STRIPE_WEBHOOK_SECRET.',
    }, 503);
  }

  try {
    const body = await c.req.json();
    const { email, teamName, seats, successUrl, cancelUrl, metadata } = body;

    const session = await createCheckoutSession({
      customerEmail: email,
      teamName,
      seats,
      successUrl,
      cancelUrl,
      metadata,
    });

    return c.json({
      success: true,
      sessionId: session.sessionId,
      url: session.url,
    });
  } catch (error) {
    console.error('[Billing] Checkout error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    }, 500);
  }
});

/**
 * GET /billing/checkout/:sessionId
 * Get checkout session details (for verifying payment success)
 */
api.get('/billing/checkout/:sessionId', async (c) => {
  if (!isStripeConfigured()) {
    return c.json({ success: false, error: 'Stripe not configured' }, 503);
  }

  try {
    const sessionId = c.req.param('sessionId');
    const session = await getCheckoutSession(sessionId);

    return c.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_email || session.customer_details?.email,
        amountTotal: session.amount_total,
        currency: session.currency,
      },
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve session',
    }, 500);
  }
});

/**
 * POST /billing/portal
 * Create a customer portal session for subscription management
 */
api.post('/billing/portal', async (c) => {
  if (!isStripeConfigured()) {
    return c.json({ success: false, error: 'Stripe not configured' }, 503);
  }

  try {
    const body = await c.req.json();
    const { customerId, returnUrl } = body;

    if (!customerId) {
      return c.json({ success: false, error: 'customerId is required' }, 400);
    }

    const url = await createPortalSession(customerId, returnUrl);

    return c.json({
      success: true,
      url,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create portal session',
    }, 500);
  }
});

/**
 * POST /billing/webhook
 * Handle Stripe webhook events
 * Note: This endpoint needs raw body access - configure accordingly
 */
api.post('/billing/webhook', async (c) => {
  if (!isStripeConfigured()) {
    return c.json({ success: false, error: 'Stripe not configured' }, 503);
  }

  try {
    // Get raw body for signature verification
    const rawBody = await c.req.text();
    const signature = c.req.header('stripe-signature');

    if (!signature) {
      return c.json({ success: false, error: 'Missing stripe-signature header' }, 400);
    }

    // Verify and construct event
    const event = constructWebhookEvent(rawBody, signature);

    // Process the event
    const result = await handleWebhookEvent(event);

    return c.json({
      success: result.success,
      event: result.event,
      message: result.message,
    });
  } catch (error) {
    console.error('[Billing] Webhook error:', error);
    
    // Return 400 for signature errors (Stripe will retry)
    if (error instanceof Error && error.message.includes('signature')) {
      return c.json({ success: false, error: 'Invalid signature' }, 400);
    }
    
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Webhook processing failed',
    }, 500);
  }
});

/**
 * GET /billing/license/:key
 * Validate a license key
 */
api.get('/billing/license/:key', async (c) => {
  try {
    const key = c.req.param('key');
    const result = validateLicenseKey(key);

    if (!result.valid) {
      return c.json({
        valid: false,
        expired: result.expired,
        revoked: result.revoked,
        error: result.error,
      }, result.revoked || result.expired ? 403 : 400);
    }

    return c.json({
      valid: true,
      license: {
        teamName: result.data?.teamName,
        plan: result.data?.plan,
        seats: result.data?.seats,
        expiresAt: result.data?.expiresAt,
      },
    });
  } catch (error) {
    return c.json({
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    }, 500);
  }
});

/**
 * GET /billing/license/:key/info
 * Get detailed license information (for admin/dashboard)
 */
api.get('/billing/license/:key/info', async (c) => {
  try {
    const key = c.req.param('key');
    const info = getLicenseInfo(key);

    if (!info) {
      return c.json({ success: false, error: 'License not found' }, 404);
    }

    return c.json({
      success: true,
      license: info,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get license info',
    }, 500);
  }
});

/**
 * POST /billing/license/:key/check-feature
 * Check if a license has access to a specific feature
 */
api.post('/billing/license/:key/check-feature', async (c) => {
  try {
    const key = c.req.param('key');
    const body = await c.req.json();
    const { feature } = body;

    if (!feature) {
      return c.json({ success: false, error: 'feature is required' }, 400);
    }

    const allowed = hasFeature(key, feature);

    return c.json({
      success: true,
      feature,
      allowed,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Feature check failed',
    }, 500);
  }
});

/**
 * GET /billing/status
 * Check if billing is configured
 */
api.get('/billing/status', (c) => {
  return c.json({
    configured: isStripeConfigured(),
    features: {
      checkout: isStripeConfigured(),
      webhooks: isStripeConfigured(),
      licensing: true, // Licensing works even without Stripe (for manual keys)
    },
  });
});

export { api };
