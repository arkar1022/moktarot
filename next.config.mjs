/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sweph'],
    outputFileTracingIncludes: {
      '/api/natal': [
        './public/ephe/**/*',
        './node_modules/sweph/build/**/*'
      ]
    }
  }
};

export default nextConfig;
