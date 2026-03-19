import { LeadBatchUploadForm } from "@/components/forms/lead-batch-upload-form";
import { LeadBulkPasteForm } from "@/components/forms/lead-bulk-paste-form";
import { LeadCreateForm } from "@/components/forms/lead-create-form";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/section-card";
import { requireCurrentActorContext } from "@/lib/server/actor";
import { getLookupOptions, getMarketingCollaborationRows } from "@/lib/server/queries";
import { formatUserOptionLabel } from "@/lib/utils";

export default async function MarketingPage() {
  const actorContext = await requireCurrentActorContext();

  if (
    !actorContext.permissions.canInputLeads &&
    !actorContext.permissions.canHandleLeads &&
    !actorContext.permissions.canCreateStudents
  ) {
    return (
      <div className="space-y-6 py-4">
        <PageHeader
          eyebrow="Marketing"
          title="投放协同页"
          description="当前岗位没有查看投放协同页的权限。"
        />
      </div>
    );
  }

  const [lookups, rows] = await Promise.all([
    getLookupOptions(),
    getMarketingCollaborationRows(actorContext.dataScope)
  ]);

  const summary = {
    total: rows.length,
    wechatAdded: rows.filter(
      (item) => item.leadStatus === "WECHAT_ADDED" || item.leadStatus === "IN_GROUP"
    ).length,
    studentCreated: rows.filter((item) => item.student).length,
    formal: rows.filter((item) => item.student?.status === "FORMALLY_ENROLLED").length
  };
  const assignmentSummary = lookups.users
    .filter((user) => user.title === "SALES" || user.title === "PRIVATE_OPS")
    .map((user) => ({
      user,
      leads: rows.filter((item) => item.currentAssignee?.id === user.id).length,
      converted: rows.filter((item) => item.currentAssignee?.id === user.id && item.student).length
    }))
    .filter((item) => item.leads > 0);
  const latestInputSummary = rows
    .slice(0, 5)
    .map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      assigneeName: row.currentAssignee?.name ?? "未分配",
      statusLabel: row.student ? "已转学员" : row.leadStatus
    }));

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        eyebrow="Marketing"
        title="投放录入台"
        description={`当前为${actorContext.dataScope.scopeLabel}。这里只负责录入、导入和分配线索；销售承接、赛道、成交和尾款统一去“销售承接”里处理。`}
      />

      {actorContext.permissions.canInputLeads ? (
        <SectionCard
          title="投放批量接量入口"
          subtitle="投放同事只需要把接量批量导进来；支持 Excel 上传，也支持直接从表格粘贴。"
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <LeadBatchUploadForm />
            <LeadBulkPasteForm />
          </div>
        </SectionCard>
      ) : null}

      {actorContext.permissions.canInputLeads ? (
        <SectionCard
          title="单条录入"
          subtitle="少量补录时，直接填写日期时间、手机号、昵称、订单信息和分配销售。"
        >
          <LeadCreateForm campaigns={lookups.campaigns} creatives={lookups.creatives} users={lookups.users} />
        </SectionCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SectionCard title="总接量" subtitle="进入协同链路的线索总数">
          <p className="text-3xl font-semibold text-slate-950">{summary.total}</p>
        </SectionCard>
        <SectionCard title="已加V" subtitle="销售已补加V进度">
          <p className="text-3xl font-semibold text-slate-950">{summary.wechatAdded}</p>
        </SectionCard>
        <SectionCard title="已建学员档案" subtitle="已进入学员主档的线索">
          <p className="text-3xl font-semibold text-slate-950">{summary.studentCreated}</p>
        </SectionCard>
        <SectionCard title="已正式报名" subtitle="已进入正式报名状态">
          <p className="text-3xl font-semibold text-slate-950">{summary.formal}</p>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <SectionCard
          title="分配结果摘要"
          subtitle="这里只核对线索是否录入、是否分配到人，不在这里继续做销售承接。"
        >
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              未分配线索：<span className="font-semibold text-slate-900">
                {rows.filter((row) => !row.currentAssignee).length}
              </span>
            </div>
            {assignmentSummary.length > 0 ? (
              assignmentSummary.map((item) => (
                <div key={item.user.id} className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{formatUserOptionLabel(item.user)}</p>
                      <p className="mt-1 text-sm text-slate-500">已分配 {item.leads} 条线索</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                      已转学员 {item.converted}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                当前还没有已分配线索。
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="最近录入回执"
          subtitle="投放只确认最近几条是否已写入系统、是否已分配；后续填写统一去“销售承接”。"
        >
          <div className="space-y-3">
            {latestInputSummary.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-slate-950">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.phone}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium text-slate-900">{item.assigneeName}</p>
                  <p className="mt-1 text-slate-500">{item.statusLabel}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            投放录入负责：
            <br />
            1. 线索录入或批量导入
            <br />
            2. 分配到销售或私域承接
            <br />
            3. 检查是否已成功进入后续承接
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
