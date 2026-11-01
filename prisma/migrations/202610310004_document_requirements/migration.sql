BEGIN;
CREATE TYPE "DocumentEntityKind" AS ENUM ('LEGAL_ENTITY', 'STATION', 'STORE', 'VEHICLE');
CREATE TYPE "DocumentCriticality" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE UNIQUE INDEX "stores_id_legalEntityId_key" ON "stores" ("id", "legalEntityId");
CREATE UNIQUE INDEX "vehicles_id_legalEntityId_key" ON "vehicles" ("id", "legalEntityId");

CREATE TABLE "documentable_entities" (
  "id" UUID PRIMARY KEY,
  "kind" "DocumentEntityKind" NOT NULL,
  "legalEntityId" UUID NOT NULL REFERENCES "legal_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "companyId" UUID UNIQUE REFERENCES "legal_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "stationId" UUID UNIQUE,
  "storeId" UUID UNIQUE,
  "vehicleId" UUID UNIQUE,
  UNIQUE ("stationId", "legalEntityId"), UNIQUE ("storeId", "legalEntityId"), UNIQUE ("vehicleId", "legalEntityId"),
  FOREIGN KEY ("stationId", "legalEntityId") REFERENCES "service_stations"("id", "legalEntityId") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("storeId", "legalEntityId") REFERENCES "stores"("id", "legalEntityId") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("vehicleId", "legalEntityId") REFERENCES "vehicles"("id", "legalEntityId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "documentable_exact_subtype" CHECK (
    num_nonnulls("companyId", "stationId", "storeId", "vehicleId") = 1 AND
    CASE "kind"
      WHEN 'LEGAL_ENTITY' THEN "companyId" IS NOT NULL AND "companyId" = "legalEntityId"
      WHEN 'STATION' THEN "stationId" IS NOT NULL
      WHEN 'STORE' THEN "storeId" IS NOT NULL
      WHEN 'VEHICLE' THEN "vehicleId" IS NOT NULL
    END
  )
);
CREATE INDEX "documentable_entities_legalEntityId_kind_id_idx" ON "documentable_entities" ("legalEntityId", "kind", "id");

