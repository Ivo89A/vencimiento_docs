import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getRuntimeEnv } from "@/lib/env";

const globalDatabase = globalThis as unknown as { gestionDatabase?: PrismaClient };

/** Lazy: build/type generation never needs a database connection or a fallback secret. */
export function getDatabase(): PrismaClient {
  if (!globalDatabase.gestionDatabase) {
    const env = getRuntimeEnv();
    globalDatabase.gestionDatabase = new PrismaClient({
      adapter: new PrismaPg({ connectionString: env.DATABASE_URL, max: 10, connectionTimeoutMillis: 5000 }),
    });
  }
  return globalDatabase.gestionDatabase;
}
