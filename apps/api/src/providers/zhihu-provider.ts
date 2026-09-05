export type ZhihuSource = {
  id: string;
  title: string;
  url: string;
  sourceType: "question" | "story" | "search" | "knowledge";
};

export interface ZhihuProvider {
  search(query: string): Promise<ZhihuSource[]>;
}

export function createUnconfiguredZhihuProvider(): ZhihuProvider {
  return {
    async search() {
      return [];
    }
  };
}
