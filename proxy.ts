import { NextResponse, type NextRequest } from "next/server";
import {
  getAccessTokenCookieName,
  updateSession,
  type CookieOptions,
  type CookieStore,
} from "@insforge/sdk/ssr/middleware";

const PROTECTED_PREFIXES = ["/dashboard", "/profile", "/find-jobs"] as const;

// Next's request cookie jar takes no attributes on set(), so it does not satisfy
// the SDK's CookieStore. updateSession writes the refreshed token back into the
// request jar so Server Components see it on this same pass — the writes have to
// land, they cannot be stubbed out. Attributes are dropped because request
// cookies carry none.
function toCookieStore(cookies: NextRequest["cookies"]): CookieStore {
  return {
    get: (name: string) => cookies.get(name),
    set: (
      nameOrOptions: string | ({ name: string; value: string } & CookieOptions),
      value?: string,
    ) => {
      if (typeof nameOrOptions === "string") {
        cookies.set(nameOrOptions, value ?? "");
        return;
      }
      cookies.set(nameOrOptions.name, nameOrOptions.value);
    },
    delete: (nameOrOptions: string | { name: string }) => {
      cookies.delete(
        typeof nameOrOptions === "string" ? nameOrOptions : nameOrOptions.name,
      );
    },
  };
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// Carries any cookies refreshed by updateSession onto the redirect we return
// instead, so a refresh is never lost to a redirect.
function redirectPreservingCookies(
  source: NextResponse,
  request: NextRequest,
  pathname: string,
): NextResponse {
  const redirectResponse = NextResponse.redirect(
    new URL(pathname, request.nextUrl.origin),
  );

  for (const cookie of source.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }

  return redirectResponse;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request });

  let refreshedAccessToken: string | null = null;

  try {
    const result = await updateSession({
      requestCookies: toCookieStore(request.cookies),
      responseCookies: response.cookies,
    });
    refreshedAccessToken = result.accessToken;
  } catch (error) {
    console.error("[proxy] updateSession", error);
  }

  const hasSession = Boolean(
    refreshedAccessToken ??
      request.cookies.get(getAccessTokenCookieName())?.value,
  );

  const { pathname } = request.nextUrl;

  // Only ever redirects *towards* /login. Sending a session-looking request from
  // /login to /dashboard belongs to the login page, not here: updateSession trusts
  // the JWT's exp without asking the backend, so a token that is unexpired but
  // rejected (backend down, session revoked, user deleted, secret rotated) looks
  // valid to this check while requireUser() correctly bounces to /login. Redirecting
  // both ways on two different sources of truth is an infinite loop.
  if (!hasSession && isProtectedPath(pathname)) {
    return redirectPreservingCookies(response, request, "/login");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
