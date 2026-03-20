/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mongoose', 'bcryptjs'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'generativelanguage.googleapis.com' },
    ],
  },
  async headers() {
    return [];
  },
  async redirects() {
    return [];
  },
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;
