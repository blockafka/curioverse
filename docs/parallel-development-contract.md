# 瞬悉全宇宙：四人分工与 Mock 接口

这份文档只解决三件事：谁写哪部分代码、这部分代码做什么、和上下游怎么对接。

## 一、整体调用链

```text
A 前端
  → D API 集成层
    → C 探索引擎
      ├─→ B 知乎数据层
      └─→ C AI Provider
```

前端只调用 D 的 REST 接口；C 不接触知乎官方原始 JSON；B 负责把知乎数据转换成统一格式。

## 探索过程：一条内容，三个方向

每一轮只搜索一条知乎内容，再由 C 负责的 AI Provider 基于这一条内容生成三张候选卡片。三张卡片是三种不同的分析方向，不是三篇新的知乎内容。

```text
用户问题
  ↓ searchZhihu(query, 1)
一条知乎内容（Answer 或 Article）
  ↓ C 调用 AiProvider
故事 / 反观点 / 现实应用（三张候选卡片）
  ↓ 用户选择一张卡片中的一个继续方向
nextQuery（下一轮搜索词）
  ↓ searchZhihu(nextQuery, 1)
下一条知乎内容
```

具体例子：

```text
问题：为什么年轻人越来越喜欢徒步？

知乎内容：一篇讨论徒步与情绪恢复的回答

AI 生成三个方向：
1. 故事：有人如何通过徒步摆脱焦虑
2. 反观点：徒步并不适合所有人
3. 现实应用：如何设计一次低门槛徒步

用户选择：现实应用

下一轮搜索词：徒步 新手 低门槛 路线
```

一次选择对应一次新的搜索和一次新的 AI 分析。最多进行 3 次选择；探索过故事、反观点、现实应用三类，或用户主动结束时，C 生成最终的“一问到底”路线。

完成状态示例：

```json
{
  "id": "demo-session-completed",
  "seedQuestion": "为什么年轻人越来越喜欢徒步？",
  "status": "completed",
  "round": 3,
  "pathNodeIds": ["story-1", "counterpoint-2", "application-3"],
  "nodes": [],
  "completion": {
    "reason": "all-types-covered",
    "routeTitle": "从徒步到重新认识生活",
    "routeSummary": "一条由知乎问题延伸出的探索路线"
  },
  "createdAt": "2026-09-05T00:00:00.000Z"
}
```

## 二、四个人分别负责什么

### A：前端页面

负责代码：

```text
apps/web/src/App.tsx
apps/web/src/api/client.ts
fixtures/exploration-demo.json  # 页面独立开发时使用
```

负责的事情：

- 输入问题；
- 展示故事、反观点、现实应用三类卡片；
- 点击选项继续探索；
- 展示探索路径，并生成分享入口；
- 适配手机和电脑屏幕。

上游和下游：

```text
用户 → A 前端 → D API Routes
```

前端请求 mock：

```http
POST /api/v1/explorations
Content-Type: application/json
```

```json
{
  "question": "为什么年轻人越来越喜欢徒步？"
}
```

前端期望收到：

```json
{
  "id": "demo-session",
  "seedQuestion": "为什么年轻人越来越喜欢徒步？",
  "status": "active",
  "round": 0,
  "pathNodeIds": [],
  "nodes": [],
  "createdAt": "2026-09-05T00:00:00.000Z"
}
```

完整页面数据见 `fixtures/exploration-demo.json`。A 可以先直接读这个 fixture 开发页面，不必等待 B、C、D 完成。

### B：知乎数据层

负责代码：

```text
apps/api/src/providers/mock-zhihu-official-api.ts
apps/api/src/providers/zhihu-official-types.ts
apps/api/src/providers/zhihu-official-adapter.ts
apps/api/src/providers/zhihu-provider.ts
apps/api/src/providers/mock-ai-provider.ts  # C 的 AI 输出 mock
fixtures/zhihu-official-api.json
fixtures/exploration-demo.json             # AI 节点和页面会话 mock
```

负责的事情：

- 按知乎官方接口格式准备 mock 数据；
- 处理 `Code / Message / Data`；
- 处理搜索、热榜、知识库和本人数据等接口；
- 每轮搜索返回 1 条知乎内容给 C；
- 把官方字段转换成 C 使用的统一内容格式；
- 官方接口报错时不能误当成“没有搜索结果”。

上游和下游：

