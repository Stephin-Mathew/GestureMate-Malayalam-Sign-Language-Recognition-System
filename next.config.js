/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: require('path').join(__dirname),
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
      };
    }

    return config;
  },
};

module.exports = nextConfig;
