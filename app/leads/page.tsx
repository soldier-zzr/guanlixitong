import { LeadStatus } from "@prisma/client";
import { LeadAssignForm } from "@/components/forms/lead-assign-form";
import { LeadBatchUploadForm } from "@/components/forms/lead-batch-upload-form";
import { LeadCreateForm } from "@/components/forms/lead-create-form";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/section-card";
import { LeadStatusBadge } from "@/components/status-badge";
import { getLeadOverview, getLeads, getLookupOptions } from "@/lib/server/queries";
import { formatDateTime, formatMoney, formatUserOptionLabel } from "@/lib/utils";

export default async function LeadsPage(props: {
  searchParams?: Promise<{
    search?: string;
    status?: LeadStatus | "ALL";
    ownerId?: string;
    campaignId?: string;
  }>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const [lookups, overview, leads] = await Promise.all([
    getLookupOptions(),
    getLeadOverview(),
    getLeads({
      search: searchParams.search,
      status: searchParams.status ?? "ALL",
      ownerId: searchParams.ownerId ?? "ALL",
      campaignId: searchParams.campaignId ?? "ALL"
    })
  ]);

  const salesUsers = lookups.users.filter((item) => item.role === "SALES");

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        eyebrow="Lead Pool"
        title="系统内接量表与销售承接表"
        description="投放伙伴只录基础订单信息，后续由销售承接人员继续补加V情况、意向、承接备注和状态流转。"
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

      <SectionCard title="批量上传接量表" subtitle="投放伙伴可以直接上传 Excel，不需要逐条手工录入。">
        <LeadBatchUploadForm />
      </SectionCard>

      <SectionCard title="新增接量" subtitle="投放伙伴只需要填日期时间、手机号、昵称、订单信息和分配销售。">
        <LeadCreateForm campaigns={lookups.campaigns} creatives={lookups.creatives} users={lookups.users} />
      </SectionCard>

      <SectionCard title="筛选器" subtitle="按线索状态、负责人、投放计划查看。">
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
            <label className="field-label">投放计划</label>
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
      <SectionCard title="系统内接量表" subtitle="左侧是投放填写的基础列，右侧是销售承接继续补的状态列。">
          <div className="table-shell shadow-none">
            <table>
              <thead>
                <tr>
                  <th>日期时间</th>
                  <th>手机号</th>
                  <th>昵称</th>
                  <th>订单信息</th>
                  <th>分配销售</th>
                  <th>添加情况</th>
                  <th>意向等级</th>
                  <th>承接备注</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>{formatDateTime(lead.sourceTime)}</td>
                    <td>{lead.phone}</td>
                    <td>
                      <div className="font-medium text-slate-900">{lead.name}</div>
                      {lead.student ? (
                        <div className="mt-1 text-xs font-semibold text-emerald-700">已转学员</div>
                      ) : null}
                    </td>
                    <td>{lead.orderInfo ?? "未填写"}</td>
                    <td>{lead.currentAssignee?.name ?? "未分配"}</td>
                    <td>
                      <LeadStatusBadge status={lead.leadStatus} />
                    </td>
                    <td>{lead.intentLevel ?? "待承接评估"}</td>
                    <td>{lead.note ?? "无"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="按计划表现" subtitle="初步看投放成本与转学员效率。">
          <div className="space-y-3">
            {overview.byCampaign.map((item) => (
              <div key={item.campaign} className="rounded-3xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-950">{item.campaign}</p>
                <p className="mt-1 text-sm text-slate-500">{item.channel}</p>
                <div className="mt-3 grid gap-2 text-sm text-slate-600">
                  <p>消耗：{formatMoney(item.spentAmount)}</p>
                  <p>线索数：{item.leads}</p>
                  <p>已转学员：{item.converted}</p>
                  <p>转化率：{(item.conversionRate * 100).toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="销售承接填写区" subtitle="这里由销售承接人员补添加情况、意向等级和跟进备注。">
        <div className="grid gap-4 xl:grid-cols-2">
          {leads.slice(0, 6).map((lead) => (
            <div key={lead.id} className="rounded-3xl border border-slate-200 p-4">
              <div className="mb-3">
                <p className="font-semibold text-slate-950">{lead.name}</p>
                <p className="text-sm text-slate-500">
                  {lead.phone} · 当前负责人 {lead.currentAssignee?.name ?? "未分配"} · {lead.orderInfo ?? "无订单备注"}
                </p>
              </div>
              <LeadAssignForm
                leadId={lead.id}
                currentAssigneeId={lead.currentAssigneeId}
                leadStatus={lead.leadStatus}
                intentLevel={lead.intentLevel}
                users={salesUsers.map((item) => ({ id: item.id, name: item.name, title: item.title }))}
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
