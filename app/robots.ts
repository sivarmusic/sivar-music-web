import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Shared by link only — never through search results.
        disallow: ["/sound-for-films", "/sound-for-films/"],
      },
    ],
  };
}
