import rawFixture from "../../../../fixtures/exploration-demo.json";
import {
  ExplorationSessionSchema,
  type ExplorationNode
} from "@curioverse/contracts";
import type { AiProvider } from "./ai-provider.js";

const fixtureSession = ExplorationSessionSchema.parse(rawFixture);

export class MockAiProvider implements AiProvider {
  async generateNodes(_input: {
    question: string;
    source: Parameters<AiProvider["generateNodes"]>[0]["source"];
    selectedPath: string[];
    round: number;
  }): Promise<ExplorationNode[]> {
    return structuredClone(fixtureSession.nodes);
  }
}
