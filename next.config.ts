import type { NextConfig } from "next";
import { execSync } from "node:child_process";

/** Commit the deployment was built from, shown in the footer so users can inspect that exact source. */
function buildSha(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_SHA: buildSha(),
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.cipherswap.app' }],
        destination: 'https://cipherswap.app/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
