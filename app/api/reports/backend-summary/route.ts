import { NextResponse } from "next/server";
import { buildBackendSummaryWorkbookBuffer } from "@/lib/server/reports";

export async function GET() {
  try {
    const fileBuffer = await buildBackendSummaryWorkbookBuffer();
    const filename = `营期-转化率-营收统计-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "后端汇总导出失败"
      },
      { status: 500 }
    );
  }
}
