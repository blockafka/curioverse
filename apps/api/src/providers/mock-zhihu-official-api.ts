import rawFixtures from "../../../../fixtures/zhihu-official-api.json";
import type {
  ChatCompletionResponse,
  CliAuthSetResponse,
  CliAuthStatusResponse,
  CliStatusResponse,
  CliSetupResponse,
  CollectionContentItem,
  DirectAnswerError,
  FavoriteListItem,
  FolloweeItem,
  HotData,
  KnowledgeBase,
  KnowledgeItem,
  KnowledgeSearchItem,
  KnowledgeUploadResult,
  MeContentItem,
  MeContentType,
  OfficialFixtureSet,
  OfficialResponse,
  Paging,
  QuotaItem,
  SearchData,
  ZhidaModel
} from "./zhihu-official-types.js";

const fixtures = rawFixtures as unknown as OfficialFixtureSet;

export type MockMode = "success" | "business-error";
export type AnswerOutput = "json" | "sse" | "text";

export type KnowledgeSearchInput = {
  baseId?: string;
  scope?: Array<"personal" | "subscription" | "public">;
  query: string;
  limit?: number;
};

export interface ZhihuOfficialApi {
  quota(): Promise<OfficialResponse<QuotaItem[]>>;
  searchZhihu(query: string, count?: number): Promise<OfficialResponse<SearchData>>;
  searchGlobal(query: string, count?: number): Promise<OfficialResponse<SearchData>>;
  hot(limit?: number): Promise<OfficialResponse<HotData>>;
  answer(
    question: string,
    options?: { model?: ZhidaModel; output?: "json" }
  ): Promise<ChatCompletionResponse | DirectAnswerError>;
  answer(
    question: string,
    options: { model?: ZhidaModel; output: "sse" }
  ): Promise<string | DirectAnswerError>;
  answer(
    question: string,
    options: { model?: ZhidaModel; output: "text" }
  ): Promise<string | DirectAnswerError>;
  meContents(
    contentType?: MeContentType,
    offset?: number
  ): Promise<OfficialResponse<{ Items: MeContentItem[]; Paging: Paging }>>;
  meFollowees(
    offset?: number
  ): Promise<OfficialResponse<{ Items: FolloweeItem[]; Paging: Paging }>>;
  meFavoritesLists(): Promise<OfficialResponse<{ Items: FavoriteListItem[] }>>;
  meFavoritesRecent(): Promise<OfficialResponse<{ Items: CollectionContentItem[] }>>;
  meFavoritesItems(
    urlToken: string,
    offset?: number
  ): Promise<OfficialResponse<{
    Items: CollectionContentItem[];
    Paging: Paging;
  }>>;
  knowledgeBases(
    scope?: "all" | "created" | "subscribed"
  ): Promise<OfficialResponse<{ Items: KnowledgeBase[] }>>;
  knowledgeItems(
    baseId: string,
    limit?: number,
    cursor?: string
  ): Promise<OfficialResponse<{
    Items: KnowledgeItem[];
    Total: number;
    HasMore: boolean;
    NextCursor?: string;
  }>>;
  knowledgeSearch(
    input: KnowledgeSearchInput
  ): Promise<OfficialResponse<{ Items: KnowledgeSearchItem[] }>>;
  knowledgeUpload(
    fileName: string,
    fileSize: number,
    baseId?: string
  ): Promise<OfficialResponse<KnowledgeUploadResult>>;
  status(): Promise<CliStatusResponse>;
  setup(): Promise<CliSetupResponse>;
  authSet(): Promise<CliAuthSetResponse>;
  authStatus(verify?: boolean): Promise<CliAuthStatusResponse>;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value as number)));
}

function businessError<T>(key: string): OfficialResponse<T> {
  return clone(fixtures.errors.business[key]) as OfficialResponse<T>;
}

export class MockZhihuOfficialApi implements ZhihuOfficialApi {
  public constructor(private readonly options: { mode?: MockMode } = {}) {}

  async quota() {
    return clone(fixtures.quota);
  }

  async searchZhihu(_query: string, count = 10) {
    if (this.options.mode === "business-error") {
      return businessError<SearchData>("quotaExceeded");
    }

    const response = clone(fixtures.searchZhihu);
    if (response.Code === 0) {
      response.Data.Items = response.Data.Items.slice(0, clamp(count, 1, 10, 10));
    }
    return response;
  }

  async searchGlobal(_query: string, count = 20) {
    const response = clone(fixtures.searchGlobal);
    if (response.Code === 0) {
      response.Data.Items = response.Data.Items.slice(0, clamp(count, 1, 20, 20));
    }
    return response;
  }

  async hot(limit = 30) {
    const response = clone(fixtures.hot);
    if (response.Code === 0) {
      response.Data.Items = response.Data.Items.slice(0, clamp(limit, 1, 30, 30));
    }
    return response;
  }

