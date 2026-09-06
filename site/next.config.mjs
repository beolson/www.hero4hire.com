import { createMDX } from "fumadocs-mdx/next";
import path from "node:path";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  turbopack: {
    root: path.join(import.meta.dirname, ".."),
  },
};

export default createMDX()(nextConfig);
