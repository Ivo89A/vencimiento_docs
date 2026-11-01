import { expect, test } from "@playwright/test";
import { clearTestRateLimits } from "./support/isolated-database";

test("administrador crea/edita y visualizador no puede modificar ni cruzar alcance", async ({ page, browser }, info) => {
  test.skip(!process.env.E2E_ADMIN_EMAIL, "Requiere fixtures aisladas: npm run verify:postgres.");
  await clearTestRateLimits();
  const cuit = info.project.name === "mobile" ? "30712345689" : "30712345671";
  await page.goto("/ingresar");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel("Contraseña", { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Ingresar al sistema" }).click();
  await expect(page).toHaveURL(/\/inicio$/, { timeout: 20000 });
  await page.goto("/razones-sociales");
  await page.getByRole("checkbox", { name: "Seleccionar Empresa autorizada QA", exact: true }).check();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportar CSV", exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("razones-sociales.csv");
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString("utf8")).toContain("Empresa autorizada QA");
  await page.getByRole("link", { name: "Nueva razón social" }).click();
  await page.getByLabel("Nombre legal").fill(`Empresa QA ${info.project.name}`);
  await page.getByLabel("Nombre comercial").fill(`Comercial QA ${info.project.name}`);
  await page.getByLabel("CUIT").fill(cuit);
  await page.getByLabel("Responsable").fill("Responsable QA");
  await page.getByLabel("Domicilio").fill("Calle de pruebas 123");
  await page.getByLabel("Provincia").fill("Buenos Aires");
  await page.getByLabel("Localidad").fill("La Plata");
  await page.getByRole("button", { name: "Crear razón social" }).click();
  await expect(page.getByRole("status")).toHaveText("Los datos se guardaron correctamente.");
  const id = new URL(page.url()).pathname.split("/").at(-1)!;
  await page.getByRole("link", { name: "Editar datos" }).click();
  await page.getByLabel("Nombre comercial").fill(`Comercial renovada ${info.project.name}`);
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("heading", { name: `Comercial renovada ${info.project.name}` })).toBeVisible();
  await page.getByRole("button", { name: "Desactivar", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByText("Inactiva", { exact: true })).toBeVisible();

  const deniedOrigin = await page.request.patch(`/api/legal-entities/${id}`, { headers: { Origin: "https://untrusted.invalid" }, data: { active: true, version: 3 } });
  expect(deniedOrigin.status()).toBe(403);

  const viewerContext = await browser.newContext({ baseURL: "http://localhost:3000" });
  try {
    const viewer = await viewerContext.newPage();
    await viewer.goto("/ingresar");
    await viewer.getByLabel("Email", { exact: true }).fill(process.env.E2E_VIEWER_EMAIL!);
    await viewer.getByLabel("Contraseña", { exact: true }).fill(process.env.E2E_VIEWER_PASSWORD!);
    await viewer.getByRole("button", { name: "Ingresar al sistema" }).click();
    await expect(viewer).toHaveURL(/\/inicio$/, { timeout: 20000 });
    const fixtureId = process.env.E2E_COMPANY_ID!;
    await viewer.goto(`/razones-sociales/${fixtureId}`);
    await expect(viewer.getByRole("heading", { name: "Empresa autorizada QA" })).toBeVisible();
    await expect(viewer.getByRole("link", { name: "Editar datos" })).toHaveCount(0);
    const allowed = await viewer.request.get(`/api/legal-entities/${fixtureId}`);
    expect(allowed.status()).toBe(200);
    const denied = await viewer.request.patch(`/api/legal-entities/${fixtureId}`, { headers: { Origin: "http://localhost:3000" }, data: { active: false, version: 1 } });
    expect(denied.status()).toBe(403);
    const crossScope = await viewer.request.get(`/api/legal-entities/${id}`);
    expect(crossScope.status()).toBe(404);
    const openMenu = viewer.getByRole("button", { name: "Abrir menú", exact: true });
    if (await openMenu.isVisible()) await openMenu.click();
    await viewer.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
    await expect(viewer).toHaveURL(/\/ingresar$/);
    const unauthenticated = await viewer.request.get(`/api/legal-entities/${fixtureId}`);
    expect(unauthenticated.status()).toBe(401);
  } finally { await viewerContext.close(); }
});
