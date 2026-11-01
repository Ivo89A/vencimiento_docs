import type { LegalEntityData } from "./legal-entity.schemas";

export type LegalEntityListItem = LegalEntityData & {
  id: string;
  active: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};
