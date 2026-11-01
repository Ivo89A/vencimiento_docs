BEGIN;

CREATE TYPE "StationOperationalStatus" AS ENUM ('OPERATIONAL', 'PAUSED', 'CLOSED');
ALTER TABLE "service_stations"
  ADD COLUMN "operationalStatus" "StationOperationalStatus" NOT NULL DEFAULT 'OPERATIONAL';

-- Fail rather than silently merge existing codes that collide after normalization.
CREATE UNIQUE INDEX "service_stations_company_normalized_code_key"
  ON "service_stations" ("legalEntityId", upper(btrim("code")));

INSERT INTO "permissions" ("code") VALUES ('stations:export') ON CONFLICT DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionCode")
  SELECT "id", 'stations:export' FROM "roles" WHERE "name" = 'Administrador'
  ON CONFLICT DO NOTHING;

COMMIT;
