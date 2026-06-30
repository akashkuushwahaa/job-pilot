import {
  clearAuthCookies,
  createServerClient,
  setAuthCookies,
} from "@insforge/sdk/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPostLoginRedirectPath } from "@/lib/auth";

const verifierCookieName = "jobpilot_oauth_code_verifier";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const loginUrl = new URL("/login", request.url);

  try {
    const code = request.nextUrl.searchParams.get("insforge_code");
    const oauthError = request.nextUrl.searchParams.get("error");
    const codeVerifier = request.cookies.get(verifierCookieName)?.value;

    if (oauthError || !code || !codeVerifier) {
      loginUrl.searchParams.set("error", "callback");
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(verifierCookieName);
      clearAuthCookies(response.cookies);
      return response;
    }

    const insforge = createServerClient();
    const { data, error } = await insforge.auth.exchangeOAuthCode(
      code,
      codeVerifier,
    );

    if (error || !data?.accessToken || !data.user) {
      console.error("[api/auth/callback]", error);
      loginUrl.searchParams.set("error", "callback");
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(verifierCookieName);
      clearAuthCookies(response.cookies);
      return response;
    }

    const redirectPath = await getPostLoginRedirectPath(
      data.user.id,
      data.accessToken,
    );
    const response = NextResponse.redirect(new URL(redirectPath, request.url));
    response.cookies.delete(verifierCookieName);
    setAuthCookies(response.cookies, {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });

    return response;
  } catch (error) {
    console.error("[api/auth/callback]", error);
    loginUrl.searchParams.set("error", "callback");
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(verifierCookieName);
    clearAuthCookies(response.cookies);
    return response;
  }
}
