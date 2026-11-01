import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { clearTestRateLimits } from "./support/isolated-database";

test("recuperación SMTP real, token de un uso y revocación de sesiones", async ({ page }, info) => {
  test.skip(!process.env.E2E_RESET_PASSWORD, "Requiere SMTP y PostgreSQL aislados: npm run verify:postgres.");
  const email = `reset-${info.project.name}@example.invalid`;
  const password = process.env.E2E_RESET_PASSWORD!;
  const newPassword = randomUUID() + randomUUID();
  await clearTestRateLimits();
  try {
    const oldLogin = await page.request.post("/api/auth/sign-in/email", {
      headers: { Origin: "http://localhost:3000" }, data: { email, password },
    });
    expect(oldLogin.status()).toBe(200);
    await page.goto("/recuperar-acceso");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Solicitar enlace" }).click();
    await expect(page.getByRole("status")).toContainText("Si la cuenta existe");
    let recoveryUrl = "";
    await expect.poll(async () => {
      for (const filename of await readdir(process.env.E2E_MAILBOX_DIR!)) {
        const message = JSON.parse(await readFile(join(process.env.E2E_MAILBOX_DIR!, filename), "utf8")) as { recipients: string[]; text: string };
        if (message.recipients.includes(email)) recoveryUrl = message.text.match(/https?:\/\/[^\s]+/)?.[0] ?? "";
      }
      return recoveryUrl.length > 0;
    }, { timeout: 15000, message: "Se esperaba correo en el SMTP local de pruebas, sin imprimir el token" }).toBe(true);
    await page.goto(recoveryUrl);
    await page.getByLabel("Nueva contraseña", { exact: true }).fill(newPassword);
    await page.getByLabel("Repetí la contraseña", { exact: true }).fill(newPassword);
    await page.getByRole("button", { name: "Guardar contraseña" }).click();
    await expect(page.getByRole("status")).toHaveText("Contraseña actualizada. Ya podés ingresar.");
    const revoked = await page.request.get(`/api/legal-entities/${process.env.E2E_COMPANY_ID}`);
    expect(revoked.status()).toBe(401);
    const oldPassword = await page.request.post("/api/auth/sign-in/email", {
      headers: { Origin: "http://localhost:3000" }, data: { email, password },
    });
    expect(oldPassword.status()).toBe(401);
    await page.goto("/ingresar");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(newPassword);
    await page.getByRole("button", { name: "Ingresar al sistema" }).click();
    await expect(page).toHaveURL(/\/inicio$/);
    await page.goto(recoveryUrl);
    await expect(page.getByText("El enlace no es válido.")).toBeVisible();
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      const result = await page.request.post("/api/auth/sign-in/email", {
        headers: { Origin: "http://localhost:3000" }, data: { email, password: "incorrect-for-rate-limit-test" },
      });
      statuses.push(result.status());
    }
    expect(statuses).toContain(429);
  } finally { await clearTestRateLimits(); }
});
