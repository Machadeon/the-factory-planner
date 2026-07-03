import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  images: {
    // Custom loader (not `unoptimized`): `unoptimized` skips the loader and emits
    // the raw src without `basePath`, breaking images under a subpath deploy.
    loader: "custom",
    loaderFile: "./image-loader.ts",
  },
};

export default nextConfig;
