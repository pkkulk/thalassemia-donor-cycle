import { NextRequest, NextResponse } from "next/server";
import { getRankedDonors } from "./_rank";

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action");

  if (action === "rank") {
    const appointmentId = request.nextUrl.searchParams.get("appointment_id");
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = Number.parseInt(limitParam || "10", 10);

    if (!appointmentId) {
      return NextResponse.json(
        { error: "Missing appointment_id" },
        { status: 400 },
      );
    }

    const result = await getRankedDonors(
      appointmentId,
      Number.isNaN(limit) ? 10 : limit,
    );
    return NextResponse.json(result.body, { status: result.status });
  }

  return NextResponse.json(
    { error: "Unsupported donors action" },
    { status: 404 },
  );
}
