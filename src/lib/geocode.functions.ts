import { createServerFn } from "@tanstack/react-start";

/** Geocode a free-form location string (city / ZIP / address) using Google Maps via the connector gateway. */
export const geocodeLocation = createServerFn({ method: "POST" })
  .inputValidator((data: { query: string }) => {
    if (!data || typeof data.query !== "string" || !data.query.trim()) {
      throw new Error("query is required");
    }
    if (data.query.length > 200) throw new Error("query too long");
    return { query: data.query.trim() };
  })
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const gmKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !gmKey) throw new Error("Google Maps connector not configured");

    const url = `https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json?address=${encodeURIComponent(data.query)}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gmKey,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Geocode failed", res.status, body);
      throw new Error(`Geocode failed (${res.status})`);
    }
    const json = (await res.json()) as {
      status: string;
      results: Array<{
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
      }>;
    };
    if (json.status !== "OK" || !json.results.length) {
      return { found: false as const };
    }
    const r = json.results[0];
    return {
      found: true as const,
      formatted: r.formatted_address,
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
    };
  });
