import assert from "node:assert/strict";
import test from "node:test";

import {
  MockZhihuOfficialApi,
  type ZhihuOfficialApi
} from "./mock-zhihu-official-api.js";
import { createMockZhihuProvider } from "./zhihu-provider.js";
import {
  assertOfficialSuccess,
  normalizeSearchItems
} from "./zhihu-official-adapter.js";

test("the mock exposes one payload for every official command", async () => {
  const api: ZhihuOfficialApi = new MockZhihuOfficialApi();
  const responses = await Promise.all([
    api.quota(),
    api.searchZhihu("徒步", 3),
    api.searchGlobal("徒步", 3),
    api.hot(3),
    api.answer("为什么年轻人喜欢徒步？"),
    api.meContents(),
    api.meFollowees(),
    api.meFavoritesLists(),
    api.meFavoritesRecent(),
    api.meFavoritesItems("790977950"),
    api.knowledgeBases(),
    api.knowledgeItems("10001"),
    api.knowledgeSearch({ scope: ["public"], query: "徒步" }),
    api.knowledgeUpload("demo.md", 1024),
    api.status(),
    api.setup(),
    api.authSet(),
    api.authStatus()
  ]);

  for (const response of responses) {
    if ("Code" in response) {
      assert.equal(response.Code, 0);
      assert.equal(response.Message, "success");
    } else if ("ok" in response) {
      assert.equal(response.ok, true);
    } else {
      assert.equal("object" in response, true);
      if (!("object" in response)) return;
      assert.equal(response.object, "chat.completion");
      assert.equal(response.choices[0]?.message.role, "assistant");
    }
  }
});

test("search mock data normalizes official fields for the exploration engine", async () => {
  const api = new MockZhihuOfficialApi();
  const response = await api.searchZhihu("徒步", 3);
  const sources = normalizeSearchItems(assertOfficialSuccess(response).Items);

  assert.equal(sources.length, 3);
  assert.deepEqual(sources[0], {
    id: "answer-001",
    title: "为什么年轻人越来越喜欢徒步？ - 知乎",
    url: "https://www.zhihu.com/question/100001/answer/200001",
    summary: "徒步提供了短暂离开日常节奏的机会，也让人重新感受到身体和环境。",
    contentType: "answer",
    author: "作者A",
    voteUpCount: 147,
    commentCount: 8,
    authorityLevel: 4,
    rankingScore: 1.7927577,
    comments: ["低门槛的城市周边路线更容易坚持。"]
  });
});

test("business errors are distinguishable from successful empty results", async () => {
  const api = new MockZhihuOfficialApi({ mode: "business-error" });
  const response = await api.searchZhihu("徒步", 3);

  assert.throws(
    () => assertOfficialSuccess(response),
    /official API error 30002/
  );
});

test("the mock keeps official output modes and command-specific shapes", async () => {
  const api = new MockZhihuOfficialApi();

  const rawGlobal = await api.searchGlobal("徒步", 1);
  assert.equal(assertOfficialSuccess(rawGlobal).Items[0]?.ContentText.includes("<em>"), true);

  const text = await api.answer("为什么年轻人喜欢徒步？", { output: "text" });
  assert.equal(typeof text, "string");

  const sse = await api.answer("为什么年轻人喜欢徒步？", { output: "sse" });
  assert.equal(typeof sse, "string");
  assert.match(sse as string, /data: \[DONE\]/);

  const thinking = await api.answer("为什么年轻人喜欢徒步？", {
    model: "zhida-thinking-1p5"
  });
  assert.equal("object" in thinking, true);
  if ("object" in thinking) {
    assert.equal(thinking.model, "zhida-thinking-1p5");
    assert.equal(typeof thinking.choices[0]?.message.reasoning_content, "string");
  }

  const recent = await api.meFavoritesRecent();
  assert.equal("Paging" in assertOfficialSuccess(recent), false);

  const knowledge = await api.knowledgeSearch({
    baseId: "10001",
    query: "徒步",
    limit: 1
  });
  const hit = assertOfficialSuccess(knowledge).Items[0];
  assert.equal(Array.isArray(hit?.Content), true);
  assert.equal(hit?.Content.length, 2);
});

test("official parameter errors remain business errors", async () => {
  const api = new MockZhihuOfficialApi();
  const invalidSearch = await api.knowledgeSearch({ query: "徒步" });
  assert.equal(invalidSearch.Code, 10001);

  const missingBase = await api.knowledgeItems("missing-base");
  assert.equal(missingBase.Code, 40004);

  const oversizedFile = await api.knowledgeUpload("too-large.md", 100 * 1024 * 1024 + 1);
  assert.equal(oversizedFile.Code, 10001);
});

test("the product-facing Zhihu provider defaults to one source per exploration step", async () => {
  const provider = createMockZhihuProvider();
  const sources = await provider.search("为什么年轻人越来越喜欢徒步？");

  assert.equal(sources.length, 1);
  assert.equal(sources[0]?.id, "answer-001");

  const nextSources = await provider.search("从周末逃离城市开始");
  assert.equal(nextSources.length, 1);
  assert.notEqual(nextSources[0]?.id, sources[0]?.id);
});
