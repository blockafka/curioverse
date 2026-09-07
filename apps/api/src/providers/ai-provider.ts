import type { ExplorationNode } from "@curioverse/contracts";
import type { ZhihuSource } from "./zhihu-provider.js";

export interface AiProvider {
  generateNodes(input: {
    query: string;
    source: ZhihuSource;
    selectedPath: string[];
    round: number;
  }): Promise<ExplorationNode[]>;
}

export function createUnconfiguredAiProvider(): AiProvider {
  return {
    async generateNodes() {
      return [];
    }
  };
}
