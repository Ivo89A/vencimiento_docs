export const defaultTimeZone = "America/Argentina/Buenos_Aires";

export function formatDateTime(date: Date, timeZone = defaultTimeZone) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone,
  }).format(date);
}

/** Civil dates have no instant/timezone; format their UTC representation without shifting days. */
export function formatCivilDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00.000Z`));
}
