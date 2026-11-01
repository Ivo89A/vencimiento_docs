import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { clearTestRateLimits } from "./support/isolated-database";

async function capture(page: Page, info: TestInfo, name: string) {
  const hasModal = await page.locator("dialog[open]").count() > 0;
  if (hasModal) await expect(page.locator("dialog[open]")).toBeVisible();
  else await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("status", { name: "Cargando información…", exact: true })).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", await page.locator("body").evaluate((body) => body.clientWidth));
  // The default caret hiding mutates input style attributes before delayed hydration.
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: !hasModal, animations: "disabled", caret: "initial", style: "nextjs-portal { visibility: hidden; }" });
}

test("interfaz: rutas existentes, responsive, foco modal y movimiento reducido", async ({ page }, info) => {
  test.skip(!process.env.E2E_ADMIN_EMAIL, "Requiere fixtures aisladas: npm run verify:postgres.");
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error" && /hydrat|didn't match/i.test(message.text())) errors.push(message.text()); });
  await clearTestRateLimits();
  await page.goto("/ingresar");
  await capture(page, info, "login");
  await page.getByLabel("Contraseña", { exact: true }).fill("password-visibility-check");
  await page.getByRole("button", { name: "Mostrar contraseña", exact: true }).click();
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Ocultar contraseña", exact: true }).click();
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAttribute("type", "password");
  await page.goto("/recuperar-acceso");
  await capture(page, info, "recuperacion");
  await page.goto("/restablecer-acceso");
  await capture(page, info, "enlace-invalido");
  await page.goto("/restablecer-acceso?token=qa-visual-no-submit");
  await capture(page, info, "nueva-contrasena");
  await page.goto("/ingresar");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel("Contraseña", { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Ingresar al sistema", exact: true }).click();
  await expect(page).toHaveURL(/\/inicio$/);

  const headers = { Origin: "http://localhost:3000" };
  const response = await page.request.post("/api/stations", { headers, data: {
    name: `Estación de revisión visual ${info.project.name}`, code: `VISUAL-${info.project.name}`,
    legalEntityId: process.env.E2E_COMPANY_ID, operationalStatus: "OPERATIONAL",
    address: "Calle de pruebas 123", province: "Buenos Aires", locality: "La Plata", responsible: "Responsable QA", email: "", phone: "",
  } });
  expect(response.status()).toBe(201);
  const stationId = (await response.json()).data.id as string;
  const typeResponse = await page.request.get("/api/document-types");
  expect(typeResponse.status()).toBe(200);
  const typeId = (await typeResponse.json()).data.items[0]?.id as string | undefined;
  const companyId = process.env.E2E_COMPANY_ID!;
  const routes = [
    ["inicio", "/inicio"], ["empresas", "/razones-sociales"], ["empresa-nueva", "/razones-sociales/nueva"],
    ["empresa-detalle", `/razones-sociales/${companyId}`], ["empresa-editar", `/razones-sociales/${companyId}/editar`],
    ["estaciones", "/estaciones"], ["estacion-nueva", "/estaciones/nueva"],
    ["estacion-detalle", `/estaciones/${stationId}`], ["estacion-editar", `/estaciones/${stationId}/editar`],
    ["historial", `/estaciones/${stationId}?vista=historial`], ["documentacion", "/documentacion"],
    ["catalogo", "/documentacion/tipos"], ["tipo-nuevo", "/documentacion/tipos/nuevo"],
    ...(typeId ? [["tipo-editar", `/documentacion/tipos/${typeId}/editar`]] : []),
    ["sin-resultados", "/razones-sociales?q=sin-resultados-qa-visual"], ["no-encontrado", "/ruta-no-existente-qa"],
  ];
  for (const [name, route] of routes) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await capture(page, info, name);
  }
  await page.goto(`/estaciones/${stationId}`);
  await page.getByRole("button", { name: "Desactivar", exact: true }).click();
  const confirmation = page.getByRole("dialog");
  await expect(confirmation).toBeVisible();
  await expect(confirmation.getByRole("button", { name: "Cancelar", exact: true })).toBeFocused();
  await capture(page, info, "confirmacion");
  await page.keyboard.press("Escape");
  await expect(confirmation).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Desactivar", exact: true })).toBeFocused();

  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/inicio");
    await capture(page, info, `inicio-${width}`);
    if (width < 1024) {
      const trigger = page.getByRole("button", { name: "Abrir menú", exact: true });
      await trigger.click();
      const menu = page.getByRole("dialog", { name: "Navegación principal", exact: true });
      await expect(menu).toBeVisible();
      await capture(page, info, `menu-${width}`);
      await page.keyboard.press("Escape");
      await expect(menu).not.toBeVisible();
      await expect(trigger).toBeFocused();
    }
    await page.goto("/razones-sociales");
    await capture(page, info, `empresas-${width}`);
  }
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await expect(page).toHaveURL(/\/ingresar$/);
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_VIEWER_EMAIL!);
  await page.getByLabel("Contraseña", { exact: true }).fill(process.env.E2E_VIEWER_PASSWORD!);
  await page.getByRole("button", { name: "Ingresar al sistema", exact: true }).click();
  await expect(page).toHaveURL(/\/inicio$/);
  await capture(page, info, "visualizador-inicio");
  await page.goto("/razones-sociales");
  await expect(page.getByRole("link", { name: "Nueva razón social", exact: true })).toHaveCount(0);
  await capture(page, info, "visualizador-empresas");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/documentacion");
  await capture(page, info, "visualizador-documentacion-movil");
  await page.goto("/documentacion/tipos/nuevo");
  await expect(page.getByRole("heading", { name: "No tenés permiso para acceder", exact: true })).toBeVisible();
  await capture(page, info, "permiso-restringido");
  expect(errors).toEqual([]);
});
