import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const routes = ["/", "/about", "/products", "/price-list", "/contact", "/why-frozen-food"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: path === "/price-list" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
