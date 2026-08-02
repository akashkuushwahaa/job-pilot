import { lookup } from "node:dns/promises";

import { safeExternalUrl } from "@/lib/utils";

// Redirects are followed by hand rather than by `redirect: "follow"`, because
// every hop has to be re-checked. A URL that passes the host check can still
// answer 302 to http://169.254.169.254, and fetch would follow it without
// asking anyone.
const MAX_REDIRECTS = 5;

// Loopback, link-local, and every RFC 1918 range, plus the carrier-grade NAT
// block. 169.254.169.254 is the one that matters most — it is the cloud
// instance metadata endpoint on AWS, GCP and Azure, and it answers credentials
// to anything inside the network that asks.
function isPrivateIPv4(address: string): boolean {
  const parts = address.split(".").map((part) => Number.parseInt(part, 10));

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false;
  }

  const [a, b] = parts;

  if (a === 0 || a === 127) return true; // this host, loopback
  if (a === 10) return true; // RFC 1918
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC 1918
  if (a === 192 && b === 168) return true; // RFC 1918
  if (a === 169 && b === 254) return true; // link-local, incl. metadata
  if (a === 100 && b >= 64 && b <= 127) return true; // RFC 6598 CGNAT
  if (a >= 224) return true; // multicast and reserved

  return false;
}

function isPrivateIPv6(address: string): boolean {
  const value = address.toLowerCase().split("%")[0];

  if (value === "::" || value === "::1") return true; // unspecified, loopback

  // IPv4-mapped (::ffff:10.0.0.1) and IPv4-compatible forms tunnel the whole
  // v4 problem through a v6 literal.
  const mapped = value.match(/^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/);

  if (mapped !== null) return isPrivateIPv4(mapped[1]);

  if (value.startsWith("fe80:")) return true; // link-local

  // fc00::/7 — unique local addresses.
  const first = value.split(":")[0];

  if (first.length > 0) {
    const leading = Number.parseInt(first.padStart(4, "0").slice(0, 2), 16);

    if (!Number.isNaN(leading) && (leading & 0xfe) === 0xfc) return true;
  }

  return false;
}

function isPrivateAddress(address: string): boolean {
  return address.includes(":")
    ? isPrivateIPv6(address)
    : isPrivateIPv4(address);
}

// Hostnames that never belong to a third party job posting. A bare label with
// no dot is always internal — "localhost", but also a Docker service name or a
// Kubernetes short name.
function isInternalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");

  if (!host.includes(".")) return true;

  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".home.arpa") ||
    host.endsWith(".in-addr.arpa")
  );
}

// Resolution, not just parsing. A hostname that looks perfectly ordinary can
// resolve to a private address — that is the whole DNS-rebinding trick — so the
// check has to run against what the name actually points at, and every address
// it points at.
async function isPublicHost(hostname: string): Promise<boolean> {
  const host = hostname.replace(/^\[|\]$/g, "");

  if (isInternalHostname(host)) return false;

  // A literal address needs no lookup, and passing one to dns.lookup would
  // simply echo it back.
  if (/^[\d.]+$/.test(host) || host.includes(":")) {
    return !isPrivateAddress(host);
  }

  try {
    const addresses = await lookup(host, { all: true });

    if (addresses.length === 0) return false;

    return addresses.every((entry) => !isPrivateAddress(entry.address));
  } catch {
    // A name that will not resolve is not a name worth fetching.
    return false;
  }
}

export type SafeFetchResult = {
  response: Response;
  finalUrl: string;
};

// A fetch for URLs the app did not author.
//
// `jobs.source_url` arrives from Adzuna, but the column is writable by any
// authenticated user under the `jobs_owner` RLS policy — so a crafted row could
// point this at the cloud metadata endpoint or at a service on the app's own
// network, and the research agent would fetch it, structure the response with
// GPT-4o and render it back on the job details page. Scheme-checking alone does
// not stop that; `safeExternalUrl` answers "is this linkable", this answers "is
// this fetchable from our server".
//
// Returns null rather than throwing, and never says why to the caller: a
// blocked host and a dead host lead to the same degraded path.
export async function safeFetchExternal(
  startUrl: string,
  init: RequestInit,
): Promise<SafeFetchResult | null> {
  let current = safeExternalUrl(startUrl);

  if (current === null) return null;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    let parsed: URL;

    try {
      parsed = new URL(current);
    } catch {
      return null;
    }

    if (!(await isPublicHost(parsed.hostname))) {
      console.error("[lib/safe-fetch] refused a non-public host");
      return null;
    }

    let response: Response;

    try {
      response = await fetch(current, { ...init, redirect: "manual" });
    } catch (error) {
      console.error("[lib/safe-fetch] request failed", error);
      return null;
    }

    const location = response.headers.get("location");

    if (response.status >= 300 && response.status < 400 && location !== null) {
      let next: string;

      try {
        next = new URL(location, current).toString();
      } catch {
        return null;
      }

      // Only http(s) survives a redirect. A hop to file: or data: is not a
      // posting, it is an attempt.
      const safeNext = safeExternalUrl(next);

      if (safeNext === null) {
        console.error("[lib/safe-fetch] refused a redirect scheme");
        return null;
      }

      current = safeNext;
      continue;
    }

    return { response, finalUrl: current };
  }

  console.error("[lib/safe-fetch] too many redirects");
  return null;
}
