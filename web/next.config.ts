import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone output = small self-contained server for the Docker image (deploy/)
  output: "standalone",
  // postgres opens raw TCP sockets; keep it out of the bundler
  serverExternalPackages: ["postgres", "unpdf", "linkedom"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
