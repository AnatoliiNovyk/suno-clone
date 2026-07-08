import { supabase } from './supabase';
import type { BillingInterval, Currency, PaymentProviderKey, PlanPrice } from '../types';

export const CURRENCIES: Currency[] = ['UAH', 'USD', 'EUR'];

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  UAH: '₴',
  USD: '$',
  EUR: '€',
};

// Which providers can charge which currency (UI hint; the server re-validates).
export const PROVIDERS_FOR_CURRENCY: Record<Currency, PaymentProviderKey[]> = {
  UAH: ['liqpay'],
  USD: ['stripe', 'liqpay'],
  EUR: ['stripe', 'liqpay'],
};

export const PROVIDER_LABEL: Record<PaymentProviderKey, string> = {
  stripe: 'Stripe (картка)',
  liqpay: 'LiqPay',
};

// Mirror of the seed data in supabase/migrations — used as a fallback so the
// pricing UI keeps working before the migration is applied.
const FALLBACK_PRICES: PlanPrice[] = [
  { plan_key: 'pro', currency: 'USD', interval: 'month', amount_minor: 800 },
  { plan_key: 'pro', currency: 'EUR', interval: 'month', amount_minor: 750 },
  { plan_key: 'pro', currency: 'UAH', interval: 'month', amount_minor: 33000 },
  { plan_key: 'pro', currency: 'USD', interval: 'year', amount_minor: 7680 },
  { plan_key: 'pro', currency: 'EUR', interval: 'year', amount_minor: 7200 },
  { plan_key: 'pro', currency: 'UAH', interval: 'year', amount_minor: 316800 },
  { plan_key: 'premier', currency: 'USD', interval: 'month', amount_minor: 2400 },
  { plan_key: 'premier', currency: 'EUR', interval: 'month', amount_minor: 2200 },
  { plan_key: 'premier', currency: 'UAH', interval: 'month', amount_minor: 99000 },
  { plan_key: 'premier', currency: 'USD', interval: 'year', amount_minor: 23040 },
  { plan_key: 'premier', currency: 'EUR', interval: 'year', amount_minor: 21120 },
  { plan_key: 'premier', currency: 'UAH', interval: 'year', amount_minor: 950400 },
];

export function formatMoney(amountMinor: number, currency: Currency): string {
  const major = amountMinor / 100;
  const value = Number.isInteger(major) ? String(major) : major.toFixed(2);
  return `${CURRENCY_SYMBOL[currency]}${value}`;
}

export function findPrice(
  prices: PlanPrice[],
  planKey: string,
  currency: Currency,
  interval: BillingInterval,
): PlanPrice | undefined {
  return prices.find(
    (p) => p.plan_key === planKey && p.currency === currency && p.interval === interval,
  );
}

/** Loads the price table; falls back to the built-in copy of the seed data. */
export async function fetchPlanPrices(): Promise<PlanPrice[]> {
  try {
    const { data, error } = await supabase
      .from('plan_prices')
      .select('plan_key,currency,interval,amount_minor');
    if (error || !data || data.length === 0) return FALLBACK_PRICES;
    return data as PlanPrice[];
  } catch {
    return FALLBACK_PRICES;
  }
}
