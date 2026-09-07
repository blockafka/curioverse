import type {
  CreateExplorationRequest,
  ContinueExplorationRequest,
  ExplorationFeedback,
  ExplorationSession
} from "@curioverse/contracts";

export interface ExplorationOrchestrator {
  create(input: CreateExplorationRequest): Promise<ExplorationSession>;
  continue(
    sessionId: string,
    input: ContinueExplorationRequest
  ): Promise<ExplorationSession>;
  get(sessionId: string): Promise<ExplorationSession>;
  feedback(sessionId: string, input: ExplorationFeedback): Promise<void>;
}

export function createUnconfiguredOrchestrator(): ExplorationOrchestrator {
  return {
    async create() {
      throw new Error("Exploration orchestrator is not configured");
    },
    async continue() {
      throw new Error("Exploration orchestrator is not configured");
    },
    async get() {
      throw new Error("Exploration orchestrator is not configured");
    },
    async feedback() {
      throw new Error("Exploration orchestrator is not configured");
    }
  };
}
