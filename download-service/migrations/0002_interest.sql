CREATE TABLE IF NOT EXISTS interest_leads (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT NOT NULL,
 year TEXT NOT NULL CHECK(year IN ('First year','Second year','Other','Not sure yet')),
 modules TEXT NOT NULL, times TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '',
 first_campaign TEXT NOT NULL, latest_campaign TEXT NOT NULL,
 contact_consent INTEGER NOT NULL CHECK(contact_consent=1),
 marketing_opt_in INTEGER NOT NULL DEFAULT 0 CHECK(marketing_opt_in IN (0,1)),
 privacy_version TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 request_count INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS interest_created ON interest_leads(created_at);
CREATE INDEX IF NOT EXISTS interest_campaign ON interest_leads(first_campaign);
