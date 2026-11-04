BEGIN;
CREATE TYPE "DocumentPresentationStatus" AS ENUM ('DRAFT', 'CANCELLED');
CREATE UNIQUE INDEX "document_requirements_id_documentTypeId_key" ON document_requirements (id, "documentTypeId");

CREATE TABLE document_presentations (
  id UUID PRIMARY KEY,
  "requirementId" UUID NOT NULL,
  "documentTypeId" UUID NOT NULL,
  "revisionId" UUID NOT NULL,
  number INTEGER NOT NULL CHECK (number > 0),
  status "DocumentPresentationStatus" NOT NULL DEFAULT 'DRAFT',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  "issuedOn" DATE,
  "expiresOn" DATE,
  "values" JSONB NOT NULL CHECK (jsonb_typeof("values") = 'object'),
  notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  "createdById" TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  "requestId" UUID NOT NULL,
  "requestFingerprint" VARCHAR(64) NOT NULL CHECK ("requestFingerprint" ~ '^[0-9a-f]{64}$'),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  UNIQUE ("requirementId", number),
  UNIQUE ("requirementId", "createdById", "requestId"),
  FOREIGN KEY ("requirementId", "documentTypeId") REFERENCES document_requirements(id, "documentTypeId") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("revisionId", "documentTypeId") REFERENCES document_type_revisions(id, "documentTypeId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CHECK ("issuedOn" IS NULL OR "expiresOn" IS NULL OR "issuedOn" <= "expiresOn")
);
CREATE INDEX "document_presentations_requirementId_createdAt_id_idx" ON document_presentations ("requirementId", "createdAt", id);

CREATE FUNCTION preserve_document_presentation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pinned_revision UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Document presentation history cannot be deleted' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT "revisionId" INTO pinned_revision FROM document_requirements WHERE id = NEW."requirementId" FOR UPDATE;
    IF NEW."revisionId" IS DISTINCT FROM pinned_revision OR NEW.status <> 'DRAFT' OR NEW.version <> 1 THEN
      RAISE EXCEPTION 'Presentation must start as a draft of the pinned revision' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF OLD.status <> 'DRAFT' OR NEW.version <> OLD.version + 1 OR
       (NEW.id, NEW."requirementId", NEW."documentTypeId", NEW."revisionId", NEW.number,
        NEW."createdById", NEW."requestId", NEW."requestFingerprint", NEW."createdAt") IS DISTINCT FROM
       (OLD.id, OLD."requirementId", OLD."documentTypeId", OLD."revisionId", OLD.number,
        OLD."createdById", OLD."requestId", OLD."requestFingerprint", OLD."createdAt") THEN
      RAISE EXCEPTION 'Presentation identity and cancelled history are immutable' USING ERRCODE = '23514';
    END IF;
    IF NEW.status = 'CANCELLED' AND (NEW."issuedOn", NEW."expiresOn", NEW."values", NEW.notes) IS DISTINCT FROM
       (OLD."issuedOn", OLD."expiresOn", OLD."values", OLD.notes) THEN
      RAISE EXCEPTION 'Cancellation cannot rewrite presentation contents' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER preserve_presentation BEFORE INSERT OR UPDATE OR DELETE ON document_presentations
  FOR EACH ROW EXECUTE FUNCTION preserve_document_presentation();

INSERT INTO permissions (code) VALUES ('documents:present') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions ("roleId", "permissionCode") SELECT id, 'documents:present' FROM roles
  WHERE name = 'Administrador' ON CONFLICT DO NOTHING;
COMMIT;
