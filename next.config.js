/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Railway 환경에서 네트워크 행(hang) 방지
    mcpServer: false,
  },
};

module.exports = nextConfig;
