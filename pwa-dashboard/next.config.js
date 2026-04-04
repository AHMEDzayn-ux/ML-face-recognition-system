/** @type {import('next').NextConfig} */

// Try to load PWA plugin if installed, otherwise skip
let withPWA;
try {
  withPWA = require('@ducanh2912/next-pwa').default({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
  });
} catch (e) {
  console.log('⚠️  PWA plugin not installed yet. Run install-deps.bat first!');
  withPWA = (config) => config; // No-op wrapper
}

const nextConfig = {
  reactStrictMode: true,
  turbopack: {}, // Silence Turbopack warning
  allowedDevOrigins: ['10.202.12.214'], // Allow mobile access
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ykrbllmjrevriecowlnr.supabase.co',
      },
    ],
  },
}

module.exports = withPWA(nextConfig)
