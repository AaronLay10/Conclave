import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RoK Events Command",
    short_name: "RoK Events",
    description: "Kingdom event planning and communication command center",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a101a",
    theme_color: "#b88a2a"
  };
}
