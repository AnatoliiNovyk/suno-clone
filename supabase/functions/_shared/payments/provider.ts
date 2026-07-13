// Payment provider abstraction. Adding a gateway = implement PaymentProvider
// in a new file and register it in ./index.ts — no changes to edge functions.

export type Currency = 'UAH' | 'USD' | 'EUR';
export type Interval = 'month' | 'year';

export interface CheckoutParams {
  planKey: string;
  planName: string;
  currency: Currency;
  interval: Interval;
  amountMinor: number; // kopiykas / cents
  customerEmail: string;
  userId: string;
  siteUrl: string;     // frontend base URL for success/cancel redirects
  successUrl: string;
  cancelUrl: string;
  webhookUrl: string;  // this provider's server callback URL
}

export interface CheckoutResult {
  checkoutUrl: string;
  providerRef: string; // session id / order id — for tracing
}

export type WebhookEvent =
  | {
      type: 'payment_completed';
      userId?: string;
      email?: string;
      planKey: string;
      currency: string;
      amountMinor: number;
      interval: string;
      providerCustomerId?: string;
      providerSubscriptionId?: string;
    }
  | { type: 'subscription_cancelled'; providerSubscriptionId: string }
  | { type: 'ignored'; reason: string };

export interface PaymentProvider {
  key: string;
  supportedCurrencies: Currency[];
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  // MUST verify the provider's signature; throw on an invalid one.
  verifyWebhook(req: Request): Promise<WebhookEvent>;
}

// --- shared crypto helpers ---

const encoder = new TextEncoder();

export function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function bytesToBase64(bytes: ArrayBuffer): string {
  let binary = '';
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function utf8ToBase64(text: string): string {
  return bytesToBase64(encoder.encode(text).buffer as ArrayBuffer);
}

export function base64ToUtf8(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return bytesToHex(sig);
}

export async function sha1Base64(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', encoder.encode(text));
  return bytesToBase64(digest);
}

// Constant-time string comparison for signatures.
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
