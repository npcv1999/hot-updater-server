ALTER TABLE "bundles" ADD COLUMN "version" INTEGER;

CREATE OR REPLACE FUNCTION set_bundle_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.version IS NULL THEN
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

CREATE TRIGGER bundles_set_version
BEFORE INSERT ON bundles
FOR EACH ROW
EXECUTE FUNCTION set_bundle_version();

-- Backfill cho các bundle đã có sẵn: đánh số theo id (UUIDv7 tăng dần theo thời gian)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY target_app_version, platform, channel
           ORDER BY id
         ) AS rn
  FROM bundles
)
UPDATE bundles b SET version = ranked.rn
FROM ranked WHERE b.id = ranked.id AND b.version IS NULL;

ALTER TABLE "bundles" ALTER COLUMN "version" SET NOT NULL;

CREATE INDEX "bundles_version_idx"
ON "bundles" (target_app_version, platform, channel, version DESC);
