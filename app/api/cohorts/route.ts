import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";

function buildDefaultCohortName(issueNumber?: string | null) {
  if (!issueNumber) {
    return null;
  }

  return `起盘营${issueNumber}期`;
}

export async function GET() {
  const cohorts = await prisma.cohort.findMany({
    orderBy: [{ startDate: "desc" }]
  });

  return NextResponse.json(cohorts);
}

export async function POST(request: Request) {
  const body = await request.json();
  const issueNumber = String(body.issueNumber ?? "").trim();
  const customName = String(body.name ?? "").trim();
  const customCode = String(body.code ?? "").trim();
  const courseVersion = String(body.courseVersion ?? "密训2.0").trim() || "密训2.0";
  const defaultName = buildDefaultCohortName(issueNumber);
  const name = customName || defaultName;
  const code = customCode || name;

  if (!name || !code) {
    return NextResponse.json({ message: "请填写营期编号或自定义营期名称" }, { status: 400 });
  }

  if (!body.startDate) {
    return NextResponse.json({ message: "请填写开营日期" }, { status: 400 });
  }

  try {
    const cohort = await prisma.cohort.create({
      data: {
        code,
        name,
        courseVersion,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        adSpend: Number(body.adSpend ?? 0),
        targetRevenue: Number(body.targetRevenue ?? 0),
        note: body.note || null
      }
    });

    return NextResponse.json(cohort);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "营期名称或编码重复，请换一个" }, { status: 409 });
  }
}
