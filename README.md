# 智能位置推荐助手

![License](https://img.shields.io/badge/License-MIT-green.svg) ![Node](https://img.shields.io/badge/node-%3E%3D18.0-blue) ![React](https://img.shields.io/badge/react-18.3-blue?logo=react) ![Vite](https://img.shields.io/badge/vite-6.x-646CFF?logo=vite) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript) 

智能位置推荐应用，基于高德地图 API 与 AI 模型，为多人场景提供更公平、更高效的聚会地点选择与出行建议。

## 简介

通过输入多个位置点与关键词，系统会进行周边检索、地理分析与路线计算，并结合评分与营业信息生成 Top 推荐，支持动态生成个性化推荐理由与路线解说。适用于朋友聚会、家庭用餐、团队活动、商务会面等场景。
![alt text](image/介绍图.png)

## 主要使用的高德开放平台能力

地图展示 / 地理编码 / 逆地理编码 / 路线规划 / POI 搜索 / 输入提示 / 实时位置 / IP 定位 / 天气查询 / MCP

## 功能

- 🗺️ 多点输入：地图点击、地址搜索、经纬度输入，最多 10 点
- 🔎 周边检索：按关键词、评分、预算、半径过滤候选地点
- 🚦 路线计算：驾车/公交/步行/骑行时间综合评估
- 🤖 AI理由：为每个推荐生成个性化中文理由与建议（后台串行生成，不阻塞列表）
- 🔥 搜索热词：进入页面后台生成 6 条热词，支持一键刷新
- 🧩 扩展搜索词：展示在进度面板中（避免页面重复信息），完整短语与品牌词优先
- 📦 生成更多：支持批量追加 5 条，累计最多 20 条，严格尾部追加与去重
- ✅ 信息验证：集成 MCP 验证与置信度评分（可选）
- 🧭 可视化展示：地图标记、路线动画、信息弹窗与图片预览

## 安装

```bash
npm install
```

## 配置

- 高德地图 API 密钥：用于地图、地址解析与路线规划
- ModelScope API 密钥：用于生成 AI 推荐理由（可使用默认密钥）

在应用右上角“设置”中填写密钥并保存。

## 用法

1. 在地图上添加多个位置点（或使用地址/经纬度）。位置输入面板默认收起，点击左上角按钮展开
2. 输入要搜索的场所类型关键词（如“咖啡馆”、“火锅”）
3. 点击“搜索”，查看推荐卡片与地图结果。推荐理由会在卡片内以 Loading 占位，随后后台生成并平滑插入
4. 右上角“位置搜索”入口在地图右上角（面板收起时可见），点击可展开右侧搜索面板
4. 展开推荐卡片，查看评分、距离、联系方式与路线时间

## 技术栈

- 前端：React 18、TypeScript、Tailwind CSS、Lucide
- 状态：Zustand
- 地图：高德地图 API
- 构建：Vite
- 后端：Express（本地开发代理与示例 API）

## 目录结构

```
src/
├── components/           # 页面组件
├── services/             # 业务服务（搜索、路线、AI）
├── stores/               # 全局状态管理
├── types/                # 类型定义
└── App.tsx               # 主入口组件
```

## 本地开发

```bash
npm run dev
```

## 构建与预览

```bash
npm run build
npm run preview
```

## 部署

- EdgeOne Pages：上传 `dist` 目录或 `dist.zip` 即可部署静态站点
- 若使用部署接口，需要设置 `EDGEONE_PAGES_API_TOKEN` 环境变量

## 工作流

- 自然语言意图解析：将“口语化搜索”转为结构化筛选条件（关键词、评分、预算、半径、人数等）
- 周边地点检索：基于多个输入点的中心或权重计算，检索候选 POI
- 地理位置分析：计算距离、区域属性、基础信息增强
- 路线时长计算：按驾车/公交/步行/骑行估算到达时间
- 简化打分与排序：结合距离、评分、可达性等因素进行综合排序（完整短语/品牌匹配加权）
- 推荐理由生成：后端代理 AI 模型生成中文个性化推荐理由（含降级兜底）
- MCP验证与增强：对推荐结果进行合理性验证并提供上下文建议（可选）

对应代码路径示例：
- 前端步骤与进度显示与热词刷新：`src/components/SearchPanel.tsx`
- 简化打分与结果生成（完整短语加权）：`src/services/aiService.ts`
- 后端 AI 代理与兜底：`src/services/backendAiService.ts:35-127, 129-177, 180-229, 231-266`
- MCP 服务集成：`src/services/mcpService.ts:1-69, 134-188, 292-343, 418-458`
- 推荐服务整合、约束解析与“生成更多”：`src/services/recommendationService.ts`

## API 端点

- `POST /api/ai/parse-search-intent`：解析自然语言搜索意图（需 `X-API-Key`）
- `POST /api/ai/generate-recommendation-reason`：生成推荐理由（需 `X-API-Key`）
- `POST /api/ai/generate-route-narration`：生成路线口语化解说（需 `X-API-Key`）
- `POST /api/ai/generate-combined-recommendation`：生成综合推荐文案（需 `X-API-Key`）
- `GET /api/health`：健康检查

开发环境通过 Vite 代理将 `/api` 指向本地 Node 服务，避免跨域与路径问题。

## 数据结构

核心结构（部分字段）：
- `Recommendation`：`poi`（名称、地址、距离、评分、标签等）、`transportationTimes`（四种方式分钟数）、`routes`、`pointDistances`、`totalScore`、`reason`、`combinedRecommendation`、`confidence`、`mcpValidation`
- `RouteInfo`：`distance`、`duration`、`mode`
- `SearchIntent`：`keywords`、`budget_max`、`min_rating`、`distance_km`、`group_size`、`city`、`tags`

类型定义参考：`src/types/index.ts`

## 地图交互

- 定位到我：地图左下角图例上方提供“定位到我”按钮，点击将镜头移动到当前位置，并显示详细地址（支持 Loading 与防重复点击）
- 当前位置标点：鼠标悬浮或点击“我的位置”标点，弹窗展示反查地址与坐标信息
- 推荐标点：按序号标记（绿色），点击显示名称、地址、评分与路线摘要

## 移动端适配

- iPhone/Android：按钮触控面积统一 ≥ 44px；卡片文字在小屏保持可读（`text-xs`/`text-sm`）
- iPad：保持两栏布局可收起；在竖屏下优先使用收起入口以提升地图可用面积
- 输入与键盘：地址输入在获得焦点时滚动至可见区域，建议使用系统返回键关闭
- 安全区：顶栏与浮层靠边处预留安全区，避免贴边遮挡（适配状态栏/刘海）

## 开发配置

- Vite 开发代理：`vite.config.ts` 中将 `/api` 代理到 `http://localhost:3001`，并开启基本日志输出
- 构建产物：`dist`（`vite.config.ts:48`），入口 `index.html`（`vite.config.ts:50-53`），`base: './'` 适配静态部署（`vite.config.ts:56`）
- 依赖管理与脚本：`package.json` 包含 `dev`/`build`/`preview`/`lint`/`check` 等脚本
- 密钥管理：前端通过设置页写入浏览器 `localStorage`（键名如 `modelscope_api_key`），不写入仓库

## 错误与降级

- 意图解析或 AI 生成失败时，使用本地兜底文案保持连贯体验（推荐理由约 100 字，自动截断）
- 路线或检索失败时，显示友好提示并继续呈现可用信息
- MCP 验证失败时，不阻断流程，仅降低置信度与增强信息

## MCP 验证（可选）

- AMap MCP：POI 信息验证与增强（营业状态、拥挤度、交通可达性、营业时间、价格区间等）
- Context7 MCP：推荐合理性验证、备选方案与风险因素提示、上下文建议
- 最终返回 `confidence` 与 `details`，用于在 UI 中展示置信度和建议

## 贡献

欢迎提交 Issue 与 Pull Request，一起让位置推荐更聪明更贴心 ✨

## 许可证

MIT License © 2025 pickstar-2002（详见 `LICENSE` 文件）

## 联系方式

微信: pickstar_loveXX
## 近期更新

- 导航栏统一为胶囊风格，并加入“AI 在本项目中的角色”说明
- 位置输入面板默认收起，地图左上角提供展开入口；右侧“位置搜索”面板收起时在地图右上角提供展开入口
- 搜索热词后台生成并展示 6 条，支持刷新按钮；扩展搜索词移至进度面板展示，避免页面重复
- 推荐卡片先展示地点，推荐理由后台生成并淡入插入；“生成更多”严格尾部追加并去重，最多 20 条
- 地图就绪判断加固，避免在未初始化或销毁后调用 `setCenter / setZoom`
 - 地图图例上方新增“定位到我”按钮；“我的位置”标点悬浮/点击显示详细地址
