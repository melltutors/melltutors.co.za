ALTER TABLE interest_leads ADD COLUMN programme TEXT NOT NULL DEFAULT ''
 CHECK(programme IN ('','premium','apex','prime','focus'));
