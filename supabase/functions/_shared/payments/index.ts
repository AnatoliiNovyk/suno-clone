import { PaymentProvider } from './provider.ts';
import { stripeProvider } from './stripe.ts';
import { liqpayProvider } from './liqpay.ts';

// Registry: adding a provider = one import + one entry here.
const providers: Record<string, PaymentProvider> = {
  [stripeProvider.key]: stripeProvider,
  [liqpayProvider.key]: liqpayProvider,
};

export function getProvider(key: string): PaymentProvider | null {
  return providers[key] ?? null;
}

export function listProviders(): PaymentProvider[] {
  return Object.values(providers);
}

export * from './provider.ts';
