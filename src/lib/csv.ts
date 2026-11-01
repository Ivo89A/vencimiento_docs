/** Quote every cell and neutralize spreadsheet formulas, including whitespace-prefixed payloads. */
export function csvCell(value: string | number | boolean) {
  const text = String(value);
  const safe = /^[=+\-@]/.test(text.trimStart()) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function csvDocument(rows: (string | number | boolean)[][]) {
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}
