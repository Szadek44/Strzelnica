import { createApp } from "./app.js";
import { czyZasiewacDanePrzykladowe, zasiejDanePrzykladowe } from "./domain/daneprzykladowe.js";
import { InMemoryRepository } from "./domain/repository.js";
import { hashPassword } from "./services/passwords.js";

const PORT = process.env.SERVER_PORT ? Number(process.env.SERVER_PORT) : 3001;

const DEMO_ADMIN_PLATFORMY_EMAIL = process.env.ADMIN_PLATFORMY_EMAIL ?? "admin@platforma.pl";
const DEMO_ADMIN_PLATFORMY_HASLO = process.env.ADMIN_PLATFORMY_HASLO ?? "admin1234";

const repository = new InMemoryRepository();

await repository.utworzAdministratoraPlatformy({
  email: DEMO_ADMIN_PLATFORMY_EMAIL,
  hasloHash: await hashPassword(DEMO_ADMIN_PLATFORMY_HASLO),
});

const wynikSeeda = czyZasiewacDanePrzykladowe() ? await zasiejDanePrzykladowe(repository) : undefined;

const app = createApp(repository);

app.listen(PORT, () => {
  console.log(`Server startuje na porcie ${PORT}`);
  console.log(
    `Zasiano konto Administratora platformy: ${DEMO_ADMIN_PLATFORMY_EMAIL} (hasło z ADMIN_PLATFORMY_HASLO, domyślnie ustawione dla środowiska lokalnego)`,
  );
  if (wynikSeeda) {
    console.log("Zasiano dane przykładowe dla środowiska deweloperskiego. Administratorzy Strzelnicy:");
    for (const administrator of wynikSeeda.administratorzy) {
      console.log(`  - "${administrator.nazwaStrzelnicy}": ${administrator.email} / ${administrator.haslo}`);
    }
  }
});
