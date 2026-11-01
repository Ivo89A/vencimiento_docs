import { expect, test } from "@playwright/test";

test("login accesible y protección de navegación", async ({ page }) => {
  await page.goto("/razones-sociales");
  await expect(page).toHaveURL(/\/ingresar$/);
  await expect(page.getByRole("heading", { name: "Ingresá a tu cuenta" })).toBeVisible();
  await page.getByRole("button", { name: "Ingresar al sistema" }).click();
  await expect(page.getByText("Ingresá un email válido.")).toBeVisible();
  await expect(page.getByText("Ingresá tu contraseña.")).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", await page.locator("body").evaluate((body) => body.clientWidth));
});

test("recuperación y enlace inválido", async ({ page }) => {
  await page.goto("/ingresar");
  await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
  await expect(page.getByRole("heading", { name: "Recuperá tu acceso" })).toBeVisible();
  await page.goto("/restablecer-acceso");
  await expect(page.getByText("El enlace no es válido.")).toBeVisible();
});
