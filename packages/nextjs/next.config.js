// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    /** Allow images from all domains
     *  @next/image
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // Wildcard for all hostnames
        pathname: "**", // Wildcard for all paths
      },
    ],
  },
  reactStrictMode: true,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has ESLint errors.
    // !! WARN !!
    ignoreDuringBuilds: true,
  },
  webpack: config => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  // Add experimental configuration for better build-time database handling
  experimental: {
    serverComponentsExternalPackages: ["pg"],
  },
};

module.exports = nextConfig;
