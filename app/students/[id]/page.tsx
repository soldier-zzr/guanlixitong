import Link from "next/link";
import { notFound } from "next/navigation";
import { RefundRequestForm } from "@/components/forms/refund-request-form";
import { RiskEventForm } from "@/components/forms/risk-event-form";
import { StudentLifecycleForm } from "@/components/forms/student-lifecycle-form";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/section-card";
import { LeadStatusBadge, RefundStatusBadge, RiskBadge, StageBadge, StudentStatusBadge } from "@/components/status-badge";
import { requireCurrentActorContext } from "@/lib/server/actor";
import { getLookupOptions, getStudentDetail } from "@/lib/server/queries";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { refundLevelLabelMap } from "@/lib/server/config";

export default async function StudentDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const actorContext = await requireCurrentActorContext();
  const [student, lookups] = await Promise.all([
    getStudentDetail(params.id, actorContext.dataScope),
    getLookupOptions()
  ]);

  if (!student) {
    notFound();
  }

  const enrollment = student.enrollments[0];

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        eyebrow="Student Detail"
        title={`${student.name} 的完整业务链路`}
        description={`当前为${actorContext.dataScope.scopeLabel}。查看成交节点、风险事件、退款处理留痕和当前负责人。`}
        actions={
          <Link className="btn-secondary" href="/students">
            返回学员列表
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <SectionCard title="主档案概览" subtitle="主状态、风险状态、负责人和当前阶段。">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">当前状态</p>
              <div className="mt-2">
                <StudentStatusBadge status={student.status} />
              </div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">风险等级</p>
              <div className="mt-2">
                <RiskBadge level={student.riskLevel} />
              </div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">当前阶段</p>
              <div className="mt-2">
                <StageBadge stage={student.currentStage} />
              </div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">负责人</p>
              <p className="mt-2 font-medium text-slate-900">
                销售：{student.salesOwner?.name ?? "未分配"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                交付：{student.deliveryOwner?.name ?? "未分配"}
              </p>
              <p className="mt-1 text-sm text-slate-500">赛道：{student.trackLane ?? "未标注"}</p>
              <p className="mt-1 text-sm text-slate-500">营期：{student.cohort?.code ?? "未分配"}</p>
            </div>
          </div>

          {enrollment ? (
            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
              <h4 className="text-sm font-semibold text-slate-900">成交金额拆分</h4>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">占位卡</p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    {formatMoney(enrollment.seatCardAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">尾款</p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    {formatMoney(enrollment.finalPaymentAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">总收款</p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    {formatMoney(enrollment.totalReceived)}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                <p>例子来源：{enrollment.leadSourceLabel ?? "未标注"}</p>
                <p>追尾款人：{enrollment.tailPaymentOwner?.name ?? "未分配"}</p>
                <p>转交交付：{formatDateTime(enrollment.handoffToDeliveryAt)}</p>
              </div>
            </div>
          ) : null}
        </SectionCard>

        <SectionCard title="状态调整" subtitle="允许手工修正主档案、风险等级、负责人和金额。">
          <StudentLifecycleForm
            canEditDeliveryFields={actorContext.permissions.canEditStudentDelivery}
            canEditRiskFields={actorContext.permissions.canCreateRiskEvents}
            canEditSalesFields={actorContext.permissions.canEditStudentSales}
            studentId={student.id}
            status={student.status}
            riskLevel={student.riskLevel}
            cohortId={student.cohortId}
            salesOwnerId={student.salesOwnerId}
            deliveryOwnerId={student.deliveryOwnerId}
            intentNote={student.intentNote}
            trackLane={student.trackLane}
            leadSourceLabel={enrollment?.leadSourceLabel ?? ""}
            tailPaymentOwnerId={enrollment?.tailPaymentOwnerId ?? ""}
            handoffToDeliveryAt={enrollment?.handoffToDeliveryAt?.toISOString() ?? ""}
            users={lookups.users}
            cohorts={lookups.cohorts.map((item) => ({ id: item.id, name: item.name }))}
            seatCardAmount={enrollment?.seatCardAmount ?? 0}
            finalPaymentAmount={enrollment?.finalPaymentAmount ?? 0}
          />
        </SectionCard>
      </div>

      {student.lead ? (
        <SectionCard title="来源线索与销售漏斗" subtitle="把学员放回前链路，看它最初从哪里来、如何被承接和转化。">
          <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <LeadStatusBadge status={student.lead.leadStatus} />
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  质量分 {student.lead.qualityScore}
                </span>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <p>进线时间：{formatDateTime(student.lead.sourceTime)}</p>
                <p>来源计划：{student.lead.campaign?.name ?? "未关联"}</p>
                <p>素材：{student.lead.creative?.creativeName ?? "未关联"}</p>
                <p>当前线索负责人：{student.lead.currentAssignee?.name ?? "未分配"}</p>
                <p>意向等级：{student.lead.intentLevel ?? "未评估"}</p>
                <p>赛道：{student.trackLane ?? "未标注"}</p>
                <p>转化营期：{student.cohort?.code ?? "未分配"}</p>
              </div>
            </div>
            <div className="space-y-3">
              {student.funnelEvents.slice(0, 6).map((event) => (
                <div key={event.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{event.eventType}</p>
                      <p className="mt-1 text-sm text-slate-500">{event.result ?? "无结果说明"}</p>
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDateTime(event.eventAt)} · {event.owner?.name ?? "系统"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="业务时间线" subtitle="完整记录从低价课到退款处理的关键节点。">
        <div className="space-y-4">
          {([
            ["低价课购买", student.lowPricePurchaseAt],
            ["加企微", student.wechatAddedAt],
            ["公开课参与", student.publicCourseJoinedAt],
            ["占位卡支付", enrollment?.seatCardPaidAt],
            ["尾款支付", enrollment?.finalPaymentPaidAt],
            ["正式报名", enrollment?.formallyEnrolledAt],
            ["开课前观察", enrollment?.observationStartedAt]
          ] as Array<[string, Date | null | undefined]>).map(([label, value]) => (
            <div key={label as string} className="flex items-center gap-4 rounded-2xl border border-slate-200 px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-brand-500" />
              <div className="flex-1">
                <p className="font-medium text-slate-900">{label}</p>
              </div>
              <div className="text-sm text-slate-500">{formatDateTime(value as Date | null)}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
        <SectionCard title="风险事件" subtitle="预警信号按时间倒序展示，并支持追加记录。">
          <div className="space-y-3">
            {student.riskEvents.map((event) => (
              <div key={event.id} className="rounded-3xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <RiskBadge level={student.riskLevel} />
                  <StageBadge stage={event.stage} />
                  <span className="text-sm font-semibold text-slate-900">{event.signalLabel}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{event.note || "无补充说明"}</p>
                <p className="mt-3 text-xs text-slate-500">
                  {formatDateTime(event.occurredAt)} · 记录人 {event.reporter?.name ?? "系统"}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <RiskEventForm
              canEdit={actorContext.permissions.canCreateRiskEvents}
              studentId={student.id}
              enrollmentId={enrollment?.id}
              currentReporterId={actorContext.actor?.id ?? lookups.users[0]?.id}
              reporters={lookups.users.map((item) => ({ id: item.id, name: item.name, title: item.title }))}
            />
          </div>
        </SectionCard>

        <SectionCard title="退款申请与处理留痕" subtitle="所有升级、挽回、退款动作都必须记录。">
          <div className="space-y-4">
            {student.refundRequests.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                当前无退款申请
              </div>
            ) : (
              student.refundRequests.map((request) => (
                <div key={request.id} className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <RefundStatusBadge status={request.status} />
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {refundLevelLabelMap[request.currentLevel]}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {request.reasonCategory} / {request.reasonSubcategory}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600">
                    <p>申请时间：{formatDateTime(request.requestedAt)}</p>
                    <p>申请金额：{formatMoney(request.requestedAmount)}</p>
                    <p>当前处理人：{request.currentHandler?.name ?? "未分配"}</p>
                    <p>最终结果：{request.finalResult ?? "处理中"}</p>
                  </div>
                  {request.approvals.length > 0 ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="text-sm font-semibold text-slate-900">退款同意节点</p>
                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        {request.approvals.map((approval) => (
                          <div key={approval.id} className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <span className="font-medium text-slate-900">{approval.approver.name}</span>
                              <span className="ml-2">
                                {approval.decision === "APPROVED"
                                  ? "已同意"
                                  : approval.decision === "REJECTED"
                                    ? "已拒绝"
                                    : "待同意"}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500">{formatDateTime(approval.decidedAt)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-3">
                    {request.actions.map((action) => (
                      <div key={action.id} className="flex justify-between gap-4 text-sm">
                        <div>
                          <span className="font-medium text-slate-900">{action.actionType}</span>
                          <span className="ml-2 text-slate-500">{action.note}</span>
                        </div>
                        <div className="shrink-0 text-slate-500">
                          {formatDateTime(action.actedAt)} · {action.actor?.name ?? "系统"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <RefundRequestForm
              canCreate={actorContext.permissions.canCreateRefundRequests}
              studentId={student.id}
              currentHandlerId={student.salesOwnerId}
              createdById={actorContext.actor?.id ?? student.salesOwnerId}
              dictionaries={lookups.dictionaries}
              actorUsers={lookups.users.map((item) => ({ id: item.id, name: item.name, title: item.title }))}
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
