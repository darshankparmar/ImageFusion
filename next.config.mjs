/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        // Ensure the edge runtime is not used for our binary API route
    },
};

export default nextConfig;
