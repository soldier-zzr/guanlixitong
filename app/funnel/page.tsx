import { HorizontalBarList } from "@/components/charts/analytics-charts";
import { FunnelStageChart } from "@/components/charts/dashboard-charts";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/section-card";
import { requireCurrentActorContext } from "@/lib/server/actor";
import { getSalesFunnelData } from "@/lib/server/queries";

export default async function FunnelPage() {
  const { dataScope } = await requireCurrentActorContext();
  const data = await getSalesFunnelData(dataScope);

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        eyebrow="Sales Funnel"
        title="销售转化漏斗"
        description={`当前为${data.scopeLabel}。按销售负责人拆解首响、加微、进群、占位卡、尾款、正式报名，定位前链路卡点。`}
      />

      <SectionCard title="整体漏斗" subtitle="从进线到正式报名的总体转化。">
        <FunnelStageChart
          data={data.funnelTotals.map((item) => ({
            stage: item.stage,
            count: item.count
          }))}
        />
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="销售首响与转化" subtitle="用统一漏斗口径看每位销售。">
          <div className="space-y-4">
            {data.bySales.map((item) => (
              <div key={item.id} className="rounded-3xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      接量 {item.leadsCount} · 超时 {item.timeoutCount} · 平均首响 {item.averageResponseMinutes.toFixed(0)} 分钟
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">正式报名率</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">
                      {(item.formalRate * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">首触达率 {(item.firstContactRate * 100).toFixed(1)}%</div>
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">加微率 {(item.wechatRate * 100).toFixed(1)}%</div>
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">进群率 {(item.groupRate * 100).toFixed(1)}%</div>
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">占位卡率 {(item.seatCardRate * 100).toFixed(1)}%</div>
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">尾款率 {(item.finalPaymentRate * 100).toFixed(1)}%</div>
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">退款数 {item.refundCount}</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="按销售正式报名率" subtitle="快速识别前链路产出差异。">
          <HorizontalBarList
            data={data.bySales.map((item) => ({
              name: item.name,
              formalRate: Number((item.formalRate * 100).toFixed(1))
            }))}
            xKey="formalRate"
            yKey="name"
            color="#1A54D9"
          />
        </SectionCard>
      </div>
    </div>
  );
}
