import { z } from "zod";

export const SourceRefSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  sourceType: z.enum([
    "zhihu-question",
    "zhihu-story",
    "zhihu-search",
    "zhihu-knowledge",
    "other"
  ])
});

export const ExplorationChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  nextQuery: z.string().trim().min(1)
});

export const ExplorationCompletionSchema = z.object({
  reason: z.enum(["all-types-covered", "max-rounds", "user-ended"]),
  routeTitle: z.string(),
  routeSummary: z.string()
});

export const ExplorationNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["story", "counterpoint", "application"]),
  title: z.string(),
  summary: z.string(),
  sourceRefs: z.array(SourceRefSchema),
  choices: z.array(ExplorationChoiceSchema)
});

export const ExplorationSessionSchema = z.object({
  id: z.string(),
  seedQuestion: z.string(),
  status: z.enum(["active", "completed"]),
  round: z.number().int().nonnegative(),
  pathNodeIds: z.array(z.string()),
  nodes: z.array(ExplorationNodeSchema),
  completion: ExplorationCompletionSchema.optional(),
  createdAt: z.string().datetime()
});

export const CreateExplorationRequestSchema = z.object({
  question: z.string().trim().min(1).max(240)
});

export const ChooseExplorationRequestSchema = z.object({
  nodeId: z.string(),
  choiceId: z.string()
});

export const ExplorationFeedbackSchema = z.object({
  nodeId: z.string(),
  signal: z.enum(["useful", "surprising", "boring"])
});

export type SourceRef = z.infer<typeof SourceRefSchema>;
export type ExplorationChoice = z.infer<typeof ExplorationChoiceSchema>;
export type ExplorationCompletion = z.infer<typeof ExplorationCompletionSchema>;
export type ExplorationNode = z.infer<typeof ExplorationNodeSchema>;
export type ExplorationSession = z.infer<typeof ExplorationSessionSchema>;
export type CreateExplorationRequest = z.infer<
  typeof CreateExplorationRequestSchema
>;
export type ChooseExplorationRequest = z.infer<
  typeof ChooseExplorationRequestSchema
>;
export type ExplorationFeedback = z.infer<typeof ExplorationFeedbackSchema>;
