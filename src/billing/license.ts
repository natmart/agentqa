/**
 * License Key Generation and Validation
 * Generates and validates license keys for AgentQA team subscriptions
 */
import { createHmac, randomBytes } from 'crypto';

// Secret key for license signing - should be in env vars in production
const LICENSE_SECRET = process.env.LICENSE_SECRET || 'agentqa-license-secret-change-in-production';

// In-memory revoked licenses (use Redis/database in production)
const revokedLicenses = new Set<string>();

export interface LicenseData {
  /** Stripe customer ID */
  customerId: string;
  /** Stripe subscription ID */
  subscriptionId: string;
  /** Customer email */
  email: string;
  /** Team/organization name */
  teamName: string;
  /** Subscription plan (team, enterprise, etc.) */
  plan: string;
  /** Number of seats */
  seats: number;
  /** License creation timestamp */
  createdAt: string;
  /** License expiration timestamp */
  expiresAt: string;
}

export interface LicenseValidationResult {
  valid: boolean;
  expired: boolean;
  revoked: boolean;
  data?: LicenseData;
  error?: string;
}

/**
 * Generate a license key from subscription data
 * 
 * Format: AQAT-XXXX-XXXX-XXXX-XXXX (AQAT = AgentQA Team)
 * The key encodes the subscription data and includes a signature for validation
 * 
 * @param data - License data from subscription
 * @returns License key string
 */
export function generateLicenseKey(data: LicenseData): string {
  // Create payload
  const payload = JSON.stringify({
    c: data.customerId,
    s: data.subscriptionId,
    e: data.email,
    t: data.teamName,
    p: data.plan,
    n: data.seats,
    ca: data.createdAt,
    ex: data.expiresAt,
  });
  
  // Encode payload as base64
  const encodedPayload = Buffer.from(payload).toString('base64url');
  
  // Create signature
  const signature = createHmac('sha256', LICENSE_SECRET)
    .update(encodedPayload)
    .digest('base64url')
    .slice(0, 8); // Use first 8 chars of signature
  
  // Combine and format as license key
  const combined = `${encodedPayload}.${signature}`;
  const hash = createHmac('sha256', LICENSE_SECRET)
    .update(combined)
    .digest('hex')
    .toUpperCase();
  
  // Format: AQAT-XXXX-XXXX-XXXX-XXXX
  const keyParts = [
    'AQAT',
    hash.slice(0, 4),
    hash.slice(4, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
  ];
  
  // Store the mapping (in production, use database)
  licenseKeyMap.set(keyParts.join('-'), combined);
  
  return keyParts.join('-');
}

// In-memory license key to payload mapping (use database in production)
const licenseKeyMap = new Map<string, string>();

/**
 * Validate a license key
 * 
 * @param licenseKey - License key to validate (format: AQAT-XXXX-XXXX-XXXX-XXXX)
 * @returns Validation result with decoded data if valid
 */
export function validateLicenseKey(licenseKey: string): LicenseValidationResult {
  // Normalize key format
  const normalizedKey = licenseKey.toUpperCase().trim();
  
  // Check format
  if (!isValidKeyFormat(normalizedKey)) {
    return {
      valid: false,
      expired: false,
      revoked: false,
      error: 'Invalid license key format',
    };
  }
  
  // Check if revoked
  if (revokedLicenses.has(normalizedKey)) {
    return {
      valid: false,
      expired: false,
      revoked: true,
      error: 'License has been revoked',
    };
  }
  
  // Get stored payload
  const combined = licenseKeyMap.get(normalizedKey);
  if (!combined) {
    // In production, look up in database
    return {
      valid: false,
      expired: false,
      revoked: false,
      error: 'License key not found',
    };
  }
  
  // Verify signature
  const [encodedPayload, signature] = combined.split('.');
  const expectedSignature = createHmac('sha256', LICENSE_SECRET)
    .update(encodedPayload)
    .digest('base64url')
    .slice(0, 8);
  
  if (signature !== expectedSignature) {
    return {
      valid: false,
      expired: false,
      revoked: false,
      error: 'License signature invalid',
    };
  }
  
  // Decode payload
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
    const data: LicenseData = {
      customerId: payload.c,
      subscriptionId: payload.s,
      email: payload.e,
      teamName: payload.t,
      plan: payload.p,
      seats: payload.n,
      createdAt: payload.ca,
      expiresAt: payload.ex,
    };
    
    // Check expiration
    const now = new Date();
    const expiresAt = new Date(data.expiresAt);
    const expired = now > expiresAt;
    
    if (expired) {
      return {
        valid: false,
        expired: true,
        revoked: false,
        data,
        error: 'License has expired',
      };
    }
    
    return {
      valid: true,
      expired: false,
      revoked: false,
      data,
    };
  } catch {
    return {
      valid: false,
      expired: false,
      revoked: false,
      error: 'Failed to decode license data',
    };
  }
}

/**
 * Check if a license key has valid format
 */
export function isValidKeyFormat(key: string): boolean {
  // Format: AQAT-XXXX-XXXX-XXXX-XXXX (uppercase hex)
  const pattern = /^AQAT-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/;
  return pattern.test(key);
}

/**
 * Revoke a license key
 * 
 * @param licenseKey - License key to revoke
 */
export function revokeLicense(licenseKey: string): void {
  const normalizedKey = licenseKey.toUpperCase().trim();
  revokedLicenses.add(normalizedKey);
  // In production, mark as revoked in database
  console.log(`[License] Revoked: ${normalizedKey}`);
}

/**
 * Get license info without full validation
 * Useful for displaying license details
 */
export function getLicenseInfo(licenseKey: string): LicenseData | null {
  const result = validateLicenseKey(licenseKey);
  return result.data || null;
}

/**
 * Check if license allows a specific feature
 * Extend this for feature-gated licenses
 */
export function hasFeature(licenseKey: string, feature: string): boolean {
  const result = validateLicenseKey(licenseKey);
  if (!result.valid || !result.data) {
    return false;
  }
  
  // Feature gating based on plan
  const planFeatures: Record<string, string[]> = {
    team: ['scan', 'generate', 'heal', 'ci-integration', 'api-access'],
    enterprise: ['scan', 'generate', 'heal', 'ci-integration', 'api-access', 'custom-models', 'priority-support', 'sso'],
  };
  
  const features = planFeatures[result.data.plan] || [];
  return features.includes(feature);
}
