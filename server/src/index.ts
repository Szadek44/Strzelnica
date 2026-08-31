import { createApp } from "./app.js";
import { InMemoryRepository } from "./domain/repository.js";
import { hashPassword } from "./services/passwords.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const DEMO_ADMIN_PLATFORMY_EMAIL = "admin@platforma.pl";
const DEMO_ADMIN_PLATFORMY_HASLO = "admin1234";

const repository = new InMemoryRepository();

await repository.utworzAdministratoraPlatformy({
  email: DEMO_ADMIN_PLATFORMY_EMAIL,
  hasloHash: await hashPassword(DEMO_ADMIN_PLATFORMY_HASLO),
});

const app = createApp(repository);

app.listen(PORT, () => {
  console.log(`Server startuje na porcie ${PORT}`);
  console.log(
    `Demo Administrator platformy: ${DEMO_ADMIN_PLATFORMY_EMAIL} / ${DEMO_ADMIN_PLATFORMY_HASLO}`,
  );
});
