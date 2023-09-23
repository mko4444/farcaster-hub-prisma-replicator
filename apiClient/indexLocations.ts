import { MerkleAPIClient } from "@standard-crypto/farcaster-js";
import prisma, { Prisma } from "@/lib/prisma";
import dayjs from "dayjs";

const secret = process.env.MERKLE_SECRET ?? "";
const apiClient = new MerkleAPIClient({ secret });
const BATCH_SIZE = 5; // Adjust based on your testing

/**
 * Indexes all farcaster locations - ideally every 10 mins
 */
export async function indexLocations() {
  const config = {
    select: {
      location_updates: {
        orderBy: { timestamp: "desc" },
        take: 1,
      },
      fid: true,
    },
    where: { location_updates: { some: {} } },
  };
  const existing_user_locations: any = await prisma.user.findMany(config as any);

  let start_time: number = dayjs().valueOf();
  let user_count = 0;
  let users = [];

  for await (const { fid, profile } of apiClient.fetchRecentUsers() as any) {
    const place_id = profile.location.placeId || null;
    const description = profile.location.description || null;

    // only want to add a location update if the user has moved
    const current_place_id: any = existing_user_locations.find((f) => f.fid === fid)?.location_updates?.[0]?.place_id;
    // if the place id does not equal the current_place_id (or it's undefined) then add a location update
    const save_location_update = !!place_id && current_place_id !== place_id;

    // if the user has a location and it's the same as the current_place_id, skip them
    if (place_id && current_place_id === place_id) continue;

    // if the user has no location or location history, skip them
    if (!place_id && !current_place_id) continue;

    const obj = {
      where: { fid },
      create: {
        fid,
        place_id,
        description,
        location: {
          connectOrCreate: {
            where: { place_id },
            create: { place_id, description },
          },
        },
        location_updates: {
          create: {
            location: {
              connectOrCreate: {
                where: { place_id },
                create: { place_id, description },
              },
            },
          },
        },
      },
      update: {
        description,
        location: place_id
          ? {
              connectOrCreate: {
                where: { place_id },
                create: { place_id, description },
              },
            }
          : {
              disconnect: true,
            },
        location_updates: save_location_update
          ? {
              create: {
                location: {
                  connectOrCreate: {
                    where: { place_id },
                    create: { place_id, description },
                  },
                },
              },
            }
          : undefined,
      },
    };

    user_count++;
    users.push(obj);
  }

  try {
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(batch.map(prisma.user.upsert), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    }
    let end_time: number = dayjs().valueOf();

    if (users?.length > 0) {
      console.log(`[Locations] Updated ${users.length} users in ${(end_time - start_time) / 1000 / 60}m`);
    }

    return {
      status: "ok",
      message: `[Locations] Updated ${users.length} users in ${(end_time - start_time) / 1000 / 60}m`,
    };
  } catch (e) {
    console.log(e);
    return {
      status: "error",
      message: e,
    };
  }
}
