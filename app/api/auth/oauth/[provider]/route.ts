import { createAuthActions } from "@insforge/sdk/ssr";
import { NextResponse, type NextRequest } from "next/server";

const allowedProviders = new Set(["google", "github"]);
const verifierCookieName = "jobpilot_oauth_code_verifier";

type RouteContext = {
  params: Promise<{
    provider: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const loginUrl = new URL("/login", request.url);

  try {
    const { provider } = await context.params;
    const normalizedProvider = provider.toLowerCase();

    if (!allowedProviders.has(normalizedProvider)) {
      loginUrl.searchParams.set("error", "provider");
      return NextResponse.redirect(loginUrl);
    }

    const auth = createAuthActions({ requestCookies: request.cookies });
    const { data, error } = await auth.signInWithOAuth(normalizedProvider, {
      redirectTo: new URL("/api/auth/callback", request.nextUrl.origin).toString(),
      skipBrowserRedirect: true,
    });

    if (error || !data?.url || !data?.codeVerifier) {
      console.error("[api/auth/oauth]", error);
      loginUrl.searchParams.set("error", "oauth");
      return NextResponse.redirect(loginUrl);
    }

    const response = NextResponse.redirect(data.url);
    response.cookies.set(verifierCookieName, data.codeVerifier, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    return response;
  } catch (error) {
    console.error("[api/auth/oauth]", error);
    loginUrl.searchParams.set("error", "oauth");
    return NextResponse.redirect(loginUrl);
  }
}
