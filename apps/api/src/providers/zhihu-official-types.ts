export type BusinessErrorCode =
  | 0
  | 10001
  | 20001
  | 30001
  | 30002
  | 40004
  | 40005
  | 40006
  | 50002
  | 90001;

export type OfficialSuccess<T> = {
  Code: 0;
  Message: "success";
  Data: T;
};

export type OfficialBusinessError = {
  Code: Exclude<BusinessErrorCode, 0>;
  Message: string;
  Data?: unknown;
};

export type OfficialResponse<T> = OfficialSuccess<T> | OfficialBusinessError;

export type Paging = {
  IsEnd: boolean;
  NextOffset?: string;
  Totals: number;
};

export type QuotaItem = {
  APIID:
    | "global_search"
    | "zhihu_search"
    | "hot_list"
    | "user_data"
    | "zhida_openai"
    | "knowledge"
    | "tools";
  APIName: string;
  TotalQuota: number;
  TotalUsed: number;
  RemainingQuota: number;
};

export type SearchContentType = "Answer" | "Article";

export type SearchItem = {
  Title: string;
  ContentType: SearchContentType;
  ContentID: string;
  ContentText: string;
  Url: string;
  CommentCount: number;
  VoteUpCount: number;
  AuthorName: string;
  AuthorAvatar: string;
  AuthorBadge: string;
  AuthorBadgeText: string;
  EditTime: number;
  CommentInfoList?: Array<{ Content: string }>;
  AuthorityLevel: "1" | "2" | "3" | "4";
  RankingScore: number;
};

export type SearchData = {
  HasMore: false;
  SearchHashId: string;
  Items: SearchItem[];
  EmptyReason?: string;
};

export type HotItem = {
  Title: string;
  Url: string;
  ThumbnailUrl: string;
  Summary: string;
};

export type HotData = {
  Total: number;
  Items: HotItem[];
};

export type ZhidaModel =
  | "zhida-fast-1p5"
  | "zhida-thinking-1p5"
  | "zhida-agent";

export type ChatCompletionMessage = {
  role: "assistant";
  reasoning_content?: string;
  content: string;
};

export type ChatCompletionResponse = {
  id: string;
  object: "chat.completion";
  created: number;
  model: ZhidaModel;
  choices: Array<{
    index: number;
    message: ChatCompletionMessage;
    finish_reason: "stop";
  }>;
};

export type DirectAnswerError = {
  error: {
    message: string;
    type: "invalid_request_error";
    param: string;
    code: string;
  };
};

export type MeContentType =
  | "all"
  | "answer"
  | "article"
  | "zvideo"
  | "pin"
  | "question";

export type MeContentItem = {
  ContentType: Exclude<MeContentType, "all">;
  Url: string;
  CreatedAt: number;
  LikeCount: number;
  CommentCount: number;
  FavoriteCount: number;
  Title: string;
  Summary: string;
};

export type FolloweeItem = {
  Fullname: string;
  UrlToken: string;
  Url: string;
  AvatarUrl: string;
  Headline: string;
  Gender: 0 | 1 | 2;
  FollowerCount: number;
};

export type FavoriteListItem = {
  UrlToken: number | string;
  Url: string;
  Title: string;
  Description: string;
  IsPublic: boolean;
};

export type FavoriteListRef = {
  UrlToken: number | string;
  Title: string;
  Url: string;
};

export type CollectionAuthor = {
  Name: string;
  UrlToken: string;
  Url: string;
  Gender: 0 | 1 | 2;
  Headline: string;
};

export type CollectionContentItem = {
  ContentType: Exclude<MeContentType, "all">;
  Url: string;
  CreatedAt: number;
  FavTime?: number;
  LikeCount: number;
  CommentCount: number;
  FavoriteCount: number;
  Title: string;
  Summary: string;
  Favlists: FavoriteListRef[];
  Author?: CollectionAuthor;
};

export type KnowledgeBase = {
  KnowledgeBaseID: string;
  Name: string;
  Description?: string;
  Relation: "created" | "subscribed";
  IsDefault: boolean;
  Visibility: "private" | "public";
  ContentCount: number;
  UpdatedAt: number;
};

