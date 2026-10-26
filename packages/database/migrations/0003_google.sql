CREATE TABLE google_connections (
  reader_id TEXT PRIMARY KEY REFERENCES readers(id),
  refresh_token TEXT NOT NULL,
  settings TEXT NOT NULL DEFAULT '{}',
  connected_at TEXT NOT NULL,
  last_synced_at TEXT
);
CREATE TABLE google_oauth_states (
  state TEXT PRIMARY KEY,
  reader_id TEXT NOT NULL REFERENCES readers(id),
  verifier TEXT NOT NULL,
  nonce TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX google_oauth_expiry ON google_oauth_states(expires_at);

ALTER TABLE editions ADD COLUMN agenda TEXT NOT NULL DEFAULT '[]';
