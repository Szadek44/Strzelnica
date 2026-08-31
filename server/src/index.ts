import { createApp } from "./app.js";
import { InMemoryRepository } from "./domain/repository.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const app = createApp(new InMemoryRepository());

app.listen(PORT, () => {
  console.log(`Server startuje na porcie ${PORT}`);
});
