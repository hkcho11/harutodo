import nextConfig from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  { ignores: [".tmp-portfolio/**", "public/sw.js", "public/workbox-*.js", "public/worker-*.js", "public/fallback-*.js", "supabase/functions/**", "worker/**"] },
  ...nextConfig,
  ...nextTs,
];

export default eslintConfig;
