import { LeadStatus } from "@prisma/client";
import { PageHeader } from "@/components/layout/page-header";
import { LeadIntakeWorkbench } from "@/components/leads/lead-intake-workbench";
import { SectionCard } from "@/components/section-card";
import { requireCurrentActorContext } from "@/lib/server/actor";
import { getLeadOverview, getLeads, getLookupOptions } from "@/lib/server/queries";
import { formatMoney, formatUserOptionLabel } from "@/lib/utils";

export default async function LeadsPage(props: {
  searchParams?: Promise<{
    search?: string;
    status?: LeadStatus | "ALL";
    ownerId?: string;
    campaignId?: string;
  }>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const actorContext = await requireCurrentActorContext();
  const [lookups, overview, leads] = await Promise.all([
    getLookupOptions(),
    getLeadOverview(actorContext.dataScope),
    getLeads(
      {
        search: searchParams.search,
        status: searchParams.status ?? "ALL",
        ownerId: searchParams.ownerId ?? "ALL",
        campaignId: searchParams.campaignId ?? "ALL"
      },
      actorContext.dataScope
    )
  ]);

  const salesUsers = lookups.users.filter(
    (item) => item.title === "SALES" || item.title === "PRIVATE_OPS"
  );

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        eyebrow="Lead Pool"
        title="销售承接台"
        description={`当前为${actorContext.dataScope.scopeLabel}。这里专门给销售和私域承接使用：承接人、加V、意向、备注、建档和后续跟进都在这里完成。`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SectionCard title="总线索" subtitle="当前线索池规模">
          <p className="text-3xl font-semibold text-slate-950">{overview.summary.totalLeads}</p>
        </SectionCard>
        <SectionCard title="新线索" subtitle="待分配或待处理">
          <p className="text-3xl font-semibold text-slate-950">{overview.summary.newLeads}</p>
        </SectionCard>
        <SectionCard title="已分配" subtitle="已进入销售承接">
          <p className="text-3xl font-semibold text-slate-950">{overview.summary.assignedLeads}</p>
        </SectionCard>
        <SectionCard title="已转学员" subtitle="已进入主业务链路">
          <p className="text-3xl font-semibold text-slate-950">{overview.summary.convertedLeads}</p>
        </SectionCard>
        <SectionCard title="平均响应" subtitle="首次响应时效（分钟）">
          <p className="text-3xl font-semibold text-slate-950">
            {overview.summary.averageResponseMinutes.toFixed(0)}
          </p>
        </SectionCard>
      </div>

      <SectionCard title="筛选器" subtitle="按线索状态、负责人、来源计划查看。">
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" method="get">
          <div>
            <label className="field-label">关键词</label>
            <input className="field" defaultValue={searchParams.search ?? ""} name="search" placeholder="姓名 / 手机 / 城市" />
          </div>
          <div>
            <label className="field-label">线索状态</label>
            <select className="field" defaultValue={searchParams.status ?? "ALL"} name="status">
              <option value="ALL">全部状态</option>
              <option value="NEW">新进线索</option>
              <option value="ASSIGNED">已分配</option>
              <option value="CONTACTED">已联系</option>
              <option value="WECHAT_ADDED">已加企微</option>
              <option value="IN_GROUP">已进群</option>
              <option value="CONVERTED">已转学员</option>
              <option value="LOST">已流失</option>
            </select>
          </div>
          <div>
            <label className="field-label">销售负责人</label>
            <select className="field" defaultValue={searchParams.ownerId ?? "ALL"} name="ownerId">
              <option value="ALL">全部销售</option>
              {salesUsers.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatUserOptionLabel(item)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">来源计划</label>
            <select className="field" defaultValue={searchParams.campaignId ?? "ALL"} name="campaignId">
              <option value="ALL">全部计划</option>
              {lookups.campaigns.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full" type="submit">
              应用筛选
            </button>
          </div>
        </form>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
        <SectionCard
          title="销售承接工作台"
          subtitle={
            actorContext.permissions.canHandleLeads
              ? "左侧先点人，右侧集中填写这一个人的承接信息。这里是销售和私域承接的唯一工作台。"
              : "当前岗位仅可查看承接结果，不能改添加情况和意向等级。"
          }
        >
          <LeadIntakeWorkbench
            canEdit={actorContext.permissions.canHandleLeads}
            canReassign={actorContext.permissions.canReassignLeads}
            leads={leads}
            users={salesUsers.map((item) => ({ id: item.id, name: item.name, title: item.title }))}
          />
        </SectionCard>
        <SectionCard title="按来源表现" subtitle="初步看各来源的成本与转学员效率。">
          <div className="space-y-3">
            {overview.byCampaign.map((item) => (
              <div key={item.campaign} className="rounded-3xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-950">{item.campaign}</p>
                <p className="mt-1 text-sm text-slate-500">{item.channel}</p>
                <div className="mt-3 grid gap-2 text-sm text-slate-600">
                  <p>成本：{formatMoney(item.spentAmount)}</p>
                  <p>线索数：{item.leads}</p>
                  <p>已转学员：{item.converted}</p>
                  <p>转化率：{(item.conversionRate * 100).toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
