-- Rate limit log: one row per allowed request, used for windowed counting.
-- Also stores "__violation__" rows to track auto-block eligibility.
CREATE TABLE rate_limit_log (
  id         bigserial PRIMARY KEY,
  ip_address text        NOT NULL,
  route      text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limit_log_ip_route_created
  ON rate_limit_log (ip_address, route, created_at);

-- Blocked IPs: expires_at NULL = permanent block.
CREATE TABLE blocked_ips (
  id         bigserial   PRIMARY KEY,
  ip_address text        UNIQUE NOT NULL,
  reason     text,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

-- Enable RLS so anon/authenticated roles can't touch these tables.
-- Service role bypasses RLS and retains full access.
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips    ENABLE ROW LEVEL SECURITY;
