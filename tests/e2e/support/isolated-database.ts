import { Client } from "pg";

/** Fixture cleanup only; production rate limits stay enabled and unchanged. */
export async function clearTestRateLimits() {
  const url = process.env.E2E_DATABASE_URL;
  if (!url || !new URL(url).pathname.endsWith("/gestion_e2e_test") || new URL(url).hostname !== "127.0.0.1") {
    throw new Error("RATE_LIMIT_FIXTURE_REQUIRES_ISOLATED_LOCAL_TEST_DATABASE");
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try { await client.query("DELETE FROM rate_limits"); }
  finally { await client.end(); }
}
