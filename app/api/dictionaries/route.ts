import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const items = await prisma.dictionary.findMany({
    where: {
      isActive: true,
      ...(type ? { type } : {})
    },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }]
  });

  return NextResponse.json(items);
}
