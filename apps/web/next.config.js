/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['@locus/shared'],
  output: 'export',
  // Static export에서는 Image Optimization 비활성화
  images: { unoptimized: true },
}

module.exports = nextConfig
