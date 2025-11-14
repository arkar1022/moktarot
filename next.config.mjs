/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      '/api/natal': [
        './public/ephe/**/*',
        './node_modules/sweph/build/Release/sweph.node'
      ]
    }
  }
};

export default nextConfig;
