import {
  ContinueExplorationRequestSchema,
  CreateExplorationRequestSchema,
  ExplorationSessionSchema,
  type ContinueExplorationRequest,
  type CreateExplorationRequest,
  type ExplorationSession
} from "@curioverse/contracts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init
  });

  if (!response.ok) {
    throw new Error(`Curioverse API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function createExploration(
  input: CreateExplorationRequest
): Promise<ExplorationSession> {
  const payload = CreateExplorationRequestSchema.parse(input);
  const response = await request<unknown>("/v1/explorations", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return ExplorationSessionSchema.parse(response);
}

export async function continueExploration(
  sessionId: string,
  input: ContinueExplorationRequest
): Promise<ExplorationSession> {
  const payload = ContinueExplorationRequestSchema.parse(input);
  const response = await request<unknown>(
    `/v1/explorations/${sessionId}/continue`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );

  return ExplorationSessionSchema.parse(response);
}
