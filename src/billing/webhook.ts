/**
 * Stripe Webhook Handler
 * Processes subscription lifecycle events
 */
import type Stripe from 'stripe';
import { getStripe, stripeConfig } from './stripe.js';
import { generateLicenseKey, revokeLicense, type LicenseData } from './license.js';

export type WebhookEventType = 
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed';

export interface WebhookResult {
  success: boolean;
  event: WebhookEventType | string;
  message: string;
  data?: {
    customerId?: string;
    subscriptionId?: string;
    licenseKey?: string;
    status?: string;
  };
}

/**
 * Verify and construct webhook event from raw body
 * 
 * @param rawBody - Raw request body (Buffer or string)
 * @param signature - Stripe-Signature header value
 * @returns Verified Stripe event
 */
export function constructWebhookEvent(
  rawBody: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  
  if (!stripeConfig.webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    stripeConfig.webhookSecret
  );
}

/**
 * Handle incoming Stripe webhook events
 * 
 * @param event - Verified Stripe event
 * @returns Processing result
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<WebhookResult> {
  switch (event.type) {
    case 'checkout.session.completed':
      return handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    
    case 'customer.subscription.created':
      return handleSubscriptionCreated(event.data.object as Stripe.Subscription);
    
    case 'customer.subscription.updated':
      return handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
    
    case 'customer.subscription.deleted':
      return handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
    
    case 'invoice.paid':
      return handleInvoicePaid(event.data.object as Stripe.Invoice);
    
    case 'invoice.payment_failed':
      return handlePaymentFailed(event.data.object as Stripe.Invoice);
    
    default:
      return {
        success: true,
        event: event.type,
        message: `Unhandled event type: ${event.type}`,
      };
  }
}

/**
 * Handle successful checkout completion
 * This is where we generate the license key
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<WebhookResult> {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const customerEmail = session.customer_email || session.customer_details?.email;
  
  // Get subscription metadata for team info
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const teamName = subscription.metadata?.teamName || 'Default Team';
  
  // Generate license key for this subscription
  const licenseData: LicenseData = {
    customerId,
    subscriptionId,
    email: customerEmail || '',
    teamName,
    plan: 'team',
    seats: parseInt(subscription.metadata?.seats || '1', 10),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(subscription.current_period_end * 1000).toISOString(),
  };
  
  const licenseKey = generateLicenseKey(licenseData);
  
  // Store the license key in subscription metadata for reference
  await stripe.subscriptions.update(subscriptionId, {
    metadata: {
      ...subscription.metadata,
      licenseKey,
    },
  });
  
  // TODO: Send welcome email with license key to customerEmail
  // TODO: Store license in database
  
  console.log(`[Billing] New subscription created: ${subscriptionId}`);
  console.log(`[Billing] License key generated for ${customerEmail}: ${licenseKey}`);
  
  return {
    success: true,
    event: 'checkout.session.completed',
    message: 'Checkout completed, license key generated',
    data: {
      customerId,
      subscriptionId,
      licenseKey,
    },
  };
}

/**
 * Handle subscription creation
 */
async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<WebhookResult> {
  console.log(`[Billing] Subscription created: ${subscription.id}, status: ${subscription.status}`);
  
  return {
    success: true,
    event: 'customer.subscription.created',
    message: `Subscription created with status: ${subscription.status}`,
    data: {
      customerId: subscription.customer as string,
      subscriptionId: subscription.id,
      status: subscription.status,
    },
  };
}

/**
 * Handle subscription updates (plan changes, renewals, etc.)
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<WebhookResult> {
  const status = subscription.status;
  const licenseKey = subscription.metadata?.licenseKey;
  
  console.log(`[Billing] Subscription updated: ${subscription.id}, status: ${status}`);
  
  // Handle status changes
  if (status === 'past_due' || status === 'unpaid') {
    console.log(`[Billing] Subscription ${subscription.id} needs attention: ${status}`);
    // TODO: Send payment reminder email
  } else if (status === 'active' && licenseKey) {
    // Subscription renewed or reactivated - update license expiry
    // TODO: Update license expiry in database
    console.log(`[Billing] License renewed for subscription ${subscription.id}`);
  }
  
  return {
    success: true,
    event: 'customer.subscription.updated',
    message: `Subscription updated to status: ${status}`,
    data: {
      customerId: subscription.customer as string,
      subscriptionId: subscription.id,
      licenseKey,
      status,
    },
  };
}

/**
 * Handle subscription cancellation/deletion
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<WebhookResult> {
  const licenseKey = subscription.metadata?.licenseKey;
  
  console.log(`[Billing] Subscription cancelled: ${subscription.id}`);
  
  // Revoke the license
  if (licenseKey) {
    revokeLicense(licenseKey);
    console.log(`[Billing] License revoked: ${licenseKey}`);
  }
  
  // TODO: Send cancellation confirmation email
  // TODO: Mark license as revoked in database
  
  return {
    success: true,
    event: 'customer.subscription.deleted',
    message: 'Subscription cancelled, license revoked',
    data: {
      customerId: subscription.customer as string,
      subscriptionId: subscription.id,
      licenseKey,
      status: 'cancelled',
    },
  };
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<WebhookResult> {
  console.log(`[Billing] Invoice paid: ${invoice.id}, amount: $${(invoice.amount_paid / 100).toFixed(2)}`);
  
  return {
    success: true,
    event: 'invoice.paid',
    message: `Invoice paid: $${(invoice.amount_paid / 100).toFixed(2)}`,
    data: {
      customerId: invoice.customer as string,
      subscriptionId: invoice.subscription as string,
    },
  };
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<WebhookResult> {
  console.log(`[Billing] Payment failed for invoice: ${invoice.id}`);
  
  // TODO: Send payment failure notification
  // TODO: Implement retry logic or grace period
  
  return {
    success: true,
    event: 'invoice.payment_failed',
    message: 'Payment failed - customer will be notified',
    data: {
      customerId: invoice.customer as string,
      subscriptionId: invoice.subscription as string,
    },
  };
}
