import nextConfig from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  { ignores: ["public/sw.js", "public/workbox-*.js", "public/worker-*.js", "public/fallback-*.js"] },
  ...nextConfig,
  ...nextTs,
];

export default eslintConfig;
