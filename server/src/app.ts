import cors from "cors";
import express, { type Express } from "express";
import type { Repository } from "@strzelnica/shared";
import { createAdministratorzyPlatformyRouter } from "./routes/administratorzyPlatformy.js";
import { createAuthRouter } from "./routes/auth.js";
import { createDevRouter } from "./routes/dev.js";
import { createStrzelniceRouter } from "./routes/strzelnice.js";
import { SessionStore } from "./services/sessions.js";

export function createApp(repository: Repository): Express {
  const sessions = new SessionStore();
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(createStrzelniceRouter(repository));
  app.use(createAuthRouter(repository, sessions));
  app.use(createAdministratorzyPlatformyRouter(repository, sessions));
  app.use(createDevRouter(repository));
  return app;
}
