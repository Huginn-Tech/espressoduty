/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Nothing uses next/image; keep the optimizer endpoint inert.
  images: { unoptimized: true },
};

export default nextConfig;
