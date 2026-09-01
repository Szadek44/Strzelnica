# Tailwind CSS + shadcn/ui jako fundament stylowania

Frontend (`web/`) był dotąd celowo pozbawiony jakiegokolwiek CSS — bez bibliotek, bez plików `.css`, bez `className` — zgodnie z minimalistycznym duchem prototypu ([0001](0001-in-memory-repository-seam.md)). Wraz z decyzją o przebudowie UI na czytelny, spójny interfejs dla wielu person (Klient, Administrator strzelnicy, Administrator platformy) wybieramy Tailwind CSS + shadcn/ui jako stos stylowania, zamiast czystego CSS/CSS Modules albo gotowej biblioteki komponentów (MUI/Chakra/Mantine).

Rozważane opcje:
- **Czysty CSS/CSS Modules** — zero zależności, ale wymaga ręcznego budowania każdego komponentu i tokenów od zera na 14+ stronach.
- **Gotowa biblioteka komponentów (MUI/Chakra/Mantine)** — szybki start, ale mniejsza kontrola nad wyglądem i większy narzut na dopasowanie do własnego brandingu.
- **shadcn/ui + Tailwind** (wybrane) — komponenty kopiowane do repo (pełna kontrola nad kodem, łatwe dostosowanie do brandingu), dostępność (a11y) wbudowana, Tailwind jako spójny system narzędziowy do stylowania niestandardowych fragmentów.

## Status

accepted
