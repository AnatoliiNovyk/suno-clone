CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    plan TEXT NOT NULL,
    -- legacy Stripe-only columns (kept for backwards compatibility)
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    -- generalized multi-provider columns
    provider TEXT DEFAULT 'stripe',
    currency TEXT DEFAULT 'USD',
    amount_minor INTEGER,
    "interval" TEXT DEFAULT 'month',
    provider_customer_id TEXT,
    provider_subscription_id TEXT,
    merchant_id UUID,
    status TEXT DEFAULT 'active',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
