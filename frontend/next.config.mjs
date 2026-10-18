const api = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [{ protocol: api.protocol.replace(':', ''), hostname: api.hostname, port: api.port, pathname: '/static/**' }],
  },
};

export default nextConfig;
