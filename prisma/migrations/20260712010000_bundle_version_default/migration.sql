-- Cho phép INSERT không truyền version (hot-updater/server không biết field này);
-- trigger BEFORE INSERT sẽ override giá trị 0 mặc định bằng số version thật.
ALTER TABLE "bundles" ALTER COLUMN "version" SET DEFAULT 0;

CREATE OR REPLACE FUNCTION set_bundle_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.version IS NULL OR NEW.version = 0 THEN
    PERFORM pg_advisory_xact_lock(
      hashtext(COALESCE(NEW.target_app_version, '') || '|' || NEW.platform || '|' || NEW.channel)
    );
    SELECT COALESCE(MAX(version), 0) + 1
    INTO NEW.version
    FROM bundles
    WHERE target_app_version IS NOT DISTINCT FROM NEW.target_app_version
      AND platform = NEW.platform
      AND channel = NEW.channel;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
