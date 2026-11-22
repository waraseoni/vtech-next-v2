import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "V-Tech Service Admin",
    short_name: "V-Tech",
    description:
      "Repair jobs, sales, clients and attendance for V-Tech service operations.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0b1730",
    theme_color: "#0b1730",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