```text
C 探索引擎 → B ZhihuProvider → 知乎官方 API 或 Mock
B ZhihuProvider → C 探索引擎
```

C 调用 B 的接口：

```ts
export interface ZhihuProvider {
  search(query: string, count?: number): Promise<ZhihuSource[]>;
}
```

产品流程固定传 `count = 1`；接口仍保留 `count` 参数，是为了和官方搜索能力及测试 mock 对齐。
官方 fixture 中保留多条 `Items` 是为了测试官方返回结构和数量参数；产品流程只取第一条。

B 返回给 C 的统一数据：

```ts
{
  id: "answer-001",
  title: "为什么年轻人越来越喜欢徒步？ - 知乎",
  url: "https://www.zhihu.com/question/100001/answer/200001",
  summary: "徒步提供了短暂离开日常节奏的机会。",
  contentType: "answer",
  author: "作者A",
  voteUpCount: 147,
  commentCount: 8,
  authorityLevel: 4,
  rankingScore: 1.7927577,
  comments: ["低门槛的城市周边路线更容易坚持。"]
}
```

B 内部调用官方 mock 的方式：

```ts
const api = new MockZhihuOfficialApi();
const raw = await api.searchZhihu("徒步", 1);
const sources = normalizeSearchItems(assertOfficialSuccess(raw).Items);
```

官方原始响应保持原字段大小写：

```json
{
  "Code": 0,
  "Message": "success",
  "Data": {
    "HasMore": false,
    "SearchHashId": "mock-search-hash-zhihu-001",
    "Items": []
  }
}
```

完整官方 mock 数据见 `fixtures/zhihu-official-api.json`。

### C：探索引擎和 AI Provider

负责代码：

```text
apps/api/src/domain/exploration-orchestrator.ts
apps/api/src/providers/ai-provider.ts
```

负责的事情：

- 接收用户问题；
- 调用 B 获取知乎内容；
- 负责 AI 分析：调用 AI Provider，基于当前 1 条知乎内容生成故事、反观点、现实应用三张候选卡片；
- 从用户选中的卡片和继续方向确定下一轮 `nextQuery`；
- 控制探索轮数和用户已走过的路径；
- 集齐三类、达到 3 轮或用户主动结束时生成最终路线；
- 输出必须符合 `packages/contracts` 中的 Schema。

上游和下游：

```text
D API Routes → C ExplorationOrchestrator
C ExplorationOrchestrator → B ZhihuProvider
C ExplorationOrchestrator → C AiProvider
C ExplorationOrchestrator → D API Routes
```

D 调用 C 的接口：

```ts
export interface ExplorationOrchestrator {
  create(input: {
    question: string;
  }): Promise<ExplorationSession>;
  choose(
    sessionId: string,
    input: { nodeId: string; choiceId: string }
  ): Promise<ExplorationSession>;
  get(sessionId: string): Promise<ExplorationSession>;
  feedback(sessionId: string, input: { nodeId: string; signal: string }): Promise<void>;
}
```

C 调用 AI Provider 的接口：

```ts
export interface AiProvider {
  generateNodes(input: {
    question: string;
    source: ZhihuSource;
    selectedPath: string[];
    round: number;
  }): Promise<ExplorationNode[]>;
}
```

AI 分析由 C 负责，B 不负责理解内容，D 也不负责拼 Prompt。真实实现可以调用知乎官方 `answer` 直答接口；并行开发阶段使用 `MockAiProvider`。

AI Provider 的 mock 输入：

