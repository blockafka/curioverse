# 瞬息全宇宙：并行开发接口契约 V0

## 目标

这份文档用于四人并行开发。前端、知乎数据、AI 探索引擎和集成层只通过下面约定的接口通信；各模块可以先使用 Mock 独立开发，最后再替换真实实现。

> 官方 API mock 入口：`apps/api/src/providers/mock-zhihu-official-api.ts`；完整原始响应 fixture：`fixtures/zhihu-official-api.json`。

## 模块上下游

```text
前端 Web
  ↓ REST JSON
API Routes
  ↓ ExplorationOrchestrator
探索引擎
  ├─→ ZhihuProvider
  └─→ AiProvider
```

- A 前端只依赖 `packages/contracts` 和 `apps/web/src/api/client.ts`。
- B 知乎数据只负责把知乎 CLI/HTTP 返回值转换成统一的 `ContentSource`。
- C 探索引擎只接收标准化内容，输出 `ExplorationNode`，不处理知乎原始 JSON。
- D 集成层负责 REST 路由、Mock、分享链接、部署和联调。

## 0. 接口调用方向总览

这里的“给”指的是：左侧模块调用右侧模块，并把表格中的数据传过去；返回值沿相反方向返回。

| 调用方 | 被调用方 | 接口 / 方法 | 调用方传入 | 被调用方返回 |
|---|---|---|---|---|
| A 前端 Web | D API Routes | `POST /api/v1/explorations` | 用户问题 | `ExplorationSession` |
| A 前端 Web | D API Routes | `POST /:id/choices` | 会话 ID、节点 ID、选项 ID | 下一轮 `ExplorationSession` |
| A 前端 Web | D API Routes | `GET /:id` | 会话 ID | 当前 `ExplorationSession` |
| A 前端 Web | D API Routes | `POST /:id/feedback` | 会话 ID、节点 ID、反馈信号 | `{ ok: true }` |
| D API Routes | C ExplorationOrchestrator | `create` / `choose` / `get` / `feedback` | 前端请求对应的业务参数 | 探索会话或处理结果 |
| C ExplorationOrchestrator | B ZhihuProvider | `search` | 问题或下一轮关键词 | 标准化 `ContentSource[]` |
| C ExplorationOrchestrator | C AiProvider | `generateNodes` | 问题、知乎内容、探索轮次、用户路径 | `ExplorationNode[]` |
| D API Routes | A 前端 Web | HTTP 响应 | 业务处理结果或错误 | 页面展示、进度更新或错误提示 |

完整链路是：

```text
A 前端
  → D API Routes
    → C ExplorationOrchestrator
      → B ZhihuProvider
      ← 标准化 ContentSource[]
      → C AiProvider
      ← ExplorationNode[]
    ← ExplorationSession
  ← HTTP JSON 响应
```

B 不把知乎原始 JSON 给 A 或 C；B 只把标准化后的 `ContentSource[]` 给 C。C 不把 Prompt 或模型原始响应给 D；C 只把经过协议校验的 `ExplorationSession` / `ExplorationNode[]` 给 D。

## 1. 前端调用 API

### 创建探索

**调用方向：A 前端 Web → D API Routes → C ExplorationOrchestrator。**

创建探索时，A 把用户问题给 D；D 再把问题给 C；C 会向 B 请求知乎内容，并向 `AiProvider` 请求探索节点；最后结果由 C 返回给 D，再由 D 返回给 A。

```http
POST /api/v1/explorations
Content-Type: application/json
```

请求：

```json
{
  "question": "为什么年轻人越来越喜欢徒步？"
}
```

Mock 响应：

```json
{
  "id": "mock-session-001",
  "seedQuestion": "为什么年轻人越来越喜欢徒步？",
  "status": "active",
  "round": 0,
  "pathNodeIds": [],
  "nodes": [
    {
      "id": "story-1",
      "type": "story",
      "title": "从周末逃离城市开始",
      "summary": "有人把徒步当成短暂离开日常节奏的方式。",
      "sourceRefs": [
        {
          "id": "mock-source-1",
          "title": "知乎示例内容",
          "url": "https://www.zhihu.com/",
          "sourceType": "zhihu-story"
        }
      ],
      "choices": [
        { "id": "choice-1", "label": "继续了解这种生活方式" },
        { "id": "choice-2", "label": "看看不同人的反对理由" }
      ]
    },
    {
      "id": "counterpoint-1",
      "type": "counterpoint",
      "title": "徒步不一定适合所有人",
      "summary": "时间、体力和装备成本，都会影响真实体验。",
      "sourceRefs": [
        {
          "id": "mock-source-2",
          "title": "知乎示例讨论",
          "url": "https://www.zhihu.com/",
          "sourceType": "zhihu-question"
        }
      ],
      "choices": [
        { "id": "choice-3", "label": "寻找低门槛的尝试方式" },
        { "id": "choice-4", "label": "比较不同生活选择" }
      ]
    },
    {
      "id": "application-1",
      "type": "application",
      "title": "先从城市周边半日路线开始",
      "summary": "把兴趣转化成一次低成本、可验证的现实体验。",
      "sourceRefs": [
        {
          "id": "mock-source-3",
          "title": "知乎示例知识",
          "url": "https://www.zhihu.com/",
          "sourceType": "zhihu-knowledge"
        }
      ],
      "choices": [
        { "id": "choice-5", "label": "生成我的第一次探索计划" },
        { "id": "choice-6", "label": "邀请朋友一起继续" }
      ]
    }
  ],
  "createdAt": "2026-09-06T00:00:00.000Z"
}
```

### 创建探索 Mock 字段说明

| 字段 | 类型 | 含义 | 前端怎么用 |
|---|---|---|---|
| `id` | `string` | 一次探索会话的唯一 ID | 后续请求放在 URL 中，例如 `mock-session-001` |
| `seedQuestion` | `string` | 用户最初输入的问题 | 展示在页面顶部，也用于生成后续内容 |
| `status` | `"active" \| "completed"` | 探索是否结束 | `active` 显示继续探索，`completed` 显示路线结果 |
| `round` | `number` | 当前探索轮数，从 `0` 开始 | 显示进度；初版最多 2 轮 |
| `pathNodeIds` | `string[]` | 用户已经走过的节点 ID | 画路线、生成分享链接、恢复探索进度 |
| `nodes` | `ExplorationNode[]` | 当前页面可以展示的探索节点 | 渲染故事、反观点、现实应用卡片 |
| `createdAt` | ISO 时间字符串 | 会话创建时间 | 记录会话，不负责展示也可以 |

#### `nodes` 中每个节点的字段

| 字段 | 类型 | 含义 | 示例 |
|---|---|---|---|
| `id` | `string` | 节点唯一 ID | `story-1` |
| `type` | `string` | 节点的内容方向 | `story` 故事、`counterpoint` 反观点、`application` 现实应用 |
| `title` | `string` | 卡片标题 | “从周末逃离城市开始” |
| `summary` | `string` | 卡片的简短解释 | 用于卡片正文，避免一次展示过多内容 |
| `sourceRefs` | `SourceRef[]` | 支撑该节点的知乎来源 | 点击后打开来源链接，证明内容依据 |
| `choices` | `ExplorationChoice[]` | 用户下一步可以选择的方向 | 渲染为按钮或卡片底部选项 |

#### `sourceRefs` 中每个来源的字段

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | `string` | 来源在本次探索中的唯一 ID |
| `title` | `string` | 来源内容标题 |
| `url` | `string` | 原始知乎内容链接 |
| `sourceType` | `string` | 来源类型：`zhihu-question`、`zhihu-story`、`zhihu-search`、`zhihu-knowledge` 或 `other` |

#### `choices` 中每个选项的字段

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | `string` | 选项唯一 ID，提交选择时使用 |
| `label` | `string` | 用户看到的选项文字 |

### 提交选择

**调用方向：A 前端 Web → D API Routes → C ExplorationOrchestrator。**

A 把用户点击的节点和选项给 D，D 把业务参数给 C；C 根据选择向 B 请求下一轮内容，并调用 `AiProvider` 生成下一批节点；D 再把新的会话状态给 A。

```http
POST /api/v1/explorations/mock-session-001/choices
Content-Type: application/json
```

请求：

```json
{
  "nodeId": "story-1",
  "choiceId": "choice-1"
}
```

字段说明：

| 字段 | 类型 | 含义 |
|---|---|---|
| `nodeId` | `string` | 用户当前正在阅读的节点 ID |
| `choiceId` | `string` | 用户点击的选项 ID，必须属于该节点的 `choices` |

Mock 响应继续返回一个 `ExplorationSession`，其中：

- `round` 增加 1；
- `pathNodeIds` 增加当前 `nodeId`；
- `nodes` 返回下一轮的探索节点；
- 最多进行 2 轮，第二轮后 `status` 改为 `completed`。

### 获取探索状态

**调用方向：A 前端 Web → D API Routes → C ExplorationOrchestrator。**

A 只提供会话 ID，D 向 C 请求会话状态，C 返回完整的 `ExplorationSession`，D 原样或按协议返回给 A。

```http
GET /api/v1/explorations/mock-session-001
```

响应：完整的 `ExplorationSession`，前端可据此恢复页面或打开分享链接。

### 提交反馈

**调用方向：A 前端 Web → D API Routes → C ExplorationOrchestrator。**

A 把用户对节点的反馈给 D，D 再交给 C 记录；反馈不需要调用知乎接口或 AI 接口。

```http
POST /api/v1/explorations/mock-session-001/feedback
Content-Type: application/json
```

请求：

```json
{
  "nodeId": "story-1",
  "signal": "useful"
}
```

其中 `signal` 只能是 `useful`、`surprising` 或 `boring`，Mock 响应为：

```json
{
  "ok": true
}
```

字段说明：

| 字段 | 类型 | 含义 |
|---|---|---|
| `ok` | `boolean` | 是否成功记录反馈；`true` 表示已记录 |

反馈请求字段：

| 字段 | 类型 | 含义 |
|---|---|---|
| `nodeId` | `string` | 用户反馈对应的节点 ID |
| `signal` | `string` | 用户感受：`useful` 有用、`surprising` 惊讶、`boring` 无聊 |

## 2. 后端 Provider 接口

### 知乎数据 Provider

**调用方向：C ExplorationOrchestrator → B ZhihuProvider。**

C 给 B 一个问题或关键词，B 负责调用知乎 CLI/HTTP 并把结果整理后返回给 C。

B 的实现可以来自 CLI 或 HTTP，但 C 不应该感知调用方式。

```ts
export type ContentSource = {
  id: string
  title: string
  url: string
  summary: string
  contentType: "answer" | "article" | "story" | "question"
  author?: string
  voteUpCount?: number
  commentCount?: number
}

export interface ZhihuProvider {
  search(query: string, count?: number): Promise<ContentSource[]>
}
```

`ContentSource` 字段说明：

| 字段 | 类型 | 含义 | 来源映射 |
|---|---|---|---|
| `id` | `string` | 标准化后的内容 ID | 知乎 `ContentID` |
| `title` | `string` | 内容标题 | 知乎 `Title` |
| `url` | `string` | 内容原始链接 | 知乎 `Url` |
| `summary` | `string` | 内容摘要或正文片段 | 知乎 `ContentText` |
| `contentType` | `string` | 内容类型 | 统一为小写的 `answer`、`article`、`story` 或 `question` |
| `author` | `string?` | 作者名称，可没有 | 知乎 `AuthorName` 或用户数据中的 `Author.Name` |
| `voteUpCount` | `number?` | 获赞数，可没有 | 知乎 `VoteUpCount` 或 `LikeCount` |
| `commentCount` | `number?` | 评论数，可没有 | 知乎 `CommentCount` |

`ZhihuProvider.search` 参数说明：

| 参数 | 类型 | 含义 |
|---|---|---|
| `query` | `string` | 用户输入的问题或下一轮探索关键词 |
| `count` | `number?` | 希望返回的内容数量；当前 Mock 默认返回固定数据 |
| 返回值 | `Promise<ContentSource[]>` | 标准化后的知乎内容列表，不返回原始 CLI JSON |

B 负责：

- 处理 `Code` 业务错误和 CLI 退出码；
- 统一 `ContentType` 的大小写和可选字段；
- 把 `ContentText` / 摘要转换为 `summary`；
- 保留原始知乎 URL、作者和互动数据；
- 内部处理缓存、鉴权和网络错误。

### AI Provider

**调用方向：C ExplorationOrchestrator → C AiProvider。**

探索编排器把问题和 B 返回的标准化内容给 `AiProvider`，`AiProvider` 返回节点草稿；C 再负责协议校验和会话状态更新。

```ts
export interface AiProvider {
  generateNodes(input: {
    question: string
    sources: ContentSource[]
    round: number
    selectedPath: string[]
  }): Promise<ExplorationNode[]>
}
```

`generateNodes` 参数说明：

| 字段 | 类型 | 含义 |
|---|---|---|
| `question` | `string` | 用户最初的问题 |
| `sources` | `ContentSource[]` | B 提供的标准化知乎内容 |
| `round` | `number` | 当前是第几轮探索，用于控制内容深度 |
| `selectedPath` | `string[]` | 用户已经选过的节点 ID，用于避免重复推荐 |
| 返回值 | `Promise<ExplorationNode[]>` | C 生成并校验后的探索节点 |

C 负责：

- 从 `sources` 中生成 `story`、`counterpoint`、`application` 三类节点；
- 每个节点至少保留一个 `sourceRefs`；
- 输出必须通过 `ExplorationNodeSchema` 校验；
- 生成失败时返回 Fixture 节点，不阻塞前端 Demo；
- 控制探索轮数和节点数量，不生成无限聊天。

### 探索编排器

**调用方向：D API Routes → C ExplorationOrchestrator。**

D 把前端请求转换成编排器方法参数，C 完成探索业务后把结果返回给 D；D 不参与节点生成。

```ts
export interface ExplorationOrchestrator {
  create(input: CreateExplorationRequest): Promise<ExplorationSession>
  choose(
    sessionId: string,
    input: ChooseExplorationRequest
  ): Promise<ExplorationSession>
  get(sessionId: string): Promise<ExplorationSession>
  feedback(sessionId: string, input: ExplorationFeedback): Promise<void>
}
```

`ExplorationOrchestrator` 方法说明：

| 方法 | 参数 | 返回值 | 作用 |
|---|---|---|---|
| `create` | `question` | `ExplorationSession` | 创建新会话并生成第一批节点 |
| `choose` | `sessionId`、`nodeId`、`choiceId` | `ExplorationSession` | 记录选择并生成下一轮节点 |
| `get` | `sessionId` | `ExplorationSession` | 获取当前会话，用于刷新或分享链接 |
| `feedback` | `sessionId`、`nodeId`、`signal` | `Promise<void>` | 记录用户对节点的反馈 |

D 的路由层只调用这个接口，不直接调用知乎或 AI Provider。

## 3. 共享协议

共享类型统一维护在：

```text
packages/contracts/src/exploration.ts
```

当前已有：

- `SourceRef`
- `ExplorationChoice`
- `ExplorationNode`
- `ExplorationSession`
- `CreateExplorationRequest`
- `ChooseExplorationRequest`
- `ExplorationFeedback`

任何请求或响应字段变更，都必须先修改共享协议，再同步前后端；不要在业务代码里复制一份类型。

## 4. Mock 开发规则

- 前端默认使用 `fixtures/exploration-demo.json`，不等待后端完成。
- 合法问题先返回固定 Fixture，保证页面开发和演示稳定。
- 空问题返回 HTTP `400`。
- 未接入真实编排时，后端探索接口返回 HTTP `501`，健康检查仍返回 `200`。
- 真实知乎或 AI 接入失败时，回退到 Fixture，不让 Demo 白屏。
- Mock 数据必须和 `ExplorationSessionSchema` 保持一致。

## 5. 每个人的交付验收

### A：前端

- 可以用 Mock 完成“输入问题 → 选择节点 → 查看路线 → 复制分享链接”；
- 390px 手机宽度和 1440px 桌面宽度下均可操作；
- 不出现知乎 API Key 或模型密钥。

### B：知乎数据

- 给定一个 query 能返回标准化 `ContentSource[]`；
- 原始 CLI/HTTP 错误不会被误判为空结果；
- 搜索、故事、知识内容都能映射到统一来源结构。

### C：AI 探索引擎

- 给定标准化来源能返回合法 `ExplorationNode[]`；
- 节点类型、选择项和来源完整；
- 无模型或模型失败时能返回 Fixture。

### D：协议与集成

- REST 路由严格遵循本文档；
- Mock、真实 Provider 和前端都能通过共享协议联调；
- `npm run typecheck`、`npm run build` 和 `GET /health` 均通过。

## 6. 接口交接清单

| 交接 | 谁负责提供 | 谁负责消费 | 交付内容 |
|---|---|---|---|
| 前端 ↔ API | D | A | REST 路径、请求字段、响应字段、错误格式 |
| API ↔ 探索引擎 | C | D | `ExplorationOrchestrator` 方法和返回的 `ExplorationSession` |
| 探索引擎 ↔ 知乎数据 | B | C | `ZhihuProvider.search` 和 `ContentSource[]` |
| 探索引擎 ↔ AI | C | C | `AiProvider.generateNodes` 和 `ExplorationNode[]` |
| Mock ↔ 前端 | D | A | `fixtures/exploration-demo.json` 和固定会话 ID |

任何人需要改接口时，先说明“调用方、被调用方、输入字段、输出字段和兼容方式”，再修改 `packages/contracts`。

## 7. 知乎官方 API Mock 对照

### 谁调用谁

集成层 D 通过 `MockZhihuOfficialApi` 模拟调用知乎官方接口；B 的 `createMockZhihuProvider` 只调用 `searchZhihu`，并把官方原始字段转换成 C 使用的标准化 `ZhihuSource`。

```text
D / B Mock caller
  → MockZhihuOfficialApi
    → fixtures/zhihu-official-api.json
      → 官方原始响应 Code / Message / Data
        → zhihu-official-adapter.ts
          → C 使用的 NormalizedSearchSource[]
```

### 命令与 mock 数据

| 官方命令 | mock 方法 | fixture key | 重要规则 |
|---|---|---|---|
| `quota` | `quota()` | `quota` | `Data` 是 7 项额度数组；查询本身不消耗额度 |
| `search zhihu` | `searchZhihu(query, count)` | `searchZhihu` | `count` 按官方范围 1–10 处理；`ContentType` 为大写 `Answer` / `Article` |
| `search global` | `searchGlobal(query, count)` | `searchGlobal` | `count` 按官方范围 1–20 处理；`ContentText` 保留 `<em>` 高亮 |
| `hot` | `hot(limit)` | `hot` | `limit` 按官方范围 1–30 处理；`ThumbnailUrl` 和 `Summary` 即使没有内容也返回空字符串 |
| `answer` | `answer(question, options)` | `answer` | 支持 `json`、`sse`、`text`；JSON 使用 Chat Completions 结构，不套 `Code` 外层 |
| `me contents` | `meContents(contentType, offset)` | `meContents` | `ContentType` 是小写；返回 `Paging`，`NextOffset` 是字符串 |
| `me followees` | `meFollowees(offset)` | `meFollowees` | `Gender` 使用 0/1/2；返回 `Paging` |
| `me favorites lists` | `meFavoritesLists()` | `meFavoritesLists` | 无 `Paging`；收藏夹 `UrlToken` 可为数字或字符串 |
| `me favorites recent` | `meFavoritesRecent()` | `meFavoritesRecent` | 只返回近期批次；无 `Offset`、无 `Paging` |
| `me favorites items` | `meFavoritesItems(urlToken, offset)` | `meFavoritesItems` | `urlToken` 必填；返回收藏内容和 `Paging` |
| `knowledge bases` | `knowledgeBases(scope)` | `knowledgeBases` | `KnowledgeBaseID` 按十进制字符串传递；不分页 |
| `knowledge items` | `knowledgeItems(baseId, limit, cursor)` | `knowledgeItems` | `limit` 按官方范围 1–20；`NextCursor` 视为不透明值 |
| `knowledge search` | `knowledgeSearch(input)` | `knowledgeSearch` | `baseId` 或 `scope[]` 至少提供一个；每个命中项的 `Content` 保持有序字符串数组，不拼接 |
| `knowledge upload` | `knowledgeUpload(fileName, fileSize, baseId)` | `knowledgeUpload` | 单文件超过 100 MiB 返回参数错误；上传 mock 保留同步成功响应 |
| `scripts/run.sh status` | `status()` | `status` | CLI 生命周期响应使用 `{ ok, ... }`，不是业务 `Code` 外层 |
| `scripts/setup.sh` | `setup()` | `setup` | 返回安装、复用 CLI、凭证状态和 `next_action` |
| `auth set --secret-stdin` | `authSet()` | `authSet` | 只使用脱敏掩码，不在仓库保存 Access Secret |
| `auth status` | `authStatus(verify)` | `authStatus` | 默认本地检查，不联网、不消耗额度；`verify` 参数只保留接口语义 |

### 原始字段如何给探索引擎

`search zhihu` / `search global` 的官方字段在 `zhihu-official-types.ts` 中保持原样。B 的适配层只做以下明确转换：

| 官方字段 | 标准化字段 | 转换含义 |
|---|---|---|
| `ContentID` | `id` | 内容唯一标识 |
| `Title` | `title` | 标题原文 |
| `Url` | `url` | 原始内容链接 |
| `ContentText` | `summary` | 内容摘要；只移除全网搜索高亮标签 `<em>` |
| `ContentType` | `contentType` | `Answer` / `Article` 转成小写 |
| `AuthorName` | `author` | 作者名称 |
| `VoteUpCount` | `voteUpCount` | 获赞数 |
| `CommentCount` | `commentCount` | 评论数 |
| `AuthorityLevel` | `authorityLevel` | 官方字符串 `"1"`–`"4"` 转成数字 1–4 |
| `RankingScore` | `rankingScore` | 搜索排序分 |
| `CommentInfoList[].Content` | `comments[]` | 精选评论内容；没有时返回空数组 |

`assertOfficialSuccess` 会先检查 `Code`：非零业务错误会抛出错误，绝不会把 `Code: 20001`、`30002` 等鉴权或额度错误当成空结果。可复用的业务错误样本位于 `fixtures.errors.business`，直答错误和 CLI 错误分别位于 `fixtures.errors.directAnswer`、`fixtures.errors.cli`。
