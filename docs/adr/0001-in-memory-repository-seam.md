# In-memory repository behind a pure-TS seam, no real database yet

This is a local prototype and the target machine has neither Docker nor the ability to install it, ruling out Supabase's local stack (which requires Docker) and any containerized Postgres. Instead, all persistence goes through a `Repository` interface (`shared/src/repository.ts`) made of pure TypeScript functions; `server/src/domain/repository.ts` implements it over plain in-memory arrays/maps that reset on server restart. Routes and the frontend depend only on the interface, so swapping in a real database (Supabase or otherwise) later means writing one new implementation of `Repository`, not touching business logic or the API surface.

## Considered Options

- **Supabase Cloud (hosted, free tier)**: no Docker needed, but requires an internet-connected external account for what is meant to be a throwaway local prototype — rejected for now, stays a viable option once real persistence is needed.
- **Native PostgreSQL install + custom backend**: fully local, but heavier setup and more code for a prototype whose main goal is validating the domain flow, not persistence.

## Consequences

All data (strzelnice, osie, rezerwacje, sent-email log) is lost on every server restart. There is no migration story yet — adding real persistence later starts from this same `Repository` interface.
