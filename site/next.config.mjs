import { createMDX } from "fumadocs-mdx/next";
import path from "node:path";

const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  turbopack: {
    root: path.join(import.meta.dirname, ".."),
  },
};

export default createMDX()(nextConfig);
