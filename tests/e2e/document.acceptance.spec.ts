import { expect, test } from "@playwright/test";
import { clearTestRateLimits } from "./support/isolated-database";

test("documentación: configurar, asignar, revisar y conservar obligaciones con acceso autorizado", async ({ page, browser }, info) => {
  test.skip(!process.env.E2E_ADMIN_EMAIL, "Requiere la infraestructura aislada verify:postgres.");
  await clearTestRateLimits();
  const headers = { Origin: "http://localhost:3000" };
  const code = `BOMBEROS-${info.project.name.toUpperCase()}`;
  const name = `Certificado de bomberos ${info.project.name}`;
  const revisedName = `Habilitación de seguridad ${info.project.name}`;
  const failedRoutes: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 500) failedRoutes.push(new URL(response.url()).pathname);
  });
  await page.goto("/ingresar");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel("Contraseña", { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Ingresar al sistema" }).click();
  await expect(page).toHaveURL(/\/inicio$/);

  const stationResponse = await page.request.post("/api/stations", { headers, data: {
    name: `Documental QA ${info.project.name}`, code: `DOC-${info.project.name}`, legalEntityId: process.env.E2E_COMPANY_ID,
    operationalStatus: "OPERATIONAL", address: "QA", province: "QA", locality: "QA", responsible: "QA", email: "", phone: "",
  } });
  expect(stationResponse.status()).toBe(201);
  const stationId = (await stationResponse.json()).data.id as string;
  await page.goto(`/estaciones/${stationId}`);
  await page.getByRole("link", { name: "Documentación", exact: true }).last().click();
  await expect(page).toHaveURL(/\/documentacion\?entityId=[0-9a-f-]+$/);
  const entityId = new URL(page.url()).searchParams.get("entityId")!;
  await expect(page.getByRole("heading", { name: "No hay obligaciones para mostrar", exact: true })).toBeVisible();
  await expect(page.getByText("Sin evaluación de cumplimiento.", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Asignar requisito", exact: true }).click();
  await page.getByRole("link", { name: "Nuevo tipo documental", exact: true }).click();
  await page.getByLabel("Código interno", { exact: true }).fill(code);
  await page.getByLabel("Nombre", { exact: true }).fill(name);
  await page.getByLabel("Categoría", { exact: true }).fill("Seguridad");
  await page.getByRole("button", { name: "Agregar campo", exact: true }).click();
  await page.getByLabel("Clave del campo 1", { exact: true }).fill("numero");
  await page.getByLabel("Etiqueta del campo 1", { exact: true }).fill("Número del certificado");
  await page.getByRole("button", { name: "Crear tipo documental", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Configuración guardada.");
  await expect(page).toHaveURL(new RegExp(`entityId=${entityId}`));
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Asignar obligación", exact: true }).click();
  await expect(page).toHaveURL(`http://localhost:3000/documentacion?entityId=${entityId}`);
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(page.getByText("Pendiente de carga", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Asignar requisito", exact: true }).click();
  const assignedType = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name, exact: true }) });
  await expect(assignedType.getByText("Ya asignado", { exact: false })).toBeVisible();
  await expect(assignedType.getByRole("button", { name: "Asignar obligación", exact: true })).toHaveCount(0);
  await assignedType.getByRole("link", { name: "Ver obligación", exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Ver todas las obligaciones", exact: true }).click();
  await page.getByRole("link", { name: "Asignar requisito", exact: true }).click();
  await assignedType.getByRole("link", { name: "Editar configuración", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`entityId=${entityId}`));
  await page.getByLabel("Nombre", { exact: true }).fill(revisedName);
  await page.getByLabel("Próximo a vencer (días)", { exact: true }).fill("90");
  await page.getByRole("button", { name: "Crear revisión", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Configuración guardada.");
  await expect(page).toHaveURL(new RegExp(`entityId=${entityId}`));
  await expect(page.getByRole("heading", { name: revisedName, exact: true })).toBeVisible();
  const types = await page.request.get(`/api/document-types?q=${code}`);
  const type = (await types.json()).data.items[0] as { id: string; version: number };
  expect(type.version).toBe(2);
  await page.getByRole("textbox", { name: "Buscar tipo documental", exact: true }).fill(name);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByText("No hay tipos documentales para esta búsqueda.", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`entityId=${entityId}`));
  await page.getByRole("link", { name: "Obligaciones", exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(page.getByText(`${code} · Revisión 1`, { exact: true })).toBeVisible();
  expect((await page.request.post("/api/document-requirements", { headers: { Origin: "https://untrusted.invalid" }, data: { entityId, documentTypeId: type.id, typeVersion: 2 } })).status()).toBe(403);
  // Repeat client navigation after the cold route is compiled, without page.goto shortcuts.
  for (let visit = 0; visit < 3; visit++) {
    await page.getByRole("link", { name: "Asignar requisito", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Tipos documentales", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Obligaciones", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Documentación", exact: true })).toBeVisible();
  }
  expect(failedRoutes).toEqual([]);

  const viewerContext = await browser.newContext({ baseURL: "http://localhost:3000", viewport: info.project.use.viewport, isMobile: info.project.use.isMobile, hasTouch: info.project.use.hasTouch });
  try {
    const viewer = await viewerContext.newPage();
    await viewer.goto("/ingresar");
    await viewer.getByLabel("Email", { exact: true }).fill(process.env.E2E_VIEWER_EMAIL!);
    await viewer.getByLabel("Contraseña", { exact: true }).fill(process.env.E2E_VIEWER_PASSWORD!);
    await viewer.getByRole("button", { name: "Ingresar al sistema" }).click();
    await expect(viewer).toHaveURL(/\/inicio$/);
    await viewer.goto(`/documentacion?entityId=${entityId}`);
    await expect(viewer.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(viewer.getByRole("link", { name: "Asignar requisito", exact: true })).toHaveCount(0);
    expect((await viewer.request.post("/api/document-requirements", { headers, data: { entityId, documentTypeId: type.id, typeVersion: 2 } })).status()).toBe(403);
    expect((await viewer.request.patch(`/api/document-types/${type.id}`, { headers, data: { active: false, version: 2 } })).status()).toBe(403);
    await viewer.goto("/documentacion/tipos/nuevo");
    await expect(viewer.getByRole("heading", { name: "No tenés permiso para acceder", exact: true })).toBeVisible();
  } finally { await viewerContext.close(); }
});
