-- Fixed price per plan/currency/interval, in minor units (kopiykas/cents).
-- No FX conversion: every supported currency gets an explicit row.
CREATE TABLE plan_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_key TEXT NOT NULL REFERENCES plans(key),
    currency TEXT NOT NULL CHECK (currency IN ('UAH', 'USD', 'EUR')),
    "interval" TEXT NOT NULL CHECK ("interval" IN ('month', 'year')),
    amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (plan_key, currency, "interval")
);
