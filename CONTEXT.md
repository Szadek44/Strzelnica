# Platforma rezerwacji strzelnic

Wielodostępna (multi-tenant) platforma rezerwacji online w modelu zbliżonym do Booksy: niezależne strzelnice broni palnej zarządzają własnym grafikiem i osiami strzeleckimi, a klienci końcowi rezerwują terminy samoobsługowo (bez konta) przez centralny katalog platformy. Strzelnica "podpina się" do systemu linkując ze swojej własnej strony www do swojego Profilu strzelnicy — nie ma osadzonego widgetu embed. Poza zakresem: strzelnice ASG/airsoft, paintball i łucznicze.

## Language

**Strzelnica**:
Niezależny najemca (tenant) platformy — konkretny obiekt/firma prowadząca działalność strzelecką, z własnym zestawem osi strzeleckich, grafikiem i kontem administracyjnym.
_Avoid_: Range, obiekt, firma, klient (biznesowy)

**Oś strzelecka**:
Pojedyncze, niezależnie rezerwowane stanowisko strzeleckie należące do danej strzelnicy. Ma nazwę/numer, dystans oraz jeden lub więcej dozwolonych typów broni. Jest podstawową jednostką rezerwacji — klient rezerwuje jedną lub więcej osi na jeden lub więcej kolejnych slotów czasowych. Wszystkie osie strzelnicy współdzielą te same godziny otwarcia, ale długość slotu jest ustawiana per strzelnica.
_Avoid_: Tor, stanowisko, lane, slot (slot to przedział czasu, nie sama oś)

**Rezerwacja**:
Zarezerwowany przez Klienta termin obejmujący jedną lub więcej Osi na jeden lub więcej kolejnych slotów czasowych. Zawiera dane kontaktowe klienta (imię, telefon, e-mail) i informacyjną cenę; nie wymaga konta ani płatności online (płatność następuje na miejscu). Klient może ją samodzielnie anulować przez unikalny link przesłany e-mailem, do limitu czasowego ustawionego przez strzelnicę (domyślnie 24h przed terminem).
_Avoid_: Booking, zamówienie, wizyta

**Blokada**:
Zablokowany przez Administratora strzelnicy termin (slot/dzień) na danej osi, niedostępny do rezerwacji przez klientów — np. z powodu awarii lub wydarzenia prywatnego. Odrębna od Rezerwacji: nie ma przypisanego klienta.
_Avoid_: Rezerwacja wewnętrzna, zamknięcie

**Klient**:
Osoba dokonująca rezerwacji osi strzeleckiej — użytkownik końcowy platformy, odróżniony od Strzelnicy (najemcy biznesowego). Rezerwuje wyłącznie samoobsługowo online; nie ma rezerwacji zakładanych ręcznie przez personel.
_Avoid_: Użytkownik, gość, rezerwujący

**Administrator strzelnicy**:
Osoba zarządzająca profilem, osiami i grafikiem dostępności danej Strzelnicy w systemie.
_Avoid_: Właściciel, pracownik, owner

**Administrator platformy**:
Osoba zatwierdzająca nowo zarejestrowane Strzelnice przed ich publicznym udostępnieniem w katalogu.
_Avoid_: Super-admin, moderator

**Profil strzelnicy**:
Publiczna podstrona reprezentująca Strzelnicę w centralnym katalogu platformy — zawiera jej opis, listę osi i dostępne terminy. Jest jedynym punktem wejścia dla Klienta do rezerwacji (strzelnica linkuje do niego ze swojej własnej strony www).
_Avoid_: Strona strzelnicy, wizytówka, widget
