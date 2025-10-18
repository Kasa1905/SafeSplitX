/**
 * Next.js Configuration for SafeSplitX Frontend
 * @type {import('next').NextConfig}
 */

const nextConfig = {
  // Basic configuration
  reactStrictMode: true,
  swcMinify: true,
  
  // Environment variables to expose to the browser
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5000',
  },

  // API routes configuration
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/:path*`,
      },
    ];
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // Image optimization
  images: {
    domains: [
      'localhost',
      'res.cloudinary.com', // For Cloudinary image uploads
      'avatars.githubusercontent.com', // For GitHub avatars
      'lh3.googleusercontent.com', // For Google avatars
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Bundle analyzer
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('@next/bundle-analyzer')();
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
        })
      );
    }

    // Handle SVGs as React components
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },

  // Experimental features
  experimental: {
    // App directory (Next.js 13+)
    appDir: false, // Set to true if using app directory structure
    
    // Server components
    serverComponentsExternalPackages: [],
  },

  // TypeScript configuration
  typescript: {
    // Ignore type errors during build (not recommended for production)
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Ignore ESLint errors during build (not recommended)
    ignoreDuringBuilds: false,
    dirs: ['pages', 'components', 'utils', 'hooks'],
  },

  // Compression
  compress: true,

  // PoweredByHeader
  poweredByHeader: false,

  // Generate build ID
  generateBuildId: async () => {
    // Use git commit hash or timestamp
    return process.env.GIT_HASH || Date.now().toString();
  },

  // Internationalization (if needed)
  // i18n: {
  //   locales: ['en', 'es', 'fr'],
  //   defaultLocale: 'en',
  // },

  // Redirects
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },

  // Output configuration for static export if needed
  // output: 'export',
  // trailingSlash: true,

  // Custom page extensions
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],

  // Runtime configuration
  publicRuntimeConfig: {
    // Will be available on both server and client
    appVersion: process.env.npm_package_version,
  },

  serverRuntimeConfig: {
    // Will only be available on the server side
    mySecret: process.env.MY_SECRET,
  },
};

// Bundle analyzer setup
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);