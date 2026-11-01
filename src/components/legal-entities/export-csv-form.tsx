"use client";

import { CsvExportForm } from "@/components/shared/csv-export-form";

export function ExportCsvForm({ query }: { query: Record<string, string | number> }) {
  return <CsvExportForm query={query} endpoint="/api/legal-entities/export" formId="export-legal-entities" filename="razones-sociales.csv" />;
}
