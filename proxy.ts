import {
  updateSession,
  type CookieStore,
  type CookieOptions,
} from "@insforge/sdk/ssr/middleware";
import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes = [
  "/dashboard",
  "/profile",
  "/find-jobs",
];

function isProtectedPath(pathname: string) {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function createRequestCookieStore(request: NextRequest): CookieStore {
  return {
    get(name: string) {
      return request.cookies.get(name);
    },
    set(
      nameOrOptions: string | ({ name: string; value: string } & CookieOptions),
      value?: string,
    ) {
      if (typeof nameOrOptions === "string") {
        request.cookies.set(nameOrOptions, value ?? "");
        return;
      }

      request.cookies.set({
        name: nameOrOptions.name,
        value: nameOrOptions.value,
      });
    },
    delete(nameOrOptions: string | ({ name: string } & CookieOptions)) {
      request.cookies.delete(
        typeof nameOrOptions === "string" ? nameOrOptions : nameOrOptions.name,
      );
    },
  };
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { accessToken } = await updateSession({
    requestCookies: createRequestCookieStore(request),
    responseCookies: response.cookies,
  });
  const { pathname } = request.nextUrl;

  if (isProtectedPath(pathname) && !accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && accessToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
