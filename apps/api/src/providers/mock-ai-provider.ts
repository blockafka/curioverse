import rawFixture from "../../../../fixtures/exploration-demo.json";
import {
  ExplorationSessionSchema,
  type ExplorationNode
} from "@curioverse/contracts";
import type { AiProvider } from "./ai-provider.js";
import type { ZhihuSource } from "./zhihu-provider.js";

const fixtureSession = ExplorationSessionSchema.parse(rawFixture);

export class MockAiProvider implements AiProvider {
  async generateNodes(input: {
    query: string;
    source: ZhihuSource;
    selectedPath: string[];
    round: number;
  }): Promise<ExplorationNode[]> {
    const sourceRef = {
      id: input.source.id,
      title: input.source.title,
      url: input.source.url,
      sourceType: "zhihu-search" as const
    };

    return fixtureSession.nodes.map((node) => ({
      ...structuredClone(node),
      id: `${node.type}-${input.round + 1}`,
      sourceRefs: [sourceRef]
    }));
  }
}
