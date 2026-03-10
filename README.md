# 密训课程退款风控与晚退费管理系统

面向“低价课 -> 企微 -> 公开课 -> 密训 2.0 -> 占位卡 -> 尾款 -> 正式报名 -> 开课前退款风控”的业务原型系统。

核心目标不是卡退款，而是把退款预警、分层处理、ROI 影响和责任归因做成一套可运行的业务后台。

## 1. 已实现能力

- 学员主档案：新增学员、绑定期次、销售、交付负责人。
- 线索池：记录投放计划、素材、进线时间、质量分、意向等级、当前销售负责人。
- 分配承接：记录线索分配、首响时间、是否超时、当前分配结果。
- 销售漏斗：记录加微、进群、占位卡、尾款、正式报名等前链路转化节点。
- 成交过程：记录低价课、企微、公开课、占位卡、尾款、正式报名节点。
- 风险预警：记录标准化风险信号并自动更新风险等级。
- 退款处理：发起退款申请，按一级销售 -> 二级交付 -> 三级主管流转。
- 处理留痕：所有退款动作会落到 `refund_actions`。
- ROI 分析：支持毛收入、净收入、毛 ROI、净 ROI、退款影响分析。
- 管理看板：总览、趋势、风险分布、退款工作台、期次/销售/交付/阶段/原因分析。

## 2. 技术栈

- 前端：Next.js 15 + React 19 + TypeScript
- 后端：Next.js App Router Route Handlers
- 数据库：SQLite
- ORM：Prisma
- 图表：Recharts
- 样式：Tailwind CSS

选择理由：

- 原型阶段本地启动快，依赖少。
- 页面和接口在同一工程内，交付速度高。
- Prisma schema 适合快速迭代业务模型。
- SQLite 方便本地演示和 seed 数据分发。

## 3. 项目结构

```text
app/
  api/                     # 接口层
  analytics/               # ROI 分析页
  funnel/                  # 销售漏斗页
  leads/                   # 线索池与分配页
  refunds/                 # 退款工作台
  risk/                    # 风险预警页
  students/                # 学员列表与详情
components/
  charts/                  # 图表组件
  forms/                   # 表单与业务动作组件
  layout/                  # 页面布局
lib/
  server/                  # Prisma、查询、聚合、回写逻辑
prisma/
  schema.prisma            # 数据模型
  seed.ts                  # 假数据
scripts/
  prepare-db.mjs           # 首次启动时自动创建 SQLite 文件
```

## 4. 数据库设计

以 `prisma/schema.prisma` 为最终准确定义，核心表如下：

- `students`
  - 学员主档案，保存基础信息、期次、负责人、当前状态、风险等级。
- `campaigns`
  - 投放计划表，记录投放渠道、计划、消耗。
- `ad_creatives`
  - 素材表，用于分析素材进量和质量。
- `leads`
  - 线索池表，管理学生转化前的进线数据。
- `lead_assignments`
  - 分配承接表，记录分配、接受、首响、超时。
- `sales_funnel_events`
  - 销售漏斗事件表，记录加微、进群、占位卡、尾款等节点。
- `enrollments`
  - 成交过程表，记录低价课、企微、公开课、占位卡、尾款、正式报名等节点。
- `risk_events`
  - 风险事件表，记录风险信号、发生阶段、严重度、记录人、时间。
- `refund_requests`
  - 退款申请表，记录当前处理层级、原因分类、金额、状态、最终结果。
- `refund_actions`
  - 退款动作日志，记录创建、升级、挽回、退款、结案等动作。
- `roi_period_stats`
  - 期次经营快照，记录投放、毛收入、退款额、净收入、毛 ROI、净 ROI。
- `users`
  - 系统账号，区分销售、交付、主管、管理员。
- `dictionaries`
  - 字典表，保存退款原因、风险信号、状态字典等标准化数据。
- `cohorts`
  - 期次表，用于多期次扩展和 ROI 汇总。

