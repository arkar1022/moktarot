/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      '/api/natal': ['./public/ephe/**/*']
    }
  }
};

export default nextConfig;
