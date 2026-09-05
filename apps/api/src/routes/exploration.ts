import { Hono } from "hono";
import { CreateExplorationRequestSchema } from "@curioverse/contracts";

const routes = new Hono();

routes.post("/", async (context) => {
  const parsed = CreateExplorationRequestSchema.safeParse(await context.req.json());

  if (!parsed.success) {
    return context.json({ error: "Invalid exploration request" }, 400);
  }

  return context.json(
    {
      error: "Exploration orchestration is not connected yet",
      question: parsed.data.question
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

routes.post("/:id/choices", (context) =>
  context.json(
    {
      error: "Choice handling is not connected yet",
      id: context.req.param("id")
    },
    501
  )
);

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
