import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const isGithubPages = process.env.GITHUB_PAGES === "true";
const repositoryName = "email_authentication_visualizer";

const nextConfig: NextConfig = {
  ...(isGithubPages
    ? {
        output: "export" as const,
        basePath: `/${repositoryName}`,
        assetPrefix: `/${repositoryName}/`,
        trailingSlash: true,
      }
    : {}),
  turbopack: {
    root: dirname,
  },
};

export default nextConfig;
