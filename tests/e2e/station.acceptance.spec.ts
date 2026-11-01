import { expect, test } from "@playwright/test";
import { clearTestRateLimits } from "./support/isolated-database";

function cuitForStationFixture(device: string) {
  const base = device === "mobile" ? "3092000001" : "3092000000";
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const digit = 11 - weights.reduce((total, weight, index) => total + Number(base[index]) * weight, 0) % 11;
  return `${base}${digit === 11 ? 0 : digit === 10 ? 9 : digit}`;
}

test("estaciones: alta, edición, historial, filtros, CSV y permisos reales", async ({ page, browser }, info) => {
  test.skip(!process.env.E2E_ADMIN_EMAIL, "Requiere fixtures aisladas: npm run verify:postgres.");
  await clearTestRateLimits();
  const companyId = process.env.E2E_COMPANY_ID!;
  const name = `Estación QA ${info.project.name}`;
  const code = `qa-${info.project.name}`;
  const headers = { Origin: "http://localhost:3000" };
  await page.goto("/ingresar");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel("Contraseña", { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Ingresar al sistema" }).click();
  await expect(page).toHaveURL(/\/inicio$/);
  await page.getByRole("heading", { name: "Estaciones activas", exact: true }).click();
  await expect(page).toHaveURL(/\/estaciones$/);
  await page.getByRole("link", { name: "Nueva estación", exact: true }).click();
  await page.getByRole("combobox", { name: "Razón social *", exact: true }).selectOption(companyId);
  await page.getByLabel("Nombre de la estación").fill(name);
  await page.getByLabel("Código interno").fill(code);
  await page.getByLabel("Dirección").fill("Calle QA 123");
  await page.getByLabel("Provincia").fill("Buenos Aires");
  await page.getByLabel("Localidad").fill("La Plata");
  await page.getByLabel("Responsable").fill("Administración QA");
  await page.getByRole("combobox", { name: "Estado operativo *", exact: true }).selectOption("PAUSED");
  await page.getByRole("button", { name: "Crear estación", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("La estación se guardó correctamente.");
  await expect(page.getByText(code.toUpperCase(), { exact: true })).toBeVisible();
  await expect(page.getByText("Temporalmente fuera de servicio", { exact: true })).toBeVisible();
  const id = new URL(page.url()).pathname.split("/").at(-1)!;

  await page.getByRole("link", { name: "Editar estación", exact: true }).click();
  await page.getByLabel("Nombre de la estación").fill(`${name} actualizada`);
  await page.getByRole("combobox", { name: "Estado operativo *", exact: true }).selectOption("OPERATIONAL");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(page.getByRole("heading", { name: `${name} actualizada`, exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Historial", exact: true }).click();
  await expect(page.getByText("Alta de estación", { exact: true })).toBeVisible();
  await expect(page.getByText("Datos actualizados", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Resumen", exact: true }).click();
  await page.getByRole("button", { name: "Desactivar", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByText("Inactiva", { exact: true })).toBeVisible();

  await page.goto(`/estaciones?${new URLSearchParams({ q: code, active: "false", legalEntityId: companyId, operationalStatus: "OPERATIONAL" })}`);
  if (info.project.name === "mobile") {
    await expect(page.getByRole("list", { name: "Estaciones autorizadas", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } else {
    await expect(page.getByRole("table", { name: "Estaciones autorizadas", exact: true })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: `${name} actualizada`, exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: `Seleccionar ${name} actualizada`, exact: true }).check();
  const [download] = await Promise.all([
    page.waitForEvent("download"), page.getByRole("button", { name: "Exportar CSV", exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("estaciones.csv");
  const chunks: Buffer[] = [];
  for await (const chunk of await download.createReadStream()) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString("utf8");
  expect(csv).toContain(`${name} actualizada`);
  expect(csv).toContain("Inactiva");

  await page.goto(`/estaciones/${id}`);
  await page.getByRole("button", { name: "Activar", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByText("Activa", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Empresa autorizada QA", exact: true }).click();
  await page.getByRole("link", { name: "Ver estaciones", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`legalEntityId=${companyId}`));
  await expect(page.getByRole("link", { name: `${name} actualizada`, exact: true })).toBeVisible();

  const forgedOrigin = await page.request.patch(`/api/stations/${id}`, {
    headers: { Origin: "https://untrusted.invalid" }, data: { active: false, version: 4 },
  });
  expect(forgedOrigin.status()).toBe(403);
  const stale = await page.request.patch(`/api/stations/${id}`, { headers, data: { active: false, version: 1 } });
  expect(stale.status()).toBe(409);

  const foreignCompany = await page.request.post("/api/legal-entities", { headers, data: {
    legalName: `Empresa externa estaciones ${info.project.name}`, tradeName: `Externa ${info.project.name}`,
    cuit: cuitForStationFixture(info.project.name), address: "QA", province: "QA", locality: "QA", responsible: "QA", email: "", phone: "",
  } });
  expect(foreignCompany.status()).toBe(201);
  const foreignCompanyId = (await foreignCompany.json()).data.id as string;
  const foreignStation = await page.request.post("/api/stations", { headers, data: {
    name: `Estación ajena ${info.project.name}`, code: `foreign-${info.project.name}`, legalEntityId: foreignCompanyId,
    operationalStatus: "OPERATIONAL", address: "QA", province: "QA", locality: "QA", responsible: "QA", email: "", phone: "",
  } });
  expect(foreignStation.status()).toBe(201);
  const foreignId = (await foreignStation.json()).data.id as string;

  const viewerContext = await browser.newContext({
    baseURL: "http://localhost:3000", viewport: info.project.use.viewport,
    isMobile: info.project.use.isMobile, hasTouch: info.project.use.hasTouch,
  });
  try {
    const viewer = await viewerContext.newPage();
    await viewer.goto("/ingresar");
    await viewer.getByLabel("Email", { exact: true }).fill(process.env.E2E_VIEWER_EMAIL!);
    await viewer.getByLabel("Contraseña", { exact: true }).fill(process.env.E2E_VIEWER_PASSWORD!);
    await viewer.getByRole("button", { name: "Ingresar al sistema" }).click();
    await expect(viewer).toHaveURL(/\/inicio$/);
    await viewer.goto(`/estaciones/${id}`);
    await expect(viewer.getByRole("heading", { name: `${name} actualizada`, exact: true })).toBeVisible();
    await expect(viewer.getByRole("link", { name: "Editar estación", exact: true })).toHaveCount(0);
    const denied = await viewer.request.patch(`/api/stations/${id}`, { headers, data: { active: false, version: 4 } });
    expect(denied.status()).toBe(403);
    expect((await viewer.request.get(`/api/stations/${foreignId}`)).status()).toBe(404);
    const forbiddenExport = await viewer.request.get(`/api/stations/export?ids=${id}`);
    expect(forbiddenExport.status()).toBe(403);
    const foreignList = await viewer.request.get(`/api/stations?legalEntityId=${foreignCompanyId}`);
    expect((await foreignList.json()).data.total).toBe(0);
    await viewer.goto("/estaciones/nueva");
    await expect(viewer.getByRole("heading", { name: "No tenés permiso para acceder", exact: true })).toBeVisible();
    const openMenu = viewer.getByRole("button", { name: "Abrir menú", exact: true });
    if (await openMenu.isVisible()) await openMenu.click();
    await viewer.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
    await expect(viewer).toHaveURL(/\/ingresar$/);
    expect((await viewer.request.get(`/api/stations/${id}`)).status()).toBe(401);
  } finally { await viewerContext.close(); }
});
