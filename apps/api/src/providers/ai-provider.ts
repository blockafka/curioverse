import type { ExplorationNode } from "@curioverse/contracts";

export interface AiProvider {
  generateNodes(input: {
    question: string;
    sources: unknown[];
  }): Promise<ExplorationNode[]>;
}

export function createUnconfiguredAiProvider(): AiProvider {
  return {
    async generateNodes() {
      return [];
    }
  };
}
