# 珠峰学员管理系统

当前版本：`v1.0.0`

面向“投放录入 -> 销售承接 -> 学员主档 -> 风险预警 -> 退款工作台 -> ROI 复盘”的内部协作系统。

当前版本已经具备：
- 线索录入、批量导入、销售分配
- 私域承接、建档、成交推进
- 风险事件与自动预警
- 退款分层处理、审批留痕
- 营期 / 截止日期 / 预收净收口径 ROI
- 审计日志与营收台账

## 版本说明

- 当前稳定版本：`v1.0.0`
- 适用阶段：内部试跑、局域网协作、云端部署准备完成
- 后续建议：每次功能更新同步维护 [CHANGELOG.md](E:\guanlixitong\CHANGELOG.md)
- 发布流程说明见 [RELEASE.md](E:\guanlixitong\RELEASE.md)

## 技术栈

- 前端：Next.js 15 + React 19 + TypeScript
- 后端：Next.js Route Handlers
- ORM：Prisma
- 数据库：
  - 局域网试跑：SQLite
  - 云端 / 多人在线推荐：PostgreSQL

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
npm run db:setup
```

### 3. 启动开发环境

```bash
npm run dev
```

默认访问：
- [http://localhost:3000](http://localhost:3000)

默认管理员账号：
- 手机号：`13900000001`
- 密码：`zf123456`

## 版本发布与交付

### 1. 更新版本号

修改 [package.json](E:\guanlixitong\package.json) 中的 `version`。

### 2. 更新变更记录

同步维护 [CHANGELOG.md](E:\guanlixitong\CHANGELOG.md)。

### 3. 生成本地交付包

```bash
npm run release:bundle
```

打包完成后输出：

- `releases/珠峰学员管理系统-v版本号-交付包.zip`

详细发版规则见 [RELEASE.md](E:\guanlixitong\RELEASE.md)。

## 局域网部署

适用于公司内网 5-20 人试跑，同一台 Windows 主机对外提供访问。

### 1. 配置环境变量

复制 `.env.example` 为 `.env`，默认即可：

```env
DATABASE_URL="file:./prisma/dev.db"
PORT="3021"
HOSTNAME="0.0.0.0"
APP_BASE_URL="http://localhost:3021"
SEED_ON_BOOT="false"
```

### 2. 初始化数据库

```bash
npm run db:setup
```

### 3. 生产构建

```bash
npm run build
```

### 4. 启动局域网服务

方式一：

```bash
npm run start:lan
```

方式二（Windows PowerShell）：

```powershell
.\scripts\start-lan.ps1
```

启动后可通过以下地址访问：
- 本机：[http://localhost:3021](http://localhost:3021)
- 局域网示例：[http://你的电脑IP:3021](http://你的电脑IP:3021)

健康检查：
- [http://localhost:3021/api/health](http://localhost:3021/api/health)

### 5. 局域网部署建议

- 给这台机器固定局域网 IP。
- 放行 Windows 防火墙 `3021` 端口。
- 确保只运行一个服务实例，避免 SQLite 文件锁冲突。
- 若需要长期驻留，建议用“任务计划程序”开机启动 `npm run start:lan`。

## 云端 / 多人在线部署

如果准备让多人长期同时在线使用，建议直接切 PostgreSQL，再用 Docker Compose 部署。

### 方案结构

仓库已提供：
- [Dockerfile](E:\guanlixitong\Dockerfile)
- [docker-compose.deploy.yml](E:\guanlixitong\docker-compose.deploy.yml)
- [scripts/docker-entrypoint.sh](E:\guanlixitong\scripts\docker-entrypoint.sh)

### 1. 服务器准备

推荐：
- Ubuntu 22.04 / 24.04
- 2C4G 起步
- 安装 Docker 与 Docker Compose
- 放行 `3021` 端口

### 2. 设置生产环境变量

建议使用 PostgreSQL：

```env
DATABASE_URL="postgresql://zhufeng:zhufeng123@zhufeng-postgres:5432/zhufeng_student?schema=public"
PORT="3021"
HOSTNAME="0.0.0.0"
APP_BASE_URL="https://你的域名"
SEED_ON_BOOT="false"
```

### 3. 启动

```bash
docker compose -f docker-compose.deploy.yml up -d --build
```

系统会在容器启动时自动执行：
- `node scripts/prepare-db.mjs`
- `npx prisma db push --skip-generate`
- `npm run start -- --hostname 0.0.0.0 --port 3021`

### 4. 首次演示环境灌数

如果需要演示数据，把 `SEED_ON_BOOT` 改成 `true`，首次启动后再改回 `false`。

### 5. 反向代理建议

生产上建议在 Nginx / Caddy / 云负载均衡后面挂载：
- `https://你的域名 -> http://127.0.0.1:3021`

### 6. 健康检查

云平台可直接用：
- `GET /api/health`

返回示例：

```json
{
  "status": "ok",
  "app": "珠峰学员管理系统",
  "database": "connected"
}
```

## 数据模型升级要点

### 状态唯一入口

- 线索状态：`Lead`
- 报名状态：`Enrollment`
- 退款状态：`RefundRequest`
- 学员主档：只保存当前汇总态，不作为流程主源

### 审计与台账

- `AuditLog`：记录谁改了什么
- `RevenueLedger`：记录占位卡、尾款、退款、确认收入

### 多次进线 / 多次报名

- 同手机号允许多条 `Lead`
- 同手机号学员复用 `Student`
- 不同营期报名新增 `Enrollment`

## 关键接口

- `GET /api/health`
  - 应用和数据库健康状态
- `GET /api/students`
  - 学员列表，按当前账号视角自动收口
- `PATCH /api/students/:id`
  - 学员主档编辑，不允许直接推进退款流程状态
- `GET /api/leads`
  - 线索列表
- `PATCH /api/leads/:id`
  - 承接状态或重新分配
- `GET /api/refund-requests`
  - 退款工作台
- `PATCH /api/refund-requests/:id`
  - 升级、审批、挽回、退款、结案
- `GET /api/analytics`
  - `mode=COHORT | AS_OF_DATE | NET_CASH`

## 我们已经验证过的环节

- 学员页不能直接把状态改成 `REFUNDED`
- 同手机号重复导入线索会生成多条线索实例
- 同手机号再次报名只新增 `Enrollment`
- 一级销售 -> 二级交付 -> 审批 -> 退款回写流程可跑通
- 学员状态、退款单状态、营收台账、审计日志可同步
- 投放、销售、交付、审批人视角权限已做后端校验

## 当前已知建议

- 局域网单机版本仍推荐只跑一个实例。
- 真正多人长期在线，优先使用 PostgreSQL 容器部署。
- 若接入正式财务口径，下一步建议加账单核对与导出。
