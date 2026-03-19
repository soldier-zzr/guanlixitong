import { PageHeader } from "@/components/layout/page-header";
import { RefundWorkbenchActions } from "@/components/forms/refund-workbench-actions";
import { SectionCard } from "@/components/section-card";
import { RefundStatusBadge, RiskBadge, StudentStatusBadge } from "@/components/status-badge";
import { requireCurrentActorContext } from "@/lib/server/actor";
import { getLookupOptions, getRefundWorkbench } from "@/lib/server/queries";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { refundLevelLabelMap } from "@/lib/server/config";

export default async function RefundsPage() {
  const actorContext = await requireCurrentActorContext();
  const [lookups, requests] = await Promise.all([
    getLookupOptions(),
    getRefundWorkbench(actorContext.dataScope)
  ]);
  const defaultActor = actorContext.actor?.id ?? lookups.users[0]?.id ?? null;

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        eyebrow="Refund Workbench"
        title="退款处理工作台"
        description={`当前为${actorContext.dataScope.scopeLabel}。按一级销售、二级交付、三级主管推进退款处理。`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard title="一级处理" subtitle="销售先解释价值、澄清预期。">
          <p className="text-3xl font-semibold text-slate-950">
            {requests.filter((item) => item.currentLevel === "LEVEL1").length}
          </p>
        </SectionCard>
        <SectionCard title="二级处理" subtitle="交付承接学习路径与信任修复。">
          <p className="text-3xl font-semibold text-slate-950">
            {requests.filter((item) => item.currentLevel === "LEVEL2").length}
          </p>
        </SectionCard>
        <SectionCard title="三级处理" subtitle="主管处理强退款与争议承诺。">
          <p className="text-3xl font-semibold text-slate-950">
            {requests.filter((item) => item.currentLevel === "LEVEL3").length}
          </p>
        </SectionCard>
      </div>

      <div className="grid gap-5">
        {requests.map((request) => (
          <SectionCard
            key={request.id}
            title={`${request.student.name} · ${request.reasonCategory}`}
            subtitle={`${request.reasonSubcategory} · ${request.requestNo}`}
          >
            <div className="grid gap-6 xl:grid-cols-[1fr,0.9fr]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <RefundStatusBadge status={request.status} />
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {refundLevelLabelMap[request.currentLevel]}
                  </span>
                  <RiskBadge level={request.student.riskLevel} />
                  <StudentStatusBadge status={request.student.status} />
                </div>
                <div className="mt-4 grid gap-2 text-sm text-slate-600">
                  <p>期次：{request.student.cohort?.code ?? "未分配"}</p>
                  <p>销售：{request.student.salesOwner?.name ?? "未分配"}</p>
                  <p>交付：{request.student.deliveryOwner?.name ?? "未分配"}</p>
                  <p>追尾款：{request.student.enrollments[0]?.tailPaymentOwner?.name ?? "未分配"}</p>
                  <p>当前处理人：{request.currentHandler?.name ?? "未分配"}</p>
                  <p>申请时间：{formatDateTime(request.requestedAt)}</p>
                  <p>申请金额：{formatMoney(request.requestedAmount)}</p>
                  <p>已退款金额：{formatMoney(request.refundedAmount)}</p>
                  <p>最终结果：{request.finalResult ?? "处理中"}</p>
                </div>

                {request.approvals.length > 0 ? (
                  <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
                    <h4 className="text-sm font-semibold text-slate-900">退款同意节点</h4>
                    <div className="mt-3 space-y-3">
                      {request.approvals.map((approval) => (
                        <div key={approval.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-900">{approval.approver.name}</p>
                              <p className="mt-1 text-sm text-slate-500">
                                {approval.decision === "APPROVED"
                                  ? "已同意"
                                  : approval.decision === "REJECTED"
                                    ? "已拒绝"
                                    : "待同意"}
                              </p>
                            </div>
                            <div className="text-xs text-slate-500">{formatDateTime(approval.decidedAt)}</div>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{approval.note || "无备注"}</p>
                          {approval.evidenceUrls ? (
                            <p className="mt-2 text-xs text-slate-500">证据：{approval.evidenceUrls}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 space-y-3 rounded-3xl bg-slate-50 p-4">
                  {request.actions.map((action) => (
                    <div key={action.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="font-medium text-slate-900">{action.actionType}</div>
                        <div className="text-xs text-slate-500">
                          {formatDateTime(action.actedAt)} · {action.actor?.name ?? "系统"}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{action.note || "无备注"}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-lg font-semibold text-slate-950">处理动作</h4>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  根据当前层级执行升级、挽回、退款或结案，系统会自动回写学员状态和 ROI。
                </p>
                <div className="mt-4">
                  {(() => {
                    const actorApproval = request.approvals.find(
                      (approval) => approval.approver.id === actorContext.actor?.id
                    );
                    const pendingApproverNames = request.approvals
                      .filter((approval) => approval.decision === "PENDING")
                      .map((approval) => approval.approver.name);

                    return (
                      <RefundWorkbenchActions
                        actorLabel={actorContext.actor?.name ?? "未选择账号"}
                        canProcess={actorContext.permissions.canProcessRefunds}
                        refundRequestId={request.id}
                        currentLevel={request.currentLevel}
                        status={request.status}
                        actorId={defaultActor}
                        currentHandlerId={request.currentHandler?.id ?? null}
                        actorApprovalDecision={actorApproval?.decision ?? null}
                        allApprovalsApproved={
                          request.approvals.length > 0 &&
                          request.approvals.every((approval) => approval.decision === "APPROVED")
                        }
                        pendingApproverNames={pendingApproverNames}
                      />
                    );
                  })()}
                </div>
              </div>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
