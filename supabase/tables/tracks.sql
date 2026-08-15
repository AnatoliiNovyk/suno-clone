CREATE TABLE tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    prompt TEXT,
    lyrics TEXT,
    genre TEXT,
    audio_url TEXT,
    cover_url TEXT,
    duration INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT false,
    likes INTEGER DEFAULT 0,
    plays INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    -- Credits actually charged, so the stuck-track reaper refunds the exact
    -- amount instead of guessing song (10) vs sample (4).
    generation_cost INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Bumped by the tracks_set_updated_at trigger on every write.
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
