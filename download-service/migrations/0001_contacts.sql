CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  phone TEXT,
  course TEXT NOT NULL CHECK(course IN ('MATH1048A','MATH1049A')),
  intent TEXT NOT NULL CHECK(intent IN ('free','hardcopy')),
  product TEXT NOT NULL,
  marketing_opt_in INTEGER NOT NULL DEFAULT 0,
  privacy_version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(email,course,intent,product)
);
CREATE INDEX IF NOT EXISTS leads_created ON leads(created_at);
CREATE TABLE IF NOT EXISTS grants (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id),
  course TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  uses INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS grants_expiry ON grants(expires_at);
CREATE TABLE IF NOT EXISTS rate_windows (
  key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_expiry ON rate_windows(expires_at);
