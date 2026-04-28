/** @type {import('next').NextConfig} */
const nextConfig = {
  // Node.js runtime for all API routes (no edge runtime)
  experimental: {},
  // Railway 등 컨테이너 배포 시 standalone 모드 사용
  output: 'standalone',
};

module.exports = nextConfig;
