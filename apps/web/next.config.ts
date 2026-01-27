import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@tractus/database'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig
