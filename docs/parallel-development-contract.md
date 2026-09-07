# 瞬悉全宇宙：四人分工与接口 Mock

这份文档只说明：谁负责哪部分代码、模块之间如何调用、每轮探索如何继续。

## 1. 一次探索怎么进行

### 首次进入

用户在 A 输入一个问题，A 只把 `query` 交给 D：

```http
POST /api/v1/explorations
Content-Type: application/json
```

```json
{
  "query": "为什么年轻人越来越喜欢徒步？"
}
```

D 调用 C，C 完成下面两步：

```text
C → B：用 query 搜索 1 条知乎内容
C → AI Provider：基于这 1 条内容生成 3 张候选卡片
```

三张卡片固定覆盖三个方向：`story` 故事、`counterpoint` 反观点、`application` 现实应用。

D 返回给 A：

```json
{
  "id": "demo-session",
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
          "id": "demo-source-1",
          "title": "知乎示例内容",
          "url": "https://www.zhihu.com/",
          "sourceType": "zhihu-search"
        }
      ]
    },
    {
      "id": "counterpoint-1",
      "type": "counterpoint",
      "title": "徒步不一定适合所有人",
      "summary": "时间、体力和装备成本，都会影响真实体验。",
      "sourceRefs": [
        {
          "id": "demo-source-1",
          "title": "知乎示例内容",
          "url": "https://www.zhihu.com/",
          "sourceType": "zhihu-search"
        }
      ]
    },
    {
      "id": "application-1",
      "type": "application",
      "title": "先从城市周边半日路线开始",
      "summary": "把兴趣转化成一次低成本、可验证的现实体验。",
      "sourceRefs": [
        {
          "id": "demo-source-1",
          "title": "知乎示例内容",
          "url": "https://www.zhihu.com/",
          "sourceType": "zhihu-search"
        }
      ]
    }
  ],
  "createdAt": "2026-09-05T00:00:00.000Z"
}
```

### 用户点击“继续”

节点不再包含 `choices`。用户看完一张卡片后点击“继续”，A 只提交被选中的 `nodeId`：

```http
POST /api/v1/explorations/demo-session/continue
Content-Type: application/json
```

```json
{
  "nodeId": "story-1"
}
```

D 调用 C，C 取出这张卡片的标题作为下一轮搜索词，再重复同样的流程：

```text
用户选中 story-1
  → C 读取标题“从周末逃离城市开始”
  → C 调 B.search("从周末逃离城市开始", 1)
  → C 调 AI Provider 生成下一轮 3 张候选卡片
  → D 返回新的 ExplorationSession
```

第一版先采用点击“继续”后再搜索，不提前为另外两张卡片搜索内容，避免无效请求。搜索词由 C 生成和管理，A 不自己拼搜索词。

每次继续后：

- `round` 加 1；
- `pathNodeIds` 追加用户选中的 `nodeId`；
- `nodes` 替换为下一轮的 3 张候选卡片；
- B 仍然只返回 1 条知乎内容。

### 什么时候结束

满足任一条件时，C 把会话改成 `completed`：

- 用户完成最多 3 次继续；
- 路径已经覆盖故事、反观点、现实应用三类；
- 用户主动结束探索。

完成时返回：

```json
{
  "status": "completed",
  "round": 3,
  "pathNodeIds": ["story-1", "counterpoint-2", "application-3"],
  "completion": {
    "reason": "all-types-covered",
    "routeTitle": "从徒步到重新认识生活",
    "routeSummary": "一条由知乎问题延伸出的探索路线"
  }
}
```

## 2. 四个人分别负责什么

### A：前端页面

负责代码：

```text
apps/web/src/App.tsx
apps/web/src/api/client.ts
fixtures/exploration-demo.json  # 页面独立开发时使用
```

负责：输入问题、展示三张卡片、处理“继续”、展示路径和完成页、生成分享入口、适配手机和电脑。

A 的上下游：

```text
用户 → A → D API Routes → A → 用户
```

A 不直接调用知乎 API，也不负责生成搜索词。

### B：知乎数据层

负责代码：

```text
apps/api/src/providers/mock-zhihu-official-api.ts
apps/api/src/providers/zhihu-official-types.ts
apps/api/src/providers/zhihu-official-adapter.ts
apps/api/src/providers/zhihu-provider.ts
fixtures/zhihu-official-api.json
```

负责：调用知乎官方 API 或 mock、处理官方错误、把官方原始字段转换成统一的 `ZhihuSource`。产品流程每轮只取 1 条内容。

B 的上下游：

```text
C ExplorationOrchestrator → B ZhihuProvider → 知乎 API / Mock
B ZhihuProvider → C ExplorationOrchestrator
```

接口：

```ts
export interface ZhihuProvider {
  search(query: string, count?: number): Promise<ZhihuSource[]>;
}
```

产品侧固定使用 `count = 1`。官方 fixture 保留多条 `Items`，只是为了测试官方接口的数量参数；不代表一次探索要展示多条内容。

B 返回给 C 的数据：

```ts
{
  id: "answer-001",
  title: "为什么年轻人越来越喜欢徒步？ - 知乎",
  url: "https://www.zhihu.com/question/100001/answer/200001",
  summary: "徒步提供了短暂离开日常节奏的机会。...",
  contentType: "answer",
  author: "作者A",
  voteUpCount: 147,
  commentCount: 8,
  authorityLevel: 4,
  rankingScore: 1.7927577,
  comments: ["低门槛的城市周边路线更容易坚持。"]
}
```

### C：探索编排和 AI 分析

负责代码：

```text
apps/api/src/domain/exploration-orchestrator.ts
apps/api/src/providers/ai-provider.ts
apps/api/src/providers/mock-ai-provider.ts
```

C 负责 AI 分析，具体工作是：

- 接收 D 传来的 `query`；
- 调 B 获取 1 条知乎内容；
- 把这 1 条内容交给 AI Provider；
- 生成故事、反观点、现实应用三张候选卡片；
- 用户继续后，用被选卡片的标题作为下一轮搜索词；
- 控制 `round`、`pathNodeIds` 和结束条件；
- 生成最终路线摘要。

C 调用 B：

```ts
const [source] = await zhihuProvider.search(query, 1);
```

C 调用 AI Provider：

```ts
export interface AiProvider {
  generateNodes(input: {
    query: string;
    source: ZhihuSource;
    selectedPath: string[];
    round: number;
  }): Promise<ExplorationNode[]>;
}
```

AI Provider 的 mock 输入是一条知乎内容：

```json
{
  "query": "为什么年轻人越来越喜欢徒步？",
  "source": {
    "id": "answer-001",
    "title": "为什么年轻人越来越喜欢徒步？ - 知乎",
    "summary": "徒步提供了短暂离开日常节奏的机会。",
    "contentType": "answer"
  },
  "selectedPath": [],
  "round": 0
}
```

AI Provider 的 mock 输出必须是 3 个 `ExplorationNode`，类型分别为 `story`、`counterpoint`、`application`，每个节点都保留带 `sourceType` 的 `sourceRefs`。

真实 AI 实现可以在同一个 `AiProvider` 接口下调用知乎官方 `answer`；`MockAiProvider` 只用于并行开发和离线演示。

### D：API 集成层

负责代码：

```text
apps/api/src/routes/exploration.ts
apps/api/src/index.ts
packages/contracts/src/exploration.ts
```

D 负责参数校验、调用 C、返回 JSON、维护共享协议和最终联调。

D 调用 C：

```ts
export interface ExplorationOrchestrator {
  create(input: { query: string }): Promise<ExplorationSession>;
  continue(
    sessionId: string,
    input: { nodeId: string }
  ): Promise<ExplorationSession>;
  get(sessionId: string): Promise<ExplorationSession>;
  feedback(sessionId: string, input: ExplorationFeedback): Promise<void>;
}
```

D 的 REST 接口：

| 方法 | 路径 | 请求 | 返回 |
|---|---|---|---|
| `POST` | `/api/v1/explorations` | `{ query }` | 首轮 `ExplorationSession` |
| `POST` | `/api/v1/explorations/:id/continue` | `{ nodeId }` | 下一轮或完成状态 |
| `GET` | `/api/v1/explorations/:id` | 会话 ID | 当前会话 |
| `POST` | `/api/v1/explorations/:id/feedback` | `{ nodeId, signal }` | `{ ok: true }` |

## 3. 共享数据类型

所有人引用：

```text
packages/contracts/src/exploration.ts
```

主要类型：

```text
SourceRef
ExplorationNode
ExplorationCompletion
ExplorationSession
CreateExplorationRequest
ContinueExplorationRequest
ExplorationFeedback
```

### `sourceType` 为什么保留

`sourceType` 表示来源性质，当前统一保留在 A 的 `sourceRefs` 中：

```text
zhihu-search     知乎搜索结果
zhihu-question   知乎问题
zhihu-story      知乎故事型来源
zhihu-knowledge  知识库来源
other            其他来源
```

它和 B 返回的 `contentType` 不同：`contentType` 表示内容是 `answer` 还是 `article`；`sourceType` 表示这条来源属于哪种来源场景。A 当前可以只展示标题和链接，但字段先保留，方便后续展示来源标签和做来源筛选。

## 4. Mock 文件对应关系

```text
fixtures/zhihu-official-api.json
  → B 的官方 API 原始响应 mock

fixtures/exploration-demo.json
  → C 的三类候选节点 + A 的首轮页面 mock

apps/api/src/providers/mock-ai-provider.ts
  → C 的 AI 输出 mock，一条知乎内容生成三张卡片
```

Mock 搜索会根据首轮问题和后续选中的卡片标题返回不同的知乎内容；Mock AI 会把传入的这一条内容写入三张卡片的 `sourceRefs`，并按 `round` 生成新的节点 ID。因此 mock 可以演示“继续后换内容”，而不是每一轮重复同一条来源。

当前 REST 路由和探索编排仍是骨架，部分接口返回 `501`；但字段、调用方向和 mock 数据已经按照“query → 1 条知乎内容 → 三张卡片 → continue → 下一轮”的流程定义。

## 5. 并行开发规则

1. A 只改 `apps/web` 和页面 fixture。
2. B 只改知乎 Provider、官方 API fixture 和适配层。
3. C 只改探索编排、AI Provider 和 AI mock。
4. D 只改 API Routes、入口和共享 contracts。
5. 接口字段变更时，先修改 `packages/contracts`，再同步其他模块。
6. 每个人先使用上游 mock 开发，最后由 D 完成真实串联。
