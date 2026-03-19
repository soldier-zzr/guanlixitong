import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";

export async function GET() {
  const startedAt = Date.now();

  try {
    const [userCount, cohortCount] = await Promise.all([
      prisma.user.count(),
      prisma.cohort.count()
    ]);

    return NextResponse.json({
      status: "ok",
      app: "珠峰学员管理系统",
      database: "connected",
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      counts: {
        users: userCount,
        cohorts: cohortCount
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        app: "珠峰学员管理系统",
        database: "disconnected",
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : "数据库连接失败"
      },
      { status: 500 }
    );
  }
}
