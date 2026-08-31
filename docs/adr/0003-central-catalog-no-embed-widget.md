# Katalog centralny zamiast osadzalnego widgetu

Pierwotne zlecenie mówiło o "podpinaniu stron www strzelnic do systemu rezerwacji", co sugerowało osadzalny widget (JS/iframe) na własnej stronie każdej strzelnicy. Zdecydowaliśmy inaczej: każda Strzelnica dostaje Profil strzelnicy w centralnym katalogu platformy, a "podpięcie" realizuje się przez zwykły link z jej własnej strony do tego profilu. Powód: widget embed (cross-origin, theming, utrzymanie kompatybilności z dowolnym CMS-em strzelnicy) to istotnie większy koszt niż zwykła podstrona, a centralny katalog dodatkowo daje efekt marketplace'u (klient odkrywa strzelnice, których wcześniej nie znał) — czego czysty widget by nie dał.

## Consequences

Strzelnica nie ma własnego brandingu/UI rezerwacji na swojej domenie — klient zawsze trafia na domenę platformy. Widget embed pozostaje możliwym rozszerzeniem później, jako dodatkowy sposób dotarcia do tego samego Profilu strzelnicy.
