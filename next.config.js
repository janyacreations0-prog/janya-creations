/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep ffmpeg-static as a runtime require from node_modules (not inlined into
  // the server chunk, where its __dirname would resolve to the chunk directory
  // and the binary path would be wrong).
  serverExternalPackages: ['ffmpeg-static'],
  // Force the ffmpeg-static binary into the /admin/reels serverless function
  // trace (Next.js cannot statically detect it because ffmpeg-static resolves
  // the binary path dynamically via os.platform()).
  outputFileTracingIncludes: {
    '/admin/reels': ['./node_modules/ffmpeg-static/*'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'minpwemkqlfpjwlvltlq.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

module.exports = nextConfig;