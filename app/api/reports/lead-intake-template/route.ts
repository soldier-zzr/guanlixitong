import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const rows = [
    ["系统内接量表模板"],
    ["日期时间", "手机号", "昵称", "订单信息", "分配销售", "备注"],
    ["2026-03-09 10:30", "13800138000", "示例用户A", "99元低价课 / 支付成功", "李媛", ""],
    ["2026-03-09 11:00", "13800138001", "示例用户B", "99元低价课 / 订单号10002", "周启", ""]
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 32 },
    { wch: 14 },
    { wch: 24 }
  ];
  worksheet["!merges"] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: 5 }
    }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  const filename = `接量模板-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    }
  });
}
