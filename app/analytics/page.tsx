import { HorizontalBarList } from "@/components/charts/analytics-charts";
import { RevenueCompareChart } from "@/components/charts/dashboard-charts";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/section-card";
import { requireCurrentActorContext } from "@/lib/server/actor";
import { getAnalyticsData } from "@/lib/server/queries";
import { formatDateOnly, formatMoney, formatPercent } from "@/lib/utils";

export default async function AnalyticsPage(props: {
  searchParams?: Promise<{
    mode?: "COHORT" | "AS_OF_DATE" | "NET_CASH";
    asOfDate?: string;
  }>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const { dataScope } = await requireCurrentActorContext();
  const data = await getAnalyticsData(dataScope, {
    mode: searchParams.mode ?? "COHORT",
    asOfDate: searchParams.asOfDate
  });

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        eyebrow="Analytics"
        title="ROI / 净收入 / 退款归因分析"
        description={`当前为${data.scopeLabel}。按口径、期次、销售、交付、责任链拆解退款对经营的真实影响。`}
      />

      <SectionCard title="统计口径" subtitle="切换营期口径、截止日期口径、预收净收口径。">
        <form className="grid gap-4 md:grid-cols-[1fr,1fr,auto]" method="get">
          <div>
            <label className="field-label">口径</label>
            <select className="field" defaultValue={data.mode} name="mode">
              <option value="COHORT">营期口径</option>
              <option value="AS_OF_DATE">截止日期口径</option>
              <option value="NET_CASH">预收/净收口径</option>
            </select>
          </div>
          <div>
            <label className="field-label">截止日期</label>
            <input className="field" defaultValue={formatDateOnly(searchParams.asOfDate ?? data.asOfDate)} name="asOfDate" type="date" />
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full md:w-auto" type="submit">
              应用口径
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="按期次 ROI" subtitle="同时观察毛收入、净收入、毛 ROI、净 ROI。">
        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <RevenueCompareChart
            data={data.byCohort.map((item) => ({
              cohort: item.cohort,
              grossRevenue: item.grossRevenue,
              netRevenue: item.netRevenue
            }))}
          />
          <div className="space-y-3">
            {data.byCohort.map((item) => (
              <div key={item.cohort} className="rounded-3xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">{item.cohort}</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">
                      {formatMoney(item.netRevenue)}
                    </p>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    <p>毛 ROI：{formatPercent(item.grossRoi)}</p>
                    <p className="mt-1">净 ROI：{formatPercent(item.netRoi)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="按销售分析" subtitle="识别尾款率高但退款也高的销售。">
          <HorizontalBarList
            data={data.bySales.map((item) => ({
              name: item.name,
              refundAmount: item.refundAmount
            }))}
            xKey="refundAmount"
            yKey="name"
            color="#D15C0C"
          />
        </SectionCard>

        <SectionCard title="按交付分析" subtitle="识别哪位交付承接后的退款金额更高。">
          <HorizontalBarList
            data={data.byDelivery.map((item) => ({
              name: item.name,
              refundedAmount: item.refundedAmount
            }))}
            xKey="refundedAmount"
            yKey="name"
            color="#1A54D9"
          />
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="按阶段分析" subtitle="定位哪一个阶段最容易爆发退款。">
          <HorizontalBarList
            data={data.byStage.map((item) => ({
              stage: item.stage,
              count: item.count
            }))}
            xKey="count"
            yKey="stage"
            color="#F57B15"
          />
        </SectionCard>

        <SectionCard title="按退款原因分析" subtitle="标准化原因分类支持跨期归因复盘。">
          <HorizontalBarList
            data={data.byReason.map((item) => ({
              reason: item.reason,
              refundedAmount: item.refundedAmount
            }))}
            xKey="refundedAmount"
            yKey="reason"
            color="#0F766E"
          />
        </SectionCard>
      </div>

      <SectionCard title="责任链分析" subtitle="识别谁成交、谁处理、谁审批，退款金额最终压在哪条责任链上。">
        <HorizontalBarList
          data={data.byResponsibility.map((item) => ({
            person: `${item.name} · ${item.role}`,
            refundedAmount: item.refundedAmount
          }))}
          xKey="refundedAmount"
          yKey="person"
          color="#7C3AED"
        />
      </SectionCard>
    </div>
  );
}
