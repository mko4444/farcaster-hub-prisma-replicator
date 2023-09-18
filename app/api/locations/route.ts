import { indexLocations } from "@/apiClient/indexLocations";
import { NextResponse } from "next/server";
/**
 * Get all locations from the database
 */
export async function GET() {
  return {
    status: 200,
    body: {
      message: "Hello World",
    },
  };
}

/**
 * Indexes all farcaster locations - ideally once per minute?
 */
export async function PUT() {
  const res = await indexLocations();
  return NextResponse.json(res);
}
