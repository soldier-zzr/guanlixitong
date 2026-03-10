import { NextResponse } from "next/server";
import { importIntakeWorkbook, importTailWorkbook } from "@/lib/server/importers";
import { recalculateAllCohortStats } from "@/lib/server/recompute";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let mode: string | null = null;
    let filePath: string | null = null;
    let fileBuffer: Buffer | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      mode = String(form.get("mode") || "");
      filePath = form.get("filePath") ? String(form.get("filePath")) : null;
      const file = form.get("file");
      if (file instanceof File && file.size > 0) {
        fileBuffer = Buffer.from(await file.arrayBuffer());
      }
    } else {
      const body = await request.json();
      mode = body.mode;
      filePath = body.filePath || null;
    }

    if (mode === "front") {
      const result = await importIntakeWorkbook(fileBuffer ?? filePath ?? "");
      return NextResponse.json(result);
    }

    if (mode === "mid") {
      const result = await importTailWorkbook(fileBuffer ?? filePath ?? "");
      await recalculateAllCohortStats();
      return NextResponse.json(result);
    }

    return NextResponse.json({ message: "不支持的导入模式" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "导入失败"
      },
      { status: 500 }
    );
  }
}
