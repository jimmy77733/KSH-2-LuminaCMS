import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * standalone 模式：next build 產出 .next/standalone/server.js，
   * 可在不安裝全部 node_modules 的情況下運行，適合 Electron 打包。
   * 不影響 next dev 開發流程。
   */
  output: "standalone",
};

export default nextConfig;
