import type { StationData } from "./station.schemas";

export type StationCompanyOption = { id: string; label: string; active: boolean };

export type StationListItem = Pick<StationData,
  "name" | "code" | "legalEntityId" | "operationalStatus" | "locality" | "province" | "responsible"
> & {
  id: string;
  active: boolean;
  legalEntity: { id: string; legalName: string; tradeName: string; active: boolean };
};

export type StationDetail = StationData & {
  id: string;
  active: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  legalEntity: StationListItem["legalEntity"];
};
