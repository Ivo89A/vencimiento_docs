import { describe, expect, it } from "vitest";
import { csvCell, csvDocument } from "@/lib/csv";

describe("CSV seguro para planillas", () => {
  it("escapa comillas y conserva separadores", () => expect(csvCell('Empresa; "Centro"')).toBe('"Empresa; ""Centro"""'));
  it.each(["=1+1", "+54911", "-1+2", "@SUM(A1)", "  =HYPERLINK()", "\t=1", "\r=1"])("neutraliza fórmula %s", (value) => {
    expect(csvCell(value)).toBe(`"'${value}"`);
  });
  it("incluye BOM para Excel y líneas CRLF", () => expect(csvDocument([["Nombre", "Estado"], ["Empresa", "Activa"]])).toBe('\uFEFF"Nombre";"Estado"\r\n"Empresa";"Activa"'));
});
