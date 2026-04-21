import { NextRequest, NextResponse } from "next/server";
import { getRetentionPayload } from "./_retention";

export async function GET(request: NextRequest) {
  const metric = request.nextUrl.searchParams.get("metric");

  if (metric === "retention") {
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

  return NextResponse.json(
    { error: "Unsupported dashboard metric" },
    { status: 404 },
  );
}
