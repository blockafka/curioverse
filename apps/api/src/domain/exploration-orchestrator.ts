import type {
  CreateExplorationRequest,
  ExplorationSession
} from "@curioverse/contracts";

export interface ExplorationOrchestrator {
  create(input: CreateExplorationRequest): Promise<ExplorationSession>;
}

export function createUnconfiguredOrchestrator(): ExplorationOrchestrator {
  return {
    async create() {
      throw new Error("Exploration orchestrator is not configured");
    }
  };
}
