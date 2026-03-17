/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['@locus/shared'],
  experimental: {
    typedRoutes: true,
  },
}

module.exports = nextConfig
