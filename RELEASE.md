# 发布说明

本文档用于后续版本持续更新时的发版与交付流程。

## 当前版本

- 系统名称：`珠峰学员管理系统`
- 当前版本：`v1.0.0`

## 版本建议

建议按下面的规则维护版本号：

- `v1.0.1`
  - 小修复
  - 文案调整
  - 权限细节修正
  - 页面小范围优化

- `v1.1.0`
  - 新增完整模块
  - 新增业务流程节点
  - 新增报表口径
  - 新增岗位权限能力

- `v2.0.0`
  - 数据结构有不兼容升级
  - 核心流程重构
  - 部署架构明显变化

## 每次更新建议流程

### 1. 本地开发

```bash
npm install
npm run db:setup
npm run build
```

### 2. 更新版本号

修改 [package.json](E:\guanlixitong\package.json) 中的：

```json
"version": "1.0.0"
```

### 3. 更新变更记录

同步维护 [CHANGELOG.md](E:\guanlixitong\CHANGELOG.md)，至少写清：

- 新增了什么
- 修复了什么
- 哪些流程有变化
- 是否影响部署

### 4. 提交代码并打标签

```bash
git add .
git commit -m "Release v1.0.1"
git tag v1.0.1
git push origin main
git push origin v1.0.1
```

### 5. 生成交付包

```bash
npm run release:bundle
```

输出目录：

- `releases/珠峰学员管理系统-v版本号-交付包.zip`

这个交付包会自动包含：

- 源码
- Prisma 模型与 seed
- Docker 部署文件
- README
- CHANGELOG
- RELEASE

不会包含：

- `node_modules`
- `.next`
- 本地数据库临时锁文件
- 历史 zip 包

## GitHub 仓库建议

当前仓库：

- [https://github.com/soldier-zzr/guanlixitong](https://github.com/soldier-zzr/guanlixitong)

建议后续每个正式版本都：

1. 提交到 `main`
2. 打对应 `tag`
3. 生成 GitHub Release
4. 把本地交付包作为附件上传

## 部署更新建议

### 局域网版本

更新代码后执行：

```bash
npm install
npm run build
npm run start:lan
```

### Docker / 云端版本

更新代码后执行：

```bash
docker compose -f docker-compose.deploy.yml up -d --build
```

## 备注

- 如果未来切到 PostgreSQL，建议把版本升级记录里单独标明“数据库迁移步骤”。
- 如果以后增加财务、工单、导出等正式业务模块，建议至少按 `v1.1.x`、`v1.2.x` 这种节奏管理，不要继续长期停留在 `v1.0.0`。