```json
{
  "question": "为什么年轻人越来越喜欢徒步？",
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

AI Provider 的 mock 输出必须是三张候选卡片，每张卡片的 `type` 分别为 `story`、`counterpoint`、`application`；`choices[].nextQuery` 是下一轮搜索词，前端只展示 `label`，不自己拼搜索词：

```json
[
  {
    "id": "story-1",
    "type": "story",
    "title": "从周末逃离城市开始",
    "summary": "有人把徒步当成短暂离开日常节奏的方式。",
    "sourceRefs": [
      {
        "id": "answer-001",
        "title": "为什么年轻人越来越喜欢徒步？ - 知乎",
        "url": "https://www.zhihu.com/question/100001/answer/200001",
        "sourceType": "zhihu-search"
      }
    ],
    "choices": [
      {
        "id": "choice-1",
        "label": "继续了解这种生活方式",
        "nextQuery": "徒步 生活方式 情绪恢复"
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
        "id": "answer-001",
        "title": "为什么年轻人越来越喜欢徒步？ - 知乎",
        "url": "https://www.zhihu.com/question/100001/answer/200001",
        "sourceType": "zhihu-search"
      }
    ],
    "choices": [
      {
        "id": "choice-2",
        "label": "看看不同人的反对理由",
        "nextQuery": "徒步 缺点 反对"
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
        "id": "answer-001",
        "title": "为什么年轻人越来越喜欢徒步？ - 知乎",
        "url": "https://www.zhihu.com/question/100001/answer/200001",
        "sourceType": "zhihu-search"
      }
    ],
    "choices": [
      {
        "id": "choice-3",
        "label": "寻找低门槛的尝试方式",
        "nextQuery": "徒步 新手 低门槛 路线"
      }
    ]
  }
]
```

### D：API 集成层

负责代码：

```text
apps/api/src/routes/exploration.ts
apps/api/src/index.ts
packages/contracts/src/exploration.ts
```

负责的事情：

- 接收前端请求并校验参数；
- 调用 C 的 `ExplorationOrchestrator`；
- 把 C 的结果返回给 A；
- 维护统一请求/响应协议；
- 负责最终联调、启动命令和部署。

上游和下游：

```text
A 前端 → D API Routes → C ExplorationOrchestrator
D API Routes → A 前端
```

当前骨架中的接口：

| 方法 | 路径 | 请求 | 返回 |
|---|---|---|---|
| `POST` | `/api/v1/explorations` | `{ question }` | `ExplorationSession` |
| `GET` | `/api/v1/explorations/:id` | 会话 ID | 当前会话 |
| `POST` | `/api/v1/explorations/:id/choices` | `{ nodeId, choiceId }` | C 读取 `nextQuery`，搜索 1 条新内容并生成下一轮会话 |
| `POST` | `/api/v1/explorations/:id/feedback` | `{ nodeId, signal }` | `{ ok: true }` |

当前这些路由还是 `501` 占位实现。D 接入 C 后，`POST /choices` 不接收前端传入的搜索词，而是由 C 从被选中的 `choice.nextQuery` 发起下一次 `searchZhihu(nextQuery, 1)`。

## 三、共享类型

所有人都从这里引用类型，不要各自复制一份：

```text
packages/contracts/src/exploration.ts
```

主要类型：

```text
SourceRef
ExplorationChoice
ExplorationCompletion
ExplorationNode
ExplorationSession
CreateExplorationRequest
ChooseExplorationRequest
ExplorationFeedback
```

## 四、并行开发规则

1. A 只改 `apps/web` 和页面 fixture。
2. B 只改知乎 Provider、官方 API fixture 和适配层。
3. C 只改探索引擎和 AI Provider。
4. D 只改 API Routes、入口、共享 contracts 和最终集成。
5. 接口字段需要变化时，先通知 D 更新 `packages/contracts`，再同步其他模块。
6. 每个人先用上游 mock 开发，最后由 D 做真实串联。

## 五、各自完成标准

- A：不用后端也能完成“输入问题 → 浏览节点 → 继续探索 → 分享路线”。
- B：每轮返回 1 条标准化 `ZhihuSource`，并正确区分成功、空结果和业务错误。
- C：能基于 1 条来源返回 3 张不同方向的 `ExplorationNode`，并在达到结束条件时生成完成信息。
- D：四条 REST 路由能完成参数校验、调用编排器和返回统一 JSON。

## 六、当前实现对照

- 已符合：官方原始 mock 覆盖 18 个调用面；产品侧 `ZhihuProvider` 默认只取 1 条内容；`MockAiProvider` 返回 3 个方向，并且每个继续选项都有 `nextQuery`。
- 已符合：C 的 AI 分析接口包含 `source`、`selectedPath` 和 `round`，可以根据当前内容和历史路径生成下一轮候选。
- 尚未接通：`ExplorationOrchestrator` 和 4 条 REST 路由目前仍是骨架 / `501` 占位，实际的“选择 → nextQuery → 再搜 1 条 → AI 再分析”由 C、D 联调时接上。
- 尚未接入真实 AI：`MockAiProvider` 只用于并行开发；正式实现可以在同一个 `AiProvider` 接口下调用知乎官方 `answer`，再把结果解析为三张候选卡片。
