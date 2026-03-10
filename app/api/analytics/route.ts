import { NextResponse } from "next/server";
import { getAnalyticsData } from "@/lib/server/queries";

export async function GET() {
  const data = await getAnalyticsData();
  return NextResponse.json(data);
}
