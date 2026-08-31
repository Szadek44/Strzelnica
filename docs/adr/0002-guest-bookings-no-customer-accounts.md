# Klient rezerwuje gościnnie, bez konta

Wzorzec Booksy, do którego się odwołujemy, wymaga konta klienta przy rezerwacji. Świadomie z tego rezygnujemy: Klient podaje tylko imię, telefon i e-mail, a Rezerwacja jest identyfikowana i zarządzana (anulowanie) przez unikalny token wysyłany w mailu potwierdzającym — bez logowania. Powód: niższy próg wejścia dla jednorazowego klienta strzelnicy, kosztem funkcji, które wymagałyby konta (historia rezerwacji, opinie), świadomie pominiętych w MVP.

## Consequences

Dodanie kont klienckich później wymaga migracji danych istniejących Rezerwacji (powiązanie z nowo utworzonymi kontami) — to nie jest projektowane jako late addition bez tarcia.
