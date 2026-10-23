const api = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Saída enxuta para container: o runtime leva só o necessário para servir a aplicação.
  output: 'standalone',
  images: {
    remotePatterns: [{ protocol: api.protocol.replace(':', ''), hostname: api.hostname, port: api.port, pathname: '/static/**' }],
  },
};

export default nextConfig;
