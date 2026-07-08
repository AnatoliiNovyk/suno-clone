-- Which payment gateway(s) a merchant accepts payments through.
-- Secrets are NOT stored in plaintext columns readable by the owner:
-- credentials_ref points at a secret managed out-of-band (env/vault entry).
CREATE TABLE merchant_provider_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,              -- 'stripe' | 'liqpay' | ...
    credentials_ref TEXT,                -- reference to secret storage, never raw keys
    active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (merchant_id, provider)
);