  async answer(
    question: string,
    options?: { model?: ZhidaModel; output?: "json" }
  ): Promise<ChatCompletionResponse | DirectAnswerError>;
  async answer(
    question: string,
    options: { model?: ZhidaModel; output: "sse" }
  ): Promise<string | DirectAnswerError>;
  async answer(
    question: string,
    options: { model?: ZhidaModel; output: "text" }
  ): Promise<string | DirectAnswerError>;
  async answer(
    _question: string,
    options: { model?: ZhidaModel; output?: AnswerOutput } = {}
  ): Promise<ChatCompletionResponse | string | DirectAnswerError> {
    const model = options.model ?? "zhida-fast-1p5";
    const output = options.output ?? "json";
    if (!(["zhida-fast-1p5", "zhida-thinking-1p5", "zhida-agent"] as string[]).includes(model)) {
      return clone(fixtures.errors.directAnswer);
    }
    if (output === "text") return fixtures.answer.text;
    if (output === "sse") return fixtures.answer.sse;
    if (model === "zhida-thinking-1p5") return clone(fixtures.answer.thinkingJson);
    const response = clone(fixtures.answer.json);
    response.model = model;
    return response;
  }

  async meContents(contentType: MeContentType = "all", _offset = 0) {
    const response = clone(fixtures.meContents);
    if (response.Code === 0 && contentType !== "all") {
      response.Data.Items = response.Data.Items.filter((item) => item.ContentType === contentType);
    }
    return response;
  }

  async meFollowees(_offset = 0) {
    return clone(fixtures.meFollowees);
  }

  async meFavoritesLists() {
    return clone(fixtures.meFavoritesLists);
  }

  async meFavoritesRecent() {
    return clone(fixtures.meFavoritesRecent);
  }

  async meFavoritesItems(
    urlToken: string,
    _offset = 0
  ): Promise<OfficialResponse<{ Items: CollectionContentItem[]; Paging: Paging }>> {
    if (!urlToken.trim()) {
      return businessError<{ Items: CollectionContentItem[]; Paging: Paging }>(
        "invalidParams"
      );
    }
    return clone(fixtures.meFavoritesItems) as OfficialResponse<{
      Items: CollectionContentItem[];
      Paging: Paging;
    }>;
  }

  async knowledgeBases(scope: "all" | "created" | "subscribed" = "all") {
    const response = clone(fixtures.knowledgeBases);
    if (response.Code === 0 && scope !== "all") {
      response.Data.Items = response.Data.Items.filter((item) => item.Relation === scope);
    }
    return response;
  }

  async knowledgeItems(
    baseId: string,
    limit = 20,
    _cursor?: string
  ): Promise<OfficialResponse<{
    Items: KnowledgeItem[];
    Total: number;
    HasMore: boolean;
    NextCursor?: string;
  }>> {
    if (baseId !== "10001" && baseId !== "10002") {
      return businessError<{
        Items: KnowledgeItem[];
        Total: number;
        HasMore: boolean;
        NextCursor?: string;
      }>("knowledgeBaseNotFound");
    }
    const response = clone(fixtures.knowledgeItems);
    if (response.Code === 0) {
      response.Data.Items = response.Data.Items.slice(0, clamp(limit, 1, 20, 20));
    }
    return response;
  }

  async knowledgeSearch(
    input: KnowledgeSearchInput
  ): Promise<OfficialResponse<{ Items: KnowledgeSearchItem[] }>> {
    if (!input.baseId && (!input.scope || input.scope.length === 0)) {
      return businessError<{ Items: KnowledgeSearchItem[] }>("invalidParams");
    }
    const response = clone(fixtures.knowledgeSearch);
    if (response.Code === 0) {
      response.Data.Items = response.Data.Items.slice(0, clamp(input.limit, 1, 10, 10));
    }
    return response;
  }

  async knowledgeUpload(
    fileName: string,
    fileSize: number,
    baseId = "10001"
  ): Promise<OfficialResponse<KnowledgeUploadResult>> {
    if (!fileName.trim() || !Number.isFinite(fileSize) || fileSize < 0 || fileSize > 100 * 1024 * 1024) {
      return businessError<KnowledgeUploadResult>("invalidParams");
    }
    if (baseId !== "10001" && baseId !== "10002") {
      return businessError<KnowledgeUploadResult>("knowledgeBaseNotFound");
    }
    const response = clone(fixtures.knowledgeUpload);
    if (response.Code === 0) {
      response.Data.FileName = fileName;
      response.Data.FileSize = Math.trunc(fileSize);
      response.Data.KnowledgeBaseID = baseId;
    }
    return response;
  }

  async status() {
    return clone(fixtures.status);
  }

  async setup() {
    return clone(fixtures.setup);
  }

  async authSet() {
    return clone(fixtures.authSet);
  }

  async authStatus(_verify = false) {
    return clone(fixtures.authStatus);
  }
}
