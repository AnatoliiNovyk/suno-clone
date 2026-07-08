CREATE TABLE plans (
    key TEXT PRIMARY KEY,                -- 'free' | 'pro' | 'premier'
    name TEXT NOT NULL,
    monthly_credits INTEGER NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
