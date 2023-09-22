import prisma from "@/lib/prisma";
import { getPlaceDetails } from "@/lib/google";
import { NextResponse } from "next/server";

/**
 * Fills in data for any missing locations in the database
 */
export async function PUT() {
  const locations_to_update = await prisma.location.findMany({
    where: { latitude: null },
  });

  let count = 0;

  for await (const { place_id, description } of locations_to_update) {
    const full_location = await getPlaceDetails(place_id);

    await prisma.location.update({
      where: { place_id },
      data: {
        latitude: full_location.geometry.location.lat ?? undefined,
        longitude: full_location.geometry.location.lng ?? undefined,
        formatted_address: full_location.formatted_address ?? undefined,
        name: full_location.name ?? undefined,
        country_short:
          full_location.address_components.find((c) => c.types.includes("country"))?.short_name ?? undefined,
        country_long: full_location.address_components.find((c) => c.types.includes("country"))?.long_name ?? undefined,
        state_short:
          full_location.address_components.find((c) => c.types.includes("administrative_area_level_1"))?.short_name ??
          undefined,
        state_long:
          full_location.address_components.find((c) => c.types.includes("administrative_area_level_1"))?.long_name ??
          undefined,
        locality_short:
          full_location.address_components.find((c) => c.types.includes("locality"))?.short_name ?? undefined,
        locality_long:
          full_location.address_components.find((c) => c.types.includes("locality"))?.long_name ?? undefined,
        utc_offset: full_location.utc_offset ?? undefined,
        vicinity: full_location.vicinity ?? undefined,
        url: full_location.url ?? undefined,
      },
    });

    console.log(`Updated ${description}`);

    count++;
  }

  return NextResponse.json({ status: "ok", count });
}
