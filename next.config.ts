import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'commons.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
      {
        protocol: 'https',
        hostname: 'www.themoviedb.org',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'archive.org',
      },
      {
        protocol: 'http',
        hostname: 'archive.org',
      },
      {
        protocol: 'https',
        hostname: 'ia800100.us.archive.org',
      },
      {
        protocol: 'https',
        hostname: 'ia601400.us.archive.org',
      },
      {
        protocol: 'https',
        hostname: '**.archive.org',
      },
      {
        protocol: 'https',
        hostname: 's.ltrbxd.com',
      },
      {
        protocol: 'https',
        hostname: 'a.ltrbxd.com',
      },
      {
        protocol: 'https',
        hostname: '*.letterboxd.com',
      },
    ],
  },
};

export default nextConfig;