export type KnowledgeItem = {
  RecallContentID: string;
  ContentType: string;
  Title?: string;
  Summary?: string;
  CreatedAt?: number;
  UpdatedAt?: number;
  OriginUrl?: string;
  [key: string]: unknown;
};

export type KnowledgeSearchItem = {
  RecallContentID?: string;
  ContentType?: string;
  Title?: string;
  Content: string[];
  OriginUrl?: string;
  [key: string]: unknown;
};

export type KnowledgeUploadResult = {
  KnowledgeBaseID: string;
  RecallContentID: string;
  FileName: string;
  FileSize: number;
  Title?: string;
  Abstract?: string;
  OriginUrl?: string;
};

export type CliErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_INVALID"
  | "KEYCHAIN_UNAVAILABLE"
  | "ENV_SHADOWS_KEYCHAIN"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "UPSTREAM_ERROR"
  | "UPDATE_INTEGRITY_FAILED"
  | "CHECKSUM_MISMATCH"
  | "BINARY_INVALID"
  | "UNSUPPORTED_PLATFORM";

export type CliError = {
  ok: false;
  error: {
    source: "cli";
    code: CliErrorCode;
    message: string;
    action_url?: string;
  };
};

export type CliStatusResponse = {
  ok: true;
  installed: boolean;
  next_action: "request_install_consent" | "request_access_secret" | "ready";
  auth: { configured: boolean };
  cli?: {
    binary_path: string;
    compatible: boolean;
    current_version: string;
    latest_version: string;
    min_required_version: string;
    update_available: boolean;
  };
  skill: {
    current_version: string;
    latest_version?: string;
    min_cli_version: string;
    sha256?: string;
    size?: number;
    update_available?: boolean;
    url?: string;
  };
  update_check: {
    http_status?: number;
    status: "verified" | "unavailable" | "not_applicable";
  };
};

export type CliSetupResponse =
  | {
      ok: true;
      installed: boolean;
      reused_cli?: boolean;
      downloaded_cli_version?: string;
      installed_cli_version?: string;
      binary_path: string;
      auth_configured: boolean;
      next_action: "request_access_secret" | "ready";
    }
  | CliError;

export type CliAuthSetResponse = {
  ok: true;
  status: "READY";
  credential: {
    source: "keychain";
    masked: string;
    verification: "valid";
  };
};

export type CliAuthStatusResponse = {
  ok: true;
  environment_set: boolean;
  keychain: "available" | "unavailable";
  source: "keychain" | "environment";
  masked: string;
  verification: "not_performed" | "valid" | "invalid";
  environment_shadows_keychain: boolean;
  last_verified_at: string;
};

export type OfficialFixtureSet = {
  quota: OfficialResponse<QuotaItem[]>;
  searchZhihu: OfficialResponse<SearchData>;
  searchGlobal: OfficialResponse<SearchData>;
  hot: OfficialResponse<HotData>;
  answer: {
    json: ChatCompletionResponse;
    thinkingJson: ChatCompletionResponse;
    text: string;
    sse: string;
  };
  meContents: OfficialResponse<{ Items: MeContentItem[]; Paging: Paging }>;
  meFollowees: OfficialResponse<{ Items: FolloweeItem[]; Paging: Paging }>;
  meFavoritesLists: OfficialResponse<{ Items: FavoriteListItem[] }>;
  meFavoritesRecent: OfficialResponse<{ Items: CollectionContentItem[] }>;
  meFavoritesItems: OfficialResponse<{
    Items: CollectionContentItem[];
    Paging: Paging;
  }>;
  knowledgeBases: OfficialResponse<{ Items: KnowledgeBase[] }>;
  knowledgeItems: OfficialResponse<{
    Items: KnowledgeItem[];
    Total: number;
    HasMore: boolean;
    NextCursor?: string;
  }>;
  knowledgeSearch: OfficialResponse<{ Items: KnowledgeSearchItem[] }>;
  knowledgeUpload: OfficialResponse<KnowledgeUploadResult>;
  status: CliStatusResponse;
  setup: CliSetupResponse;
  authSet: CliAuthSetResponse;
  authStatus: CliAuthStatusResponse;
  errors: {
    business: Record<string, OfficialBusinessError>;
    directAnswer: DirectAnswerError;
    cli: Record<string, CliError>;
  };
};
