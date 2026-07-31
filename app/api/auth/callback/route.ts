import { after, NextResponse, type NextRequest } from "next/server";
import { createAuthActions } from "@insforge/sdk/ssr";

import { OAUTH_CODE_VERIFIER_COOKIE } from "@/lib/auth";
import { captureServerEvent } from "@/lib/posthog-server";

function loginRedirect(request: NextRequest, reason: string): NextResponse {
  return NextResponse.redirect(
    new URL(`/login?error=${reason}`, request.nextUrl.origin),
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("insforge_code");
  const providerError = request.nextUrl.searchParams.get("error");

  if (providerError) {
    console.error("[api/auth/callback] provider returned", providerError);
    return loginRedirect(request, "oauth_failed");
  }

  if (!code) {
    return loginRedirect(request, "oauth_failed");
  }

  const codeVerifier = request.cookies.get(OAUTH_CODE_VERIFIER_COOKIE)?.value;

  if (!codeVerifier) {
    return loginRedirect(request, "session_expired");
  }

  try {
    const response = NextResponse.redirect(
      new URL("/dashboard", request.nextUrl.origin),
    );

    const auth = createAuthActions({
      requestCookies: request.cookies,
      responseCookies: response.cookies,
    });

    const { data, error } = await auth.exchangeOAuthCode(code, codeVerifier);

    if (error || !data?.user) {
      console.error("[api/auth/callback] code exchange failed", error);
      return loginRedirect(request, "oauth_failed");
    }

    response.cookies.delete(OAUTH_CODE_VERIFIER_COOKIE);

    // The conversion point, captured here rather than on the dashboard so it fires
    // exactly once per sign-in instead of once per visit.
    //
    // Inside after() so it runs once the redirect has already been sent. Awaiting it
    // inline added up to 49s to the sign-in when PostHog was unreachable — measured,
    // and captureImmediate resolves rather than rejecting, so no catch would have
    // saved it. Analytics must never sit on the auth critical path.
    after(() => captureServerEvent(data.user.id, "user_signed_in"));

    return response;
  } catch (error) {
    console.error("[api/auth/callback]", error);
    return loginRedirect(request, "oauth_failed");
  }
}
