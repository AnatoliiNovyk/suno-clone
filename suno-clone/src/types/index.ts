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

export interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
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
