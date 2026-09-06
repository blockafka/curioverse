import { MockZhihuOfficialApi } from "./mock-zhihu-official-api.js";
import {
  assertOfficialSuccess,
  normalizeSearchItems,
  type NormalizedSearchSource
} from "./zhihu-official-adapter.js";

export type ZhihuSource = NormalizedSearchSource;

export interface ZhihuProvider {
  search(query: string, count?: number): Promise<ZhihuSource[]>;
}

export function createUnconfiguredZhihuProvider(): ZhihuProvider {
  return {
    async search() {
      return [];
    }
  };
}

export function createMockZhihuProvider(
  api = new MockZhihuOfficialApi()
): ZhihuProvider {
  return {
    async search(query, count = 10) {
      const response = await api.searchZhihu(query, count);
      return normalizeSearchItems(assertOfficialSuccess(response).Items);
    }
  };
}
