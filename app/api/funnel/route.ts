import { NextResponse } from "next/server";
import { getSalesFunnelData } from "@/lib/server/queries";

export async function GET() {
  const data = await getSalesFunnelData();
  return NextResponse.json(data);
}
