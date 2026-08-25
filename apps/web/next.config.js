/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@japanese-learning/contracts', '@japanese-learning/shared'],
};

module.exports = nextConfig;