设计原则：

- 成交状态、风险状态、退款状态分离，不把所有业务硬塞进单一字段。
- 退款处理全程留痕，支持追责和复盘。
- 期次维度独立建模，便于未来扩展多课程版本、多招生团队。

## 5. API 列表

- `GET /api/dashboard`
  - 获取仪表盘总览、前链路漏斗、风险分布、退款趋势。
- `GET /api/analytics`
  - 获取 ROI 与退款归因分析数据。
- `GET /api/funnel`
  - 获取销售漏斗汇总和按销售漏斗分析。
- `POST /api/imports`
  - 导入前端《接量.xlsx》或中端《密训尾款工单.xlsx》。
- `GET /api/reports/backend-summary`
  - 下载系统自动生成的《营期-转化率-营收统计.xlsx》。
- `GET /api/leads`
  - 获取线索池列表，支持关键词、状态、负责人、计划筛选。
- `POST /api/leads`
  - 新增线索并进入分配池。
- `PATCH /api/leads/:id`
  - 执行线索重新分配或更新线索状态。
- `GET /api/students`
  - 获取学员列表，支持搜索、状态、负责人、期次筛选。
- `POST /api/students`
  - 新增学员并创建首条成交记录。
- `GET /api/students/:id`
  - 获取学员详情、时间线、风险事件、退款记录。
- `PATCH /api/students/:id`
  - 更新学员主档案、负责人、风险等级、金额等。
- `POST /api/risk-events`
  - 新增风险事件并自动刷新风险等级。
- `GET /api/refund-requests`
  - 获取退款工作台列表。
- `POST /api/refund-requests`
  - 发起退款申请并进入一级处理。
- `PATCH /api/refund-requests/:id`
  - 升级、挽回、退款、结案等退款流转动作。
- `GET /api/dictionaries`
  - 获取字典数据。

## 6. 本地启动

### 6.1 安装依赖

```bash
npm install
```

### 6.2 初始化数据库并灌入假数据

```bash
npm run db:setup
```

等价于：

```bash
npm run db:push
npm run db:seed
```

### 6.3 启动开发环境

```bash
npm run dev
```

浏览器访问：

- [http://localhost:3000](http://localhost:3000)
- 导入页：[http://localhost:3000/imports](http://localhost:3000/imports)

### 6.4 生产构建验证

```bash
npm run build
npm run start
```

## 7. Excel 导入与汇总

现在这 3 张表的系统定位如下：

- `接量.xlsx`
  - 作为前端明细源，导入到 `leads`、`lead_assignments`、`sales_funnel_events`
- `【珠峰学苑】密训尾款工单系统_密训营转数据.xlsx`
  - 作为中端明细源，导入到 `students`、`enrollments`、`refund_requests`
- `营期-转化率-营收统计.xlsx`
  - 不再手工维护，由系统自动汇总并支持下载

导入建议：

- 优先在 `/imports` 页面直接上传文件
- 中端表导入支持重复执行，不会重复创建同一笔导入退款单
- 导入中端表后，系统会自动重算营期 ROI 快照

## 8. 内置假数据

Seed 已内置：

- 3 个期次
- 6 个系统角色账号
- 3 个投放计划
- 5 个投放素材
- 18 条线索
- 12 个学员
- 多种风险信号
- 5 条退款申请
- 多级升级、挽回、已退款案例

数据覆盖以下场景：

- 已拍占位卡但未补尾款
- 正式报名后开课前退款预警
- 一级处理中、二级处理中、三级处理中
- 已挽回、已退款、已结案
- 多销售、多交付、多期次对比

## 9. 后续建议

- 接企微、通话、投放平台，自动生成风险事件。
- 增加退款 SLA、超时预警、主管待办。
- 增加课程版本、班主任、老师维度分析。
- 增加真实财务审批流与打款记录。
- 增加权限系统、登录、操作审计。
- 增加 AI 风险评分和退款话术辅助。
