ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS storage_provider TEXT,
  ADD COLUMN IF NOT EXISTS file_key TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ;

ALTER TABLE prescriptions
  ALTER COLUMN file_path DROP NOT NULL;

UPDATE prescriptions
SET uploaded_at = COALESCE(uploaded_at, created_at)
WHERE uploaded_at IS NULL;

UPDATE prescriptions
SET storage_provider = COALESCE(NULLIF(storage_provider, ''), CASE WHEN file_path IS NOT NULL AND file_path <> '' THEN 'local' ELSE NULL END)
WHERE storage_provider IS NULL OR storage_provider = '';

UPDATE prescriptions
SET file_key = COALESCE(NULLIF(file_key, ''), NULLIF(file_path, ''))
WHERE file_key IS NULL OR file_key = '';