CREATE TABLE "document_types" (
  "id" UUID PRIMARY KEY, "code" TEXT NOT NULL UNIQUE, "active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "document_types_active_code_id_idx" ON "document_types" ("active", "code", "id");
CREATE TABLE "document_type_revisions" (
  "id" UUID PRIMARY KEY, "documentTypeId" UUID NOT NULL REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "number" INTEGER NOT NULL CHECK ("number" > 0), "name" TEXT NOT NULL, "description" TEXT NOT NULL,
  "category" TEXT NOT NULL, "appliesTo" "DocumentEntityKind"[] NOT NULL,
  "required" BOOLEAN NOT NULL, "criticality" "DocumentCriticality" NOT NULL,
  "requiresApproval" BOOLEAN NOT NULL, "expires" BOOLEAN NOT NULL,
  "warningDays" INTEGER NOT NULL CHECK ("warningDays" BETWEEN 0 AND 3650),
  "alertDays" INTEGER[] NOT NULL, "fields" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("documentTypeId", "number"), UNIQUE ("id", "documentTypeId"),
  CHECK (cardinality("appliesTo") BETWEEN 1 AND 4),
  CHECK (cardinality("alertDays") <= 20 AND 0 <= ALL("alertDays") AND 3650 >= ALL("alertDays")),
  CHECK (jsonb_typeof("fields") = 'array')
);
CREATE TABLE "document_requirements" (
  "id" UUID PRIMARY KEY,
  "entityId" UUID NOT NULL REFERENCES "documentable_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "documentTypeId" UUID NOT NULL REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "revisionId" UUID NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("entityId", "documentTypeId"),
  FOREIGN KEY ("revisionId", "documentTypeId") REFERENCES "document_type_revisions"("id", "documentTypeId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "document_requirements_documentTypeId_id_idx" ON "document_requirements" ("documentTypeId", "id");

-- Registries follow real records, including writers outside Prisma. No business rows are recreated.
CREATE FUNCTION register_documentable_entity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'legal_entities' THEN
    INSERT INTO documentable_entities (id, kind, "legalEntityId", "companyId") VALUES (gen_random_uuid(), 'LEGAL_ENTITY', NEW.id, NEW.id);
  ELSIF TG_TABLE_NAME = 'service_stations' THEN
    INSERT INTO documentable_entities (id, kind, "legalEntityId", "stationId") VALUES (gen_random_uuid(), 'STATION', NEW."legalEntityId", NEW.id);
  ELSIF TG_TABLE_NAME = 'stores' THEN
    INSERT INTO documentable_entities (id, kind, "legalEntityId", "storeId") VALUES (gen_random_uuid(), 'STORE', NEW."legalEntityId", NEW.id);
  ELSE
    INSERT INTO documentable_entities (id, kind, "legalEntityId", "vehicleId") VALUES (gen_random_uuid(), 'VEHICLE', NEW."legalEntityId", NEW.id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER register_documentable AFTER INSERT ON legal_entities FOR EACH ROW EXECUTE FUNCTION register_documentable_entity();
CREATE TRIGGER register_documentable AFTER INSERT ON service_stations FOR EACH ROW EXECUTE FUNCTION register_documentable_entity();
CREATE TRIGGER register_documentable AFTER INSERT ON stores FOR EACH ROW EXECUTE FUNCTION register_documentable_entity();
CREATE TRIGGER register_documentable AFTER INSERT ON vehicles FOR EACH ROW EXECUTE FUNCTION register_documentable_entity();
INSERT INTO documentable_entities (id, kind, "legalEntityId", "companyId") SELECT gen_random_uuid(), 'LEGAL_ENTITY', id, id FROM legal_entities;
INSERT INTO documentable_entities (id, kind, "legalEntityId", "stationId") SELECT gen_random_uuid(), 'STATION', "legalEntityId", id FROM service_stations;
INSERT INTO documentable_entities (id, kind, "legalEntityId", "storeId") SELECT gen_random_uuid(), 'STORE', "legalEntityId", id FROM stores;
INSERT INTO documentable_entities (id, kind, "legalEntityId", "vehicleId") SELECT gen_random_uuid(), 'VEHICLE', "legalEntityId", id FROM vehicles;

-- The row lock also serializes assignment versus a concurrent company transfer.
CREATE FUNCTION preserve_document_scope() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."legalEntityId" <> OLD."legalEntityId" AND EXISTS (SELECT 1 FROM document_requirements WHERE "entityId" = OLD.id) THEN
    RAISE EXCEPTION 'Documentary obligations prevent transfer' USING ERRCODE = '23503';
  END IF;
  IF (NEW.id, NEW.kind, NEW."companyId", NEW."stationId", NEW."storeId", NEW."vehicleId") IS DISTINCT FROM
     (OLD.id, OLD.kind, OLD."companyId", OLD."stationId", OLD."storeId", OLD."vehicleId") THEN
    RAISE EXCEPTION 'Documentable identity is immutable' USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER preserve_scope BEFORE UPDATE ON documentable_entities FOR EACH ROW EXECUTE FUNCTION preserve_document_scope();
CREATE FUNCTION preserve_document_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Document type revisions are immutable' USING ERRCODE = '23514';
END $$;
CREATE TRIGGER immutable_revision BEFORE UPDATE OR DELETE ON document_type_revisions FOR EACH ROW EXECUTE FUNCTION preserve_document_revision();

-- A registry cannot disappear while its concrete record still exists. Cascading deletion
-- of an unreferenced concrete record is allowed; requirements retain their parent via RESTRICT.
CREATE FUNCTION ensure_documentable_correspondence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM documentable_entities WHERE id = OLD.id) AND (
    EXISTS (SELECT 1 FROM legal_entities WHERE id = OLD."companyId") OR
    EXISTS (SELECT 1 FROM service_stations WHERE id = OLD."stationId") OR
    EXISTS (SELECT 1 FROM stores WHERE id = OLD."storeId") OR
    EXISTS (SELECT 1 FROM vehicles WHERE id = OLD."vehicleId")
  ) THEN
    RAISE EXCEPTION 'Concrete entity requires its registry' USING ERRCODE = '23503';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER exact_documentable_correspondence AFTER DELETE ON documentable_entities
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ensure_documentable_correspondence();

CREATE FUNCTION validate_document_requirement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE entity_kind "DocumentEntityKind";
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW."entityId", NEW."documentTypeId", NEW."revisionId") IS DISTINCT FROM
    (OLD."entityId", OLD."documentTypeId", OLD."revisionId") THEN
    RAISE EXCEPTION 'Assigned documentary configuration is immutable' USING ERRCODE = '23503';
  END IF;
  SELECT kind INTO entity_kind FROM documentable_entities WHERE id = NEW."entityId" FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM document_type_revisions WHERE id = NEW."revisionId"
    AND "documentTypeId" = NEW."documentTypeId" AND entity_kind = ANY("appliesTo")) THEN
    RAISE EXCEPTION 'Document type does not apply to entity' USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER applicable_document_requirement BEFORE INSERT OR UPDATE ON document_requirements
  FOR EACH ROW EXECUTE FUNCTION validate_document_requirement();

INSERT INTO permissions (code) VALUES ('documents:read'), ('documents:configure'), ('documents:assign') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions ("roleId", "permissionCode") SELECT id, p.code FROM roles CROSS JOIN
  (VALUES ('documents:read'), ('documents:configure'), ('documents:assign')) AS p(code) WHERE name = 'Administrador' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions ("roleId", "permissionCode") SELECT id, 'documents:read' FROM roles WHERE name = 'Visualizador' ON CONFLICT DO NOTHING;
COMMIT;
