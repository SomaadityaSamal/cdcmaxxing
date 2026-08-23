import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.fairprice.com.sg" },
      { protocol: "https", hostname: "media.nedigital.sg" },
      { protocol: "https", hostname: "**.shengsiong.com.sg" },
      { protocol: "https", hostname: "ssecomm.s3.ap-southeast-1.amazonaws.com" },
      { protocol: "https", hostname: "**.venusbeauty.com.sg" },
      { protocol: "https", hostname: "images.unsplash.com" }
    ]
  }
};

export default nextConfig;
