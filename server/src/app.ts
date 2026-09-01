import cors from "cors";
import express, { type Express } from "express";
import type { Repository } from "@strzelnica/shared";
import { createAdministratorzyPlatformyRouter } from "./routes/administratorzyPlatformy.js";
import { createAnulowanieRouter } from "./routes/anulowanie.js";
import { createAuthRouter } from "./routes/auth.js";
import { createDevRouter } from "./routes/dev.js";
import { createGrafikRouter } from "./routes/grafik.js";
import { createKatalogRouter } from "./routes/katalog.js";
import { createOsieRouter } from "./routes/osie.js";
import { createRezerwacjeRouter } from "./routes/rezerwacje.js";
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
  app.use(createGrafikRouter(repository, sessions));
  app.use(createOsieRouter(repository, sessions));
  app.use(createKatalogRouter(repository));
  app.use(createRezerwacjeRouter(repository));
  app.use(createAnulowanieRouter(repository));
  app.use(createDevRouter(repository));
  return app;
}
