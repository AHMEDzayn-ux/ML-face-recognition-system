/** @type {import('next').NextConfig} */

// Simplified config without PWA plugin dependency
const nextConfig = {
  reactStrictMode: true,
  turbopack: {}, // Silence Turbopack warning
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ykrbllmjrevriecowlnr.supabase.co',
      },
    ],
  },
  headers: async () => {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600'
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/'
          }
        ]
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig

