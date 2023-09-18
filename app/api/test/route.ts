import { indexAllContracts } from "@/apiClient/indexAllContracts";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await indexAllContracts();
    return NextResponse.json({ status: "ok" });
  } catch (e) {
    return NextResponse.json({ status: "error", error: e.message });
  }
}
