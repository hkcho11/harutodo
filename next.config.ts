import type { NextConfig } from "next";
import withPWA, { runtimeCaching as defaultRuntimeCaching } from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  // Isolate local integration/dev builds without touching a running checkout's .next.
  distDir: process.env.HARUTODO_BUILD_DIR ?? ".next",
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.1.53"],
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  customWorkerSrc: "worker",
  workboxOptions: {
    skipWaiting: true,
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: ({ url }) => /\/(?:api\/)?feedback(?:\/|$)/.test(url.pathname) || /\/rest\/v1\/(?:rpc\/)?[^/]*feedback[^/]*(?:\/|$)/.test(url.pathname) || url.pathname.includes("/feedback-images/"),
        handler: "NetworkOnly",
      },
      ...defaultRuntimeCaching,
    ],
  },
})(nextConfig);
