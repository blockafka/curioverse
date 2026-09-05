import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { explorationRoutes } from "./routes/exploration.js";

const app = new Hono();

app.get("/health", (context) =>
  context.json({ ok: true, service: "curioverse-api" })
);

app.route("/api/v1/explorations", explorationRoutes);

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port });

console.log(`Curioverse API listening on http://localhost:${port}`);
