import { notFound } from "next/navigation";
import { requirePageActor } from "@/domains/auth/authorization";
import { hasPermission } from "@/domains/auth/access-policy";
import { getStationCompanyOption } from "@/domains/stations/station.queries";
import { stationIdSchema } from "@/domains/stations/station.schemas";
import { DomainError } from "@/lib/errors";
import { PageHeading } from "@/components/ui/page-heading";
import { PermissionNotice } from "@/components/ui/permission-notice";
import { StationForm } from "@/components/stations/station-form";

export const metadata = { title: "Nueva estación" };

export default async function NewStationPage({ searchParams }: { searchParams: Promise<{ legalEntityId?: string }> }) {
  const actor = await requirePageActor();
  if (!hasPermission(actor, "stations:write")) return <PermissionNotice />;
  const { legalEntityId } = await searchParams;
  if (legalEntityId && !stationIdSchema.safeParse(legalEntityId).success) notFound();
  let company;
  try { company = legalEntityId ? await getStationCompanyOption(actor, legalEntityId) : undefined; }
  catch (error) { if (error instanceof DomainError && error.status === 404) notFound(); throw error; }
  return <><PageHeading eyebrow="Estructura empresarial" title="Nueva estación" description="Registrá una estación y asociá su razón social y responsable." /><StationForm company={company} /></>;
}
