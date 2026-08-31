import { Router } from "express";
import type { Repository } from "@strzelnica/shared";

export function createDevRouter(repository: Repository): Router {
  const router = Router();

  router.get("/api/dev/log-maili", async (_req, res) => {
    const wpisy = await repository.listujLogMaili();
    res.status(200).json({ wpisy });
  });

  return router;
}
