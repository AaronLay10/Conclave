import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Conclave",
    short_name: "Conclave",
    description: "Kingdom event planning and coordination",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a101a",
    theme_color: "#b88a2a"
  };
}
