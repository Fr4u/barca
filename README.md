# Blaugrana Tactics

Interaktywna strona o pozycjach w piłce nożnej i ich rolach w FC Barcelonie (sezon 2026/27, stan kadry: wrzesień 2026).

- **01 Anatomia boiska**: scrollytelling po liniach (bramkarz, obrona, pomoc, atak) na przyklejonym boisku z 13 typami pozycji. Każdy znacznik otwiera kartę pozycji: strefę, zadania, cechy, warianty ról i zawodników Barçy. Pod spodem pełna tabela.
- **02 Tablica meczowa**: 4-3-3, 4-2-3-1, 3-2-5 (faza posiadania), 4-4-2 (pressing) i 3-4-3 (romb Cruyffa). Zawodnicy przebiegają między ustawieniami. Są warstwy (ruchy, korytarze boiska, linie podań) i animacja akcji zakończona golem. Zawodnika można przeciągnąć z ławki na boisko albo zamienić dwóch piłkarzy na boisku; alternatywnie działa tryb zmian (klikanie). Pod boiskiem jest opis roli każdego z jedenastu zawodników.
- **03 Kadra**: lista 27 zawodników z podglądem zdjęcia pod kursorem. Kliknięcie otwiera pełnoekranowy profil ze zdjęciem, rolą w bieżącej taktyce, pozycjami na mini-boisku i mocnymi stronami.

## Uruchomienie

Czysty HTML/CSS/JS bez budowania. Biblioteki (GSAP, Lenis) i fonty są w repozytorium, więc strona działa bez CDN.

```sh
python3 -m http.server 8000   # http://localhost:8000
```

Można też otworzyć `index.html` bezpośrednio albo włączyć GitHub Pages (Settings → Pages → Deploy from branch).

## Zdjęcia: tylko w barwach FC Barcelony

Kolejność źródeł:

1. **Oficjalne zdjęcia FC Barcelony** dla wszystkich 27 zawodników, pobrane z [serwisu klubu](https://www.fcbarcelona.com/en/football/first-team/players) i zapisane lokalnie w `img/players/`. Portrety 940×940 są używane w profilach i podglądzie pod kursorem. Na boisku i w listach strona pokazuje wycinki głowy i ramion 320×320 (`img/players/face/`), bo przy całych portretach twarz w małym kółku byłaby ledwo widoczna. Portrety zapisane przez serwis jako ciężkie PNG (ok. 1,8 MB) mają lżejsze kopie JPEG (ok. 0,15 MB) w `img/players/web/`. Oryginały zostają nietknięte. Pliki pochodne i `js/photos.js` generuje `python tools/make_web_photos.py` (wymaga Pillow), a ich pochodzenie i sumy SHA-256 są dopisane w `sources.json`. Działają bez internetu i mają pierwszeństwo przed pamięcią podręczną oraz Wikimedia Commons. Przypisania są w `js/photos.js`; źródła, linki do profili i sumy SHA-256 w `img/players/sources.json`. Profil zawodnika zawiera link do jego oficjalnej strony. Można też dodać własny plik w `js/photos.js`.
2. **Wikimedia Commons**, wyszukiwane w przeglądarce. Plik jest akceptowany tylko wtedy, gdy:
   - jego tytuł, opis lub kategorie zawierają nazwisko zawodnika,
   - wymieniają FC Barcelonę (Barça, FCB, Camp Nou, Joan Gamper itp.),
   - nie wymieniają poprzednich klubów zawodnika (lista w `PHOTO_RULES` w `js/data.js`), reprezentacji, turniejów reprezentacyjnych ani nie jest autografem, muralem czy rysunkiem.

   Spośród pasujących wygrywa najnowsze, pionowe zdjęcie z nazwiskiem w tytule. W profilu widać autora, licencję i link do pliku.
3. **Grafika koszulki Barçy** z nazwiskiem i numerem, gdy żadne zdjęcie nie spełnia warunków. Strona nie pokazuje wtedy zdjęcia z innego klubu.

Filtr opiera się na opisach plików, więc nie jest nieomylny. Nowi zawodnicy (lato 2026) mogą jeszcze nie mieć wolnych zdjęć w barwach Barçy na Commons. Wynik wyszukiwania jest zapamiętywany w przeglądarce na 3 dni.

## Dane

Wszystko jest w `js/data.js`: katalog pozycji, kadra z opisami ról, definicje taktyk (współrzędne w procentach boiska) i reguły doboru zdjęć. Numery według ogłoszenia klubu z początku września 2026, składy 4-3-3 i 4-2-3-1 według meczów z Levante i Sevillą. 3-4-3 to wariant hipotetyczny.

Projekt fanowski, niezwiązany z FC Barcelona.
