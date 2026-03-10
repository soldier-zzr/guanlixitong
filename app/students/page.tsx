import Link from "next/link";
import { Search } from "lucide-react";
import { CohortCreateForm } from "@/components/forms/cohort-create-form";
import { StudentCreateForm } from "@/components/forms/student-create-form";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/section-card";
import { StudentEditableTable } from "@/components/students/student-editable-table";
import { getLookupOptions, getStudents } from "@/lib/server/queries";
import { formatUserOptionLabel } from "@/lib/utils";

export default async function StudentsPage(props: {
  searchParams?: Promise<{
    search?: string;
    status?: string;
    ownerId?: string;
    cohortId?: string;
  }>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const [lookups, students] = await Promise.all([
    getLookupOptions(),
    getStudents({
      search: searchParams.search,
      status: (searchParams.status as never) ?? "ALL",
      ownerId: searchParams.ownerId ?? "ALL",
      cohortId: searchParams.cohortId ?? "ALL"
    })
  ]);

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        eyebrow="Students"
        title="学员主档案与成交过程"
        description="从低价课、加企微、公开课、占位卡、尾款到正式报名，把学员状态和负责人持续串起来。"
      />

      <SectionCard title="新增学员" subtitle="创建学员主档案并同步建立首条成交过程记录。">
        <StudentCreateForm cohorts={lookups.cohorts} users={lookups.users} />
      </SectionCard>

      <SectionCard
        title="营期维护"
        subtitle="营期默认按“起盘营 x 期”生成，也支持你自定义名称、编码和预算口径。"
      >
        <CohortCreateForm />
      </SectionCard>

      <SectionCard
        title="筛选器"
        subtitle="支持按手机号、姓名、来源活动搜索；销售可在列表直接快速修改是否报课、营期、赛道和负责人。"
      >
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" method="get">
          <div className="relative">
            <label className="field-label">关键词</label>
            <Search className="pointer-events-none absolute left-3 top-[38px] h-4 w-4 text-slate-400" />
            <input
              className="field pl-9"
              defaultValue={searchParams.search ?? ""}
              name="search"
              placeholder="手机号 / 姓名 / 活动"
            />
            <p className="mt-1 text-xs text-slate-500">支持完整手机号或末几位模糊筛选。</p>
          </div>
          <div>
            <label className="field-label">状态</label>
            <select className="field" defaultValue={searchParams.status ?? "ALL"} name="status">
              <option value="ALL">全部状态</option>
              <option value="LOW_PRICE_PURCHASED">已购低价课</option>
              <option value="FINAL_PAYMENT_PENDING">待补尾款</option>
              <option value="FORMALLY_ENROLLED">已正式报名</option>
              <option value="REFUND_WARNING">退款预警</option>
              <option value="LEVEL1_PROCESSING">一级处理中</option>
              <option value="LEVEL2_PROCESSING">二级处理中</option>
              <option value="LEVEL3_PROCESSING">三级处理中</option>
              <option value="RETAINED">已挽回</option>
              <option value="REFUNDED">已退款</option>
            </select>
          </div>
          <div>
            <label className="field-label">负责人</label>
            <select className="field" defaultValue={searchParams.ownerId ?? "ALL"} name="ownerId">
              <option value="ALL">全部负责人</option>
              {lookups.users.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatUserOptionLabel(item)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">期次</label>
            <select className="field" defaultValue={searchParams.cohortId ?? "ALL"} name="cohortId">
              <option value="ALL">全部期次</option>
              {lookups.cohorts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-3">
            <button className="btn-primary flex-1" type="submit">
              应用筛选
            </button>
            <Link className="btn-secondary" href="/students">
              重置
            </Link>
          </div>
        </form>
      </SectionCard>

      <StudentEditableTable cohorts={lookups.cohorts} students={students} users={lookups.users} />
    </div>
  );
}
