-- Minimal-KYC document set: one identity/registration document is enough
-- to submit an application; the required list is a product decision, not a schema one.
CREATE TABLE merchant_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    type TEXT NOT NULL,                  -- 'identity' | 'tax_id' | 'company_registration' | ...
    file_path TEXT NOT NULL,             -- path inside the private 'merchant-docs' bucket
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
