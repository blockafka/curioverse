import assert from "node:assert/strict";
import test from "node:test";

import { MockAiProvider } from "./mock-ai-provider.js";
import { createMockZhihuProvider } from "./zhihu-provider.js";

test("the AI mock turns one Zhihu source into three exploration directions", async () => {
  const [source] = await createMockZhihuProvider().search("为什么年轻人越来越喜欢徒步？");
  assert.ok(source);

  const nodes = await new MockAiProvider().generateNodes({
    question: "为什么年轻人越来越喜欢徒步？",
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
  assert.ok(nodes.every((node) => node.choices.every((choice) => choice.nextQuery.length > 0)));
});
