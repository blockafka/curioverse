import assert from "node:assert/strict";
import test from "node:test";
import {
  CreateExplorationRequestSchema,
  ExplorationSessionSchema
} from "@curioverse/contracts";

import { MockAiProvider } from "./mock-ai-provider.js";
import { createMockZhihuProvider } from "./zhihu-provider.js";

test("the AI mock turns one Zhihu source into three exploration directions", async () => {
  const [source] = await createMockZhihuProvider().search("为什么年轻人越来越喜欢徒步？");
  assert.ok(source);

  const nodes = await new MockAiProvider().generateNodes({
    query: "为什么年轻人越来越喜欢徒步？",
    source,
    selectedPath: [],
    round: 0
  });

  assert.equal(nodes.length, 3);
  assert.deepEqual(
    nodes.map((node) => node.type),
    ["story", "counterpoint", "application"]
  );
  assert.ok(nodes.every((node) => node.sourceRefs.length > 0));
  assert.deepEqual(
    [...new Set(nodes.flatMap((node) => node.sourceRefs.map((sourceRef) => sourceRef.id)))],
    [source.id]
  );
  assert.ok(nodes.every((node) => !("choices" in node)));

  const nextNodes = await new MockAiProvider().generateNodes({
    query: "从周末逃离城市开始",
    source: { ...source, id: "answer-002", title: "从周末逃离城市开始 - 知乎" },
    selectedPath: ["story-1"],
    round: 1
  });
  assert.equal(nextNodes[0]?.id, "story-2");
  assert.equal(nextNodes[0]?.sourceRefs[0]?.id, "answer-002");
});

test("the public session keeps sourceType and accepts query as the seed input", async () => {
  assert.deepEqual(
    CreateExplorationRequestSchema.parse({ query: "为什么年轻人越来越喜欢徒步？" }),
    { query: "为什么年轻人越来越喜欢徒步？" }
  );

  const session = ExplorationSessionSchema.parse({
    id: "demo-session",
    seedQuestion: "为什么年轻人越来越喜欢徒步？",
    status: "active",
    round: 0,
    pathNodeIds: [],
    nodes: [
      {
        id: "story-1",
        type: "story",
        title: "从周末逃离城市开始",
        summary: "有人把徒步当成短暂离开日常节奏的方式。",
        sourceRefs: [
          {
            id: "demo-source-1",
            title: "知乎示例内容",
            url: "https://www.zhihu.com/",
            sourceType: "zhihu-search"
          }
        ]
      }
    ],
    createdAt: "2026-09-05T00:00:00.000Z"
  });

  assert.equal(session.nodes[0]?.sourceRefs[0]?.sourceType, "zhihu-search");
});
