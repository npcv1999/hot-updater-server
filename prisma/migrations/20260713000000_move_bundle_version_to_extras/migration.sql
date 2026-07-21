-- Move the custom bundle version out of the generated Hot Updater table.
CREATE TABLE "bundle_extras" (
    "bundle_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,

    CONSTRAINT "bundle_extras_pkey" PRIMARY KEY ("bundle_id")
);

INSERT INTO "bundle_extras" ("bundle_id", "version")
SELECT "id", "version"
FROM "bundles";

CREATE INDEX "bundle_extras_version_idx"
ON "bundle_extras"("version");

DROP TRIGGER IF EXISTS "bundles_set_version" ON "bundles";
DROP FUNCTION IF EXISTS set_bundle_version();
DROP INDEX IF EXISTS "bundles_version_idx";
ALTER TABLE "bundles" DROP COLUMN "version";

CREATE OR REPLACE FUNCTION set_bundle_extra_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtext(COALESCE(NEW.target_app_version, '') || '|' || NEW.platform || '|' || NEW.channel)
  );

  SELECT COALESCE(MAX("version"), 0) + 1
  INTO next_version
  FROM "bundle_extras" extras
  JOIN "bundles" existing ON existing.id = extras.bundle_id
  WHERE existing.target_app_version IS NOT DISTINCT FROM NEW.target_app_version
    AND existing.platform = NEW.platform
    AND existing.channel = NEW.channel;

  INSERT INTO "bundle_extras" ("bundle_id", "version")
  VALUES (NEW.id, next_version)
  ON CONFLICT ("bundle_id") DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "bundles_set_extra_version"
AFTER INSERT ON "bundles"
FOR EACH ROW
EXECUTE FUNCTION set_bundle_extra_version();

CREATE OR REPLACE FUNCTION delete_bundle_extra()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "bundle_extras" WHERE "bundle_id" = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "bundles_delete_extra"
AFTER DELETE ON "bundles"
FOR EACH ROW
EXECUTE FUNCTION delete_bundle_extra();
