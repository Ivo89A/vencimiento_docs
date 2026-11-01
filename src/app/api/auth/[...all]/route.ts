import { getAuth } from "@/domains/auth/auth";
import { apiResponse } from "@/lib/http";

export const runtime = "nodejs";

async function handler(request: Request) {
  try { return await getAuth().handler(request); }
  catch (error) { return apiResponse(async () => { throw error; }); }
}

export { handler as GET, handler as POST };
