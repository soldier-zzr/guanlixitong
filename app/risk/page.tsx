import Link from "next/link";
import { EnrollmentStage } from "@prisma/client";
import { PageHeader } from "@/components/layout/page-header";
import { RiskBadge, StageBadge, StudentStatusBadge } from "@/components/status-badge";
import { requireCurrentActorContext } from "@/lib/server/actor";
import { getRiskStudents } from "@/lib/server/queries";
import { formatDateTime } from "@/lib/utils";

export default async function RiskPage(props: {
  searchParams?: Promise<{
    stage?: EnrollmentStage | "ALL";
  }>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const actorContext = await requireCurrentActorContext();
  const students = await getRiskStudents(searchParams.stage ?? "ALL", actorContext.dataScope);

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        eyebrow="Risk Radar"
        title="风险预警列表"
        description={`当前为${actorContext.dataScope.scopeLabel}。聚焦 A/B/C 风险学员，并按发生阶段定位哪里最容易爆发退款意向。`}
      />

      <form className="panel flex items-end gap-4 px-5 py-5" method="get">
        <div className="w-full max-w-xs">
          <label className="field-label">阶段筛选</label>
          <select className="field" defaultValue={searchParams.stage ?? "ALL"} name="stage">
            <option value="ALL">全部阶段</option>
            <option value="PUBLIC_COURSE">公开课</option>
            <option value="SEAT_CARD">占位卡</option>
            <option value="FINAL_PAYMENT">尾款</option>
            <option value="PRE_START">开课前观察</option>
            <option value="REFUND">退款处理</option>
          </select>
        </div>
        <button className="btn-primary" type="submit">
          应用筛选
        </button>
      </form>

      <div className="grid gap-4 xl:grid-cols-2">
        {students.map((student) => (
          <Link
            key={student.id}
            href={`/students/${student.id}`}
            className="panel block p-5 transition hover:-translate-y-0.5 hover:shadow-panel"
          >
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold text-slate-950">{student.name}</h3>
              <RiskBadge level={student.riskLevel} />
              <StudentStatusBadge status={student.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
              <span>{student.cohort?.code ?? "未分配期次"}</span>
              <span>销售：{student.salesOwner?.name ?? "未分配"}</span>
              <span>交付：{student.deliveryOwner?.name ?? "未分配"}</span>
            </div>

            <div className="mt-4 space-y-3">
              {student.riskEvents.map((event) => (
                <div key={event.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <StageBadge stage={event.stage} />
                    <span className="font-medium text-slate-900">{event.signalLabel}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{event.note || "无备注"}</p>
                  <p className="mt-2 text-xs text-slate-500">{formatDateTime(event.occurredAt)}</p>
                </div>
              ))}
              {"automaticSignals" in student && Array.isArray(student.automaticSignals)
                ? student.automaticSignals.map((event) => (
                    <div key={`${student.id}-${event.label}`} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <StageBadge stage={event.stage} />
                        <span className="font-medium text-amber-800">{event.label}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-amber-700">{event.note}</p>
                      <p className="mt-2 text-xs text-amber-700">系统自动识别</p>
                    </div>
                  ))
                : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
