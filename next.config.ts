import type { NextConfig } from "next";

// Hosted on GitHub Pages at https://t3dy.github.io/AlchemyBG/, which serves
// plain files from a repo subpath — hence the static export, the basePath, and
// the unoptimized images (the Next image optimizer needs a server).
// Local `next dev` keeps the root path and normal behaviour.
const onPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  basePath: onPages ? "/AlchemyBG" : "",
  assetPrefix: onPages ? "/AlchemyBG/" : "",
  images: { unoptimized: true },
  // Pages has no rewrite layer, so /route must resolve to /route/index.html.
  trailingSlash: true,
};

export default nextConfig;
