import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

const PUBLIC_PATHS = new Set(["/login", "/api/health", "/api/vitals"]);

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith("/login/");
}

function supabaseOrigins() {
  const { url } = getPublicEnv();
  try {
    const parsed = new URL(url);
    return { origin: parsed.origin, socket: `wss://${parsed.host}` };
  } catch {
    return { origin: "", socket: "" };
  }
}

/**
 * Nonce CSP (Next 16 auto-applies the nonce to framework and page scripts when
 * the CSP header is on the request). `style-src` allows inline styles because
 * charts/avatars use React style attributes; scripts stay nonce + strict-dynamic.
 */
function buildCsp(nonce: string) {
  const isDev = process.env.NODE_ENV === "development";
  const { origin, socket } = supabaseOrigins();

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data:${origin ? ` ${origin}` : ""}`,
    "font-src 'self'",
    `connect-src 'self'${origin ? ` ${origin} ${socket}` : ""}${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const headersFor = () => {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("content-security-policy", csp);
    return headers;
  };

  const withCsp = (response: NextResponse) => {
    response.headers.set("Content-Security-Policy", csp);
    return response;
  };

  const forward = () =>
    withCsp(NextResponse.next({ request: { headers: headersFor() } }));

  if (isPublicPath(pathname)) {
    return forward();
  }

  let response = forward();
  const { url, key } = getPublicEnv();

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = forward();
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", `${pathname}${search}`);
    }
    return withCsp(NextResponse.redirect(loginUrl));
  }

  return withCsp(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
