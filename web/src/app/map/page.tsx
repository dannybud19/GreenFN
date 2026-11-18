import type { Metadata } from "next";
import { MapView } from "@/components/MapView";

export const metadata: Metadata = { title: "Map" };

export default function MapPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">The map of seasons</h1>
      <p className="mb-4 mt-1 text-muted">Every season in the data as a point. Seasons that sit close together were played in a similar style.</p>
      <MapView />
    </div>
  );
}
