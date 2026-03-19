import {
  AlertTriangle,
  CircleDollarSign,
  Filter,
  GraduationCap,
  ListTodo,
  ReceiptText,
  ShieldAlert,
  Users
} from "lucide-react";
import { FunnelStageChart, RefundTrendChart, RevenueCompareChart, RiskDistributionChart } from "@/components/charts/dashboard-charts";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/section-card";
import { requireCurrentActorContext } from "@/lib/server/actor";
import { getDashboardData } from "@/lib/server/queries";
import { formatMoney, formatPercent } from "@/lib/utils";

export default async function DashboardPage() {
  const { dataScope } = await requireCurrentActorContext();
  const data = await getDashboardData(dataScope);

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        eyebrow="Overview"
        title="学员经营总览"
        description={`当前为${data.scopeLabel}。围绕线索承接、报课转化、退款审批、净收入和期次质量建立统一视图。`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="总线索数" value={String(data.summary.intakeCount)} icon={<ListTodo className="h-5 w-5" />} />
        <KpiCard label="已分配线索" value={String(data.summary.assignedCount)} icon={<Users className="h-5 w-5" />} />
        <KpiCard label="分配超时数" value={String(data.summary.timeoutCount)} icon={<AlertTriangle className="h-5 w-5" />} />
        <KpiCard label="未分配线索" value={String(data.summary.unassignedCount)} icon={<Filter className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="总学员数" value={String(data.summary.totalStudents)} icon={<Users className="h-5 w-5" />} />
        <KpiCard label="占位卡人数" value={String(data.summary.seatCardCount)} icon={<ReceiptText className="h-5 w-5" />} />
        <KpiCard label="正式报名人数" value={String(data.summary.formalCount)} icon={<GraduationCap className="h-5 w-5" />} />
        <KpiCard label="退款预警人数" value={String(data.summary.warningCount)} icon={<ShieldAlert className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="毛收入" value={formatMoney(data.summary.grossRevenue)} hint="占位卡 + 尾款总额" tone="dark" icon={<CircleDollarSign className="h-5 w-5" />} />
        <KpiCard label="净收入" value={formatMoney(data.summary.netRevenue)} hint={`已退款 ${formatMoney(data.summary.refundAmount)}`} tone="dark" icon={<CircleDollarSign className="h-5 w-5" />} />
        <KpiCard label="毛 ROI" value={formatPercent(data.summary.grossRoi)} hint="毛收入 / 成本金额" tone="dark" icon={<AlertTriangle className="h-5 w-5" />} />
        <KpiCard label="净 ROI" value={formatPercent(data.summary.netRoi)} hint="净收入 / 成本金额" tone="dark" icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
        <SectionCard
          title="销售漏斗总览"
          subtitle="从进线到正式报名，看前链路每一段的漏损。"
        >
          <FunnelStageChart
            data={data.funnelOverview.map((item) => ({
              stage: item.stage,
              count: item.count
            }))}
          />
        </SectionCard>

        <SectionCard
          title="风险等级分布"
          subtitle="A/B/C 风险结构直接决定挽回压力与交付承接压力。"
        >
          <RiskDistributionChart data={data.riskDistribution} />
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
        <SectionCard
          title="退款率趋势"
          subtitle="按期次观察退款率与预警量，识别哪一期最容易出晚退费。"
        >
          <RefundTrendChart data={data.refundTrend} />
        </SectionCard>

        <SectionCard
          title="前链路关注点"
          subtitle="当前最需要优先盯住的异常。"
        >
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">线索分配异常</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {data.summary.timeoutCount} 条超时，{data.summary.unassignedCount} 条未分配
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">转化损耗关注</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                进线 {data.summary.intakeCount} {"->"} 正式报名 {data.summary.formalCount}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">退款风险关注</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                预警 {data.summary.warningCount} / 已退款 {data.summary.refundedCount}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="期次毛收入 vs 净收入"
        subtitle="所有退款都会压缩净收入，从而影响净 ROI。"
      >
        <RevenueCompareChart
          data={data.cohortStats.map((item) => ({
            cohort: item.cohort.code,
            grossRevenue: item.grossRevenue,
            netRevenue: item.netRevenue
          }))}
        />
      </SectionCard>
    </div>
  );
}
