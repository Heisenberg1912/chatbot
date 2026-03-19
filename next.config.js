/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mongoose', 'bcryptjs'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'generativelanguage.googleapis.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: '*' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
    ];
  },
  async redirects() {
    return [];
  },
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;
