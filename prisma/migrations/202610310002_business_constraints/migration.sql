-- Application validation is complemented by structural constraints for all writers.
ALTER TABLE "legal_entities"
  ADD CONSTRAINT "legal_entities_cuit_digits" CHECK ("cuit" ~ '^[0-9]{11}$'),
  ADD CONSTRAINT "legal_entities_positive_version" CHECK ("version" > 0),
  ADD CONSTRAINT "legal_entities_nonempty_name" CHECK (length(btrim("legalName")) > 0);

ALTER TABLE "service_stations"
  ADD CONSTRAINT "service_stations_positive_version" CHECK ("version" > 0),
  ADD CONSTRAINT "service_stations_nonempty_code" CHECK (length(btrim("code")) > 0);

ALTER TABLE "stores" ADD CONSTRAINT "stores_positive_version" CHECK ("version" > 0);

ALTER TABLE "vehicles"
  ADD CONSTRAINT "vehicles_positive_version" CHECK ("version" > 0),
  ADD CONSTRAINT "vehicles_year_range" CHECK ("year" BETWEEN 1886 AND 2200);

CREATE UNIQUE INDEX "users_email_lower_key" ON "users" (lower("email"));
