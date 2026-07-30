/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_DEPOSIT_PERCENTAGE: process.env.DEPOSIT_PERCENTAGE || "30",
  },
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
