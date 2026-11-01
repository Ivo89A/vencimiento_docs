import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/** Navigation only: every service and API must still authenticate and authorize. */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) return NextResponse.redirect(new URL("/ingresar", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/inicio/:path*", "/razones-sociales/:path*", "/estaciones/:path*", "/tiendas/:path*", "/rodados/:path*"] };
