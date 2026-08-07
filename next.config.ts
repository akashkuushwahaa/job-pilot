import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse pulls pdfjs-dist and @napi-rs/canvas, a platform-specific native
  // binding. Bundling either breaks the worker resolution pdfjs does at runtime,
  // so both are left to Node's own require from node_modules.
  // Stagehand pulls playwright-core, puppeteer-core and patchright-core for the
  // page types it accepts, plus a CDP layer that resolves its own files at
  // runtime. Bundling it drags all three browser drivers into the server build
  // for a route that only ever talks to Browserbase over a websocket.
  serverExternalPackages: [
    "pdf-parse",
    "@browserbasehq/stagehand",
    "@browserbasehq/sdk",
  ],
};

export default nextConfig;
