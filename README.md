# Blaugrana Tactics

Interaktywna strona o pozycjach w piłce nożnej i ich rolach w FC Barcelonie (sezon 2026/27, stan kadry: wrzesień 2026).

- **Pozycje**: boisko ze wszystkimi typami pozycji (GK, SW, CB, LB/RB, LWB/RWB, CDM, CM, CAM, LM/RM, LW/RW, SS, CF, F9), strefy działania po najechaniu, pełna tabela z wariantami ról i zawodnikami Barçy.
- **Tablica taktyczna**: 4-3-3, 4-2-3-1, 3-2-5 (faza posiadania), 4-4-2 (pressing), 3-4-3 (romb Cruyffa). Animowane przejścia, strzałki ruchów, animacja akcji z piłką, tryb zmian (wymiana z ławką), rola każdego zawodnika w danym ustawieniu.
- **Kadra**: karty wszystkich zawodników z filtrem i profilem po kliknięciu (zdjęcie, pozycje na mini-boisku, rola, mocne strony).

## Uruchomienie

Czysty HTML/CSS/JS bez kroku budowania. Wystarczy otworzyć `index.html` w przeglądarce albo uruchomić lokalny serwer:

```sh
python3 -m http.server 8000
# http://localhost:8000
```

Na GitHub Pages: Settings → Pages → Deploy from branch → wybierz gałąź i katalog `/ (root)`.

## Zdjęcia zawodników

Zdjęcia są pobierane w przeglądarce z API Wikipedii (miniatury z Wikimedia Commons, na licencjach CC; link do pliku źródłowego pojawia się w profilu zawodnika). Strona sprawdza, czy opis artykułu dotyczy piłkarza, żeby nie pokazać zdjęcia innej osoby. Bez dostępu do Wikipedii wyświetlane są grafiki zastępcze w barwach klubu.

Własne zdjęcie: wrzuć plik np. do `img/players/pedri.jpg` i dodaj pole `photo: 'img/players/pedri.jpg'` do zawodnika w `js/data.js`.

## Dane

Wszystko jest w `js/data.js`: katalog pozycji, kadra z opisami ról i definicje taktyk (współrzędne w procentach boiska). Numery według ogłoszenia klubu z początku września 2026, składy 4-3-3 i 4-2-3-1 według meczów z Levante i Sevillą (wrzesień 2026). 3-4-3 to wariant hipotetyczny.

Projekt fanowski, niezwiązany z FC Barcelona.
