"use client";

import { ResourceActiveButton } from "@/components/shared/resource-active-button";

export function ChangeActiveButton({ id, active, version }: { id: string; active: boolean; version: number }) {
  return <ResourceActiveButton id={id} active={active} version={version}
    endpoint="/api/legal-entities" resourceLabel="razón social"
    deactivateDescription="La información y el historial se conservan. No se podrá desactivar si tiene entidades activas asociadas." />;
}
