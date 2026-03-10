import { ImportRunner } from "@/components/forms/import-runner";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/section-card";
import { getBackendSummaryRows } from "@/lib/server/reports";
import { formatMoney } from "@/lib/utils";

const FRONT_DEFAULT =
  "C:/Users/11424/Desktop/接量.xlsx";
const MID_DEFAULT =
  "C:/Users/11424/Desktop/【珠峰学苑】密训尾款工单系统_密训营转数据.xlsx";
const BACK_DEFAULT =
  "I:/xwechat_files/wxid_88oie3duvy0322_6668/msg/file/2026-03/营期-转化率-营收统计.xlsx";

export default async function ImportsPage() {
  const summaryRows = await getBackendSummaryRows();

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        eyebrow="Imports"
        title="前端 / 中端 / 后端报表整合"
        description="前端和中端 Excel 作为明细导入源，后端汇总表不再手工维护，而由系统自动生成。"
      />

      <SectionCard title="导入入口" subtitle="按你当前正在用的两个明细表直接导入。">
        <ImportRunner frontDefaultPath={FRONT_DEFAULT} midDefaultPath={MID_DEFAULT} />
      </SectionCard>

      <SectionCard title="三表对接关系" subtitle="前端表负责进线明细，中端表负责成交与退款工单，后端表改成系统自动汇总。">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">前端表</p>
            <h4 className="mt-2 text-lg font-semibold text-slate-950">接量.xlsx</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              导入到线索池与分配承接层，承接手机号、微信昵称、助教、是否加上、意向等级、备注。
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>手机号 - {">"} `leads.phone`</li>
              <li>助教 - {">"} `lead_assignments.assignedTo`</li>
              <li>是否好友 - {">"} `sales_funnel_events.ADD_WECHAT`</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">中端表</p>
            <h4 className="mt-2 text-lg font-semibold text-slate-950">密训尾款工单.xlsx</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              导入到学员、报名、退款层，回写营期、负责人、尾款状态、退款原因、沟通记录。
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>转化期数 - {">"} `cohorts`</li>
              <li>手机号/微信昵称 - {">"} `students`</li>
              <li>尾款情况/退费原因 - {">"} `enrollments` + `refund_requests`</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">后端表</p>
            <h4 className="mt-2 text-lg font-semibold text-slate-950">营期-转化率-营收统计.xlsx</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              不再手工维护，系统根据前端导入和中端导入后的明细自动按营期、归属人汇总生成。
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>分配例子数 - {">"} `lead_assignments` 聚合</li>
              <li>全款率/占位率/尾款率 - {">"} `sales_funnel_events` 聚合</li>
              <li>营收/ROI - {">"} `enrollments` + `roi_period_stats` 聚合</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="后端汇总定位" subtitle="这张表应作为系统自动汇总输出，不应继续手工填。">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <p>当前后端表路径：{BACK_DEFAULT}</p>
          <p className="mt-2">
            系统会按营期、归属人自动生成“分配例子数、添加率、进群率、全款率、占位率、尾款率、营收、成本、ROI”。
          </p>
          <p className="mt-2">当前页面支持直接上传 Excel，Codex 环境下也优先建议走上传，不依赖外部路径权限。</p>
          <div className="mt-4">
            <a className="btn-secondary" href="/api/reports/backend-summary">
              下载系统生成的后端汇总 Excel
            </a>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="系统内经营汇总预览" subtitle="这部分是未来替代《营期-转化率-营收统计.xlsx》的自动汇总。">
        <div className="table-shell shadow-none">
          <table>
            <thead>
              <tr>
                <th>营期</th>
                <th>归属人</th>
                <th>分配例子数</th>
                <th>添加例子数</th>
                <th>进群</th>
                <th>占位数</th>
                <th>总单数</th>
                <th>高客单</th>
                <th>营收</th>
                <th>成本</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row) => (
                <tr key={`${row.营期}-${row.归属人}`}>
                  <td>{row.营期}</td>
                  <td>{row.归属人}</td>
                  <td>{row.分配例子数}</td>
                  <td>{row.添加例子数}</td>
                  <td>{row.进群}</td>
                  <td>{row.占位数}</td>
                  <td>{row.总单数}</td>
                  <td>{row.高客单}</td>
                  <td>{formatMoney(row.营收)}</td>
                  <td>{formatMoney(row.成本)}</td>
                  <td>{(row.ROI * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
