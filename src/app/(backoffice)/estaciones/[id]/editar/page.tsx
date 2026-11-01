import { notFound } from "next/navigation";
import { requirePageActor } from "@/domains/auth/authorization";
import { hasPermission } from "@/domains/auth/access-policy";
import { getStation } from "@/domains/stations/station.queries";
import { stationIdSchema } from "@/domains/stations/station.schemas";
import { DomainError } from "@/lib/errors";
import { PageHeading } from "@/components/ui/page-heading";
import { PermissionNotice } from "@/components/ui/permission-notice";
import { StationForm } from "@/components/stations/station-form";

export const metadata = { title: "Editar estación" };

export default async function EditStationPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageActor();
  if (!hasPermission(actor, "stations:write") || !hasPermission(actor, "stations:read")) return <PermissionNotice />;
  const { id } = await params;
  if (!stationIdSchema.safeParse(id).success) notFound();
  let station;
  try { station = await getStation(actor, id); }
  catch (error) { if (error instanceof DomainError && error.status === 404) notFound(); throw error; }
  const { name, code, legalEntityId, operationalStatus, address, province, locality, responsible, phone, email, version } = station;
  return <><PageHeading eyebrow="Estructura empresarial" title="Editar estación" description={name} />
    <StationForm initial={{ id, version, name, code, legalEntityId, operationalStatus, address, province, locality, responsible, phone, email }}
      company={{ id: legalEntityId, label: `${station.legalEntity.tradeName} — ${station.legalEntity.legalName}`, active: station.legalEntity.active }} />
  </>;
}
