ALTER TABLE readers ADD COLUMN sources_configured INTEGER NOT NULL DEFAULT 0;
UPDATE readers SET sources_configured = 1 WHERE id IN (SELECT reader_id FROM source_settings);
