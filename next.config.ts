import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse pulls pdfjs-dist and @napi-rs/canvas, a platform-specific native
  // binding. Bundling either breaks the worker resolution pdfjs does at runtime,
  // so both are left to Node's own require from node_modules.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
