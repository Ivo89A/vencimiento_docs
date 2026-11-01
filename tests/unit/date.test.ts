import { describe, expect, it } from "vitest";
import { formatDateTime } from "@/lib/date";

describe("Fechas argentinas", () => {
  it("muestra cuatro dígitos de año y zona local", () => {
    expect(formatDateTime(new Date("2026-10-31T15:05:00Z"))).toContain("31/10/2026");
    expect(formatDateTime(new Date("2026-10-31T15:05:00Z"))).toContain("12:05");
  });
  it("respeta el día local anterior a medianoche UTC", () => {
    expect(formatDateTime(new Date("2026-11-01T01:00:00Z"))).toContain("31/10/2026");
  });
});
