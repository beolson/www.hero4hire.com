import path from "node:path";
import { createMDX } from "fumadocs-mdx/next";

const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  // Next's default CLI type-checker does not capture TypeScript's output in
  // this project. TypeScript 5.x still provides the compiler API, so use it.
  experimental: {
    useTypeScriptCli: false,
  },
  turbopack: {
    root: path.join(import.meta.dirname, ".."),
  },
};

export default createMDX()(nextConfig);
