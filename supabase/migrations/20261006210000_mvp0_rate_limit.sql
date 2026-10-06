-- MVP-0: rate limiting cho /login (theo review security ChatGPT)
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_key TEXT UNIQUE NOT NULL,
    attempt_count INT NOT NULL DEFAULT 1,
    window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    blocked_until TIMESTAMPTZ
);
