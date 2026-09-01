import { Router } from "express";
import type { Repository } from "@strzelnica/shared";

export function createKatalogRouter(repository: Repository): Router {
  const router = Router();

  router.get("/api/katalog/strzelnice", async (req, res) => {
    const { q } = req.query as { q?: string };
    const strzelnice = await repository.listujStrzelniceZatwierdzone(typeof q === "string" ? q : undefined);
    res.status(200).json({ strzelnice });
  });

  router.get("/api/katalog/strzelnice/:id", async (req, res) => {
    const strzelnica = await repository.znajdzStrzelnicePoId(req.params.id);
    if (!strzelnica || strzelnica.status !== "zatwierdzona") {
      res.status(404).json({ blad: "Nie znaleziono Profilu Strzelnicy" });
      return;
    }

    const [osie, grafik] = await Promise.all([
      repository.listujOsieStrzelnicy(strzelnica.id),
      repository.znajdzGrafikPoStrzelnicaId(strzelnica.id),
    ]);
    res.status(200).json({ strzelnica, osie, grafik });
  });

  return router;
}
