import { Hono } from "hono";
import {
  CreateExplorationRequestSchema,
  ContinueExplorationRequestSchema
} from "@curioverse/contracts";

const routes = new Hono();

routes.post("/", async (context) => {
  const parsed = CreateExplorationRequestSchema.safeParse(await context.req.json());

  if (!parsed.success) {
    return context.json({ error: "Invalid exploration request" }, 400);
  }

  return context.json(
    {
      error: "Exploration orchestration is not connected yet",
      query: parsed.data.query
    },
    501
  );
});

routes.get("/:id", (context) =>
  context.json(
    {
      error: "Exploration persistence is not connected yet",
      id: context.req.param("id")
    },
    501
  )
);

routes.post("/:id/continue", async (context) => {
  const parsed = ContinueExplorationRequestSchema.safeParse(await context.req.json());

  if (!parsed.success) {
    return context.json({ error: "Invalid continue request" }, 400);
  }

  return context.json(
    {
      error: "Exploration continuation is not connected yet",
      id: context.req.param("id"),
      nodeId: parsed.data.nodeId
    },
    501
  );
});

routes.post("/:id/feedback", (context) =>
  context.json(
    {
      error: "Feedback handling is not connected yet",
      id: context.req.param("id")
    },
    501
  )
);

export { routes as explorationRoutes };
