import type {
  OfficialResponse,
  SearchItem
} from "./zhihu-official-types.js";

export type NormalizedSearchSource = {
  id: string;
  title: string;
  url: string;
  summary: string;
  contentType: "answer" | "article";
  author: string;
  voteUpCount: number;
  commentCount: number;
  authorityLevel: number;
  rankingScore: number;
  comments: string[];
};

export function assertOfficialSuccess<T>(
  response: OfficialResponse<T>
): T {
  if (response.Code !== 0) {
    throw new Error(`official API error ${response.Code}: ${response.Message}`);
  }
  return response.Data;
}

function removeHighlightTags(value: string): string {
  return value.replace(/<\/?em>/g, "");
}

export function normalizeSearchItems(items: SearchItem[]): NormalizedSearchSource[] {
  return items.map((item) => ({
    id: item.ContentID,
    title: item.Title,
    url: item.Url,
    summary: removeHighlightTags(item.ContentText),
    contentType: item.ContentType.toLowerCase() as "answer" | "article",
    author: item.AuthorName,
    voteUpCount: item.VoteUpCount,
    commentCount: item.CommentCount,
    authorityLevel: Number(item.AuthorityLevel),
    rankingScore: item.RankingScore,
    comments: item.CommentInfoList?.map((comment) => comment.Content) ?? []
  }));
}
