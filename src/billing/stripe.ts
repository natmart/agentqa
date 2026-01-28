/**
 * Stripe client initialization
 * Configure your Stripe API keys in environment variables
 */
import Stripe from 'stripe';

// Validate required environment variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('STRIPE_SECRET_KEY is required in production');
}

/**
 * Stripe client instance
 * Uses test mode if STRIPE_SECRET_KEY starts with 'sk_test_'
 */
export const stripe = new Stripe(STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-10-28.acacia',
  typescript: true,
});

/**
 * Stripe configuration
 */
export const stripeConfig = {
  // Price ID for the $299/mo team license
  priceId: process.env.STRIPE_PRICE_ID || '',
  
  // Webhook signing secret
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  
  // Success/cancel URLs for checkout
  successUrl: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3847/billing/success',
  cancelUrl: process.env.STRIPE_CANCEL_URL || 'http://localhost:3847/billing/cancel',
};

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_PRICE_ID &&
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

/**
 * Get Stripe instance (throws if not configured)
 */
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.');
  }
  return stripe;
}
