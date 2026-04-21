import { NextResponse } from "next/server";
import { getRetentionPayload } from "../_retention";

export async function GET() {
  try {
    const payload = await getRetentionPayload();
    return NextResponse.json(payload, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch retention metrics" },
      { status: 500 },
    );
  }
}
