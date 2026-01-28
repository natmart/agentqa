/**
 * Stripe Checkout Session management
 * Creates checkout sessions for $299/mo team license subscriptions
 */
import type Stripe from 'stripe';
import { getStripe, stripeConfig } from './stripe.js';

export interface CreateCheckoutOptions {
  /** Customer email (optional, pre-fills checkout form) */
  customerEmail?: string;
  /** Existing Stripe customer ID */
  customerId?: string;
  /** Team/organization name for metadata */
  teamName?: string;
  /** Number of seats (for usage-based billing, if applicable) */
  seats?: number;
  /** Custom success URL override */
  successUrl?: string;
  /** Custom cancel URL override */
  cancelUrl?: string;
  /** Additional metadata to attach to subscription */
  metadata?: Record<string, string>;
}

export interface CheckoutSessionResult {
  /** Checkout session ID */
  sessionId: string;
  /** URL to redirect customer to */
  url: string;
}

/**
 * Create a Stripe Checkout session for team license subscription
 * 
 * @param options - Checkout configuration options
 * @returns Checkout session with redirect URL
 * 
 * @example
 * ```ts
 * const { url } = await createCheckoutSession({
 *   customerEmail: 'team@company.com',
 *   teamName: 'Acme Corp',
 * });
 * // Redirect user to url
 * ```
 */
export async function createCheckoutSession(
  options: CreateCheckoutOptions = {}
): Promise<CheckoutSessionResult> {
  const stripe = getStripe();
  
  if (!stripeConfig.priceId) {
    throw new Error('STRIPE_PRICE_ID is not configured');
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: stripeConfig.priceId,
        quantity: 1,
      },
    ],
    success_url: `${options.successUrl || stripeConfig.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: options.cancelUrl || stripeConfig.cancelUrl,
    subscription_data: {
      metadata: {
        teamName: options.teamName || '',
        seats: String(options.seats || 1),
        ...options.metadata,
      },
    },
    // Allow promotion codes for discounts
    allow_promotion_codes: true,
    // Collect billing address for invoicing
    billing_address_collection: 'required',
    // Auto-generate invoice
    invoice_creation: {
      enabled: true,
    },
  };

  // Set customer info
  if (options.customerId) {
    sessionParams.customer = options.customerId;
  } else if (options.customerEmail) {
    sessionParams.customer_email = options.customerEmail;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    throw new Error('Failed to create checkout session URL');
  }

  return {
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * Retrieve a checkout session by ID
 * Useful for verifying payment after redirect
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription', 'customer'],
  });
}

/**
 * Create a customer portal session for subscription management
 * Allows customers to update payment methods, view invoices, cancel, etc.
 */
export async function createPortalSession(customerId: string, returnUrl?: string): Promise<string> {
  const stripe = getStripe();
  
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || stripeConfig.successUrl,
  });

  return session.url;
}
