/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React's StrictMode in development to prevent double-renders
  reactStrictMode: true,
  
  // Disable automatic static optimization for all pages
  // (enables getInitialProps on _app.js)
  // Note: This is not recommended for new apps
  // output: 'standalone',

  // Configure image domains
  images: {
    domains: [
      'www.google.com',
      'www.google.co.in',
      'logo.clearbit.com',
      's2.coinmarketcap.com',
      's3-symbol-logo.tradingview.com',
      // Add other domains as needed
    ],
    // Enable SVG imports
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Disable dev indicators in development
  devIndicators: {
    autoPrerender: false,
  },

  // Enable webpack 5
  webpack: (config, { isServer, dev }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
      };
    }

    // Add support for importing markdown files
    config.module.rules.push({
      test: /\.md$/,
      use: 'raw-loader',
    });

    // Add support for importing SVG as React components
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },

  // Environment variables that should be available on the client side
  // These must be prefixed with NEXT_PUBLIC_
  env: {
    // Example: NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // Enable static exports for static site generation
  // output: 'export',

  // Configure page extensions
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],

  // Configure headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },

  // Configure redirects
  async redirects() {
    return [
      // Example redirect
      // {
      //   source: '/old-blog/:slug',
      //   destination: '/news/:slug',
      //   permanent: true,
      // },
    ];
  },

  // Configure rewrites
  async rewrites() {
    return [
      // Example rewrite
      // {
      //   source: '/api/:path*',
      //   destination: 'https://api.example.com/:path*',
      // },
    ];
  },
};

module.exports = nextConfig;