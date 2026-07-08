export interface User {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  credits: number;
  plan: 'free' | 'pro' | 'premier';
  created_at: string;
}

export interface Track {
  id: string;
  user_id: string;
  title: string;
  prompt?: string;
  lyrics?: string;
  genre?: string;
  audio_url?: string;
  cover_url?: string;
  duration: number;
  is_public: boolean;
  likes: number;
  plays: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export type Currency = 'UAH' | 'USD' | 'EUR';
export type BillingInterval = 'month' | 'year';
export type PaymentProviderKey = 'stripe' | 'liqpay';

export interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  provider?: PaymentProviderKey;
  currency?: Currency;
  amount_minor?: number;
  interval?: BillingInterval;
  provider_customer_id?: string;
  provider_subscription_id?: string;
  /** @deprecated legacy Stripe-only columns; use provider_* fields */
  stripe_customer_id?: string;
  /** @deprecated legacy Stripe-only columns; use provider_* fields */
  stripe_subscription_id?: string;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
}

export interface PlanPrice {
  plan_key: string;
  currency: Currency;
  interval: BillingInterval;
  amount_minor: number;
}

export interface Merchant {
  id: string;
  owner_user_id: string;
  legal_name: string;
  contact_email: string;
  country: string;
  status: 'pending' | 'approved' | 'rejected';
  review_note?: string;
  created_at: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  credits: number;
  features: string[];
  recommended?: boolean;
}
