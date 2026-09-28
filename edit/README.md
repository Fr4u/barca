# TWO LEFT FEET: edit TikTok (Lamine Yamal i Raphinha)

Gotowy plik: **`edit/out/barca-two-left-feet-tiktok.mp4`**. Parametry: 1080×1920, 60 kl./s, H.264 High + AAC 256 kb/s, 23,6 s, kolory BT.709, głośność −10,4 LUFS (szczyt −1,5 dBTP po kompresji AAC).

Okładka: `edit/out/cover.png`. Wersję bez dźwięku (pod dźwięk z biblioteki TikToka) robi jedno polecenie: `ffmpeg -i edit/out/barca-two-left-feet-tiktok.mp4 -an -c:v copy bez-dzwieku.mp4`.

## Co jest w środku

Cięcia leżą na siatce 130 BPM (1 bit = 0,4615 s):

| bity | czas | co się dzieje |
|---|---|---|
| 0–8 | 0,0–3,7 s | hak: „TWO / LEFT / FEET.” → „ONE / PROBLEM.”, miganie 10/11, cisza przed dropem |
| 8–12 | 3,7–5,5 s | drop: „10”, LAMINE YAMAL, RIGHT WING · LEFT FOOT |
| 12–17 | 5,5–7,8 s | rekonstrukcja 3D: zejście do środka i podkręcony strzał w dalszy róg (slow-mo), GOLAZO. |
| 17–24 | 7,8–11,1 s | karty: mistrz Euro 2024, najmłodszy strzelec w historii Euro, 2× Kopa Trophy, **mistrz świata 2026**, Złota Piłka 2025: 2. miejsce |
| 24–33 | 11,1–15,2 s | zmiana bitu na funk carioca: „11”, RAPHINHA, pressing i odbiór piłki, strzał, GOLAÇO. |
| 33–40 | 15,2–18,5 s | 13 goli w LM 2024/25, współkról strzelców, Złota Piłka 2025: 5. miejsce, mistrzowie LaLigi 24/25 i 25/26 |
| 40–51 | 18,5–23,6 s | finał 10 → 11: trivela Yamala, wolej Raphinhi (kamera zza bramki), plansza 10 × 11, VISCA EL BARÇA |

Sceny 3D są stylizowanymi rekonstrukcjami firmowych zagrań obu piłkarzy (podpisane „SIGNATURE MOVE”), a nie odtworzeniem konkretnych goli.

## Fakty i źródła (sprawdzone 28.09.2026)

- Mistrzostwo świata 2026: Hiszpania–Argentyna 1:0 po dogrywce, 19.07.2026. Źródła: [FIFA](https://www.fifa.com/en/match-centre/match/17/285023/289292/400021543), [FOX Sports](https://www.foxsports.com/stories/soccer/4-takeaways-after-spain-beats-argentina-extra-time-win-2026-fifa-world-cup), [NBC Sports](https://www.nbcsports.com/soccer/news/lamine-yamal-shines-in-world-cup-final-as-lionel-messi-passes-the-baton). Dwie gwiazdki oznaczają tytuły Hiszpanii z 2010 i 2026 roku.
- Najmłodszy strzelec w historii Euro: 16 lat i 362 dni, półfinał z Francją 09.07.2024. Źródła: [FC Barcelona](https://www.fcbarcelona.com/en/news/4054793/lamine-yamal-youngest-goalscorer-in-the-european-championships), [ESPN](https://www.espn.com/soccer/story/_/id/40527430/spain-lamine-yamal-16-youngest-euro-scorer).
- Euro 2024: finał Hiszpania–Anglia 2:1 w Berlinie.
- Kopa Trophy 2024 i 2025, pierwszy zawodnik z dwoma trofeami. Złota Piłka 2025: Yamal 2., Raphinha 5. Źródła: [UEFA](https://www.uefa.com/uefachampionsleague/news/029e-1eeae3a29e5c-64e217276491-1000--2025-ballon-d-or-voting-results-official-rankings/), [Wikipedia](https://en.wikipedia.org/wiki/2025_Ballon_d%27Or).
- Raphinha: 13 goli w Lidze Mistrzów 2024/25 i ex aequo król strzelców z Serhou Guirassym. Źródło: [UEFA](https://www.uefa.com/uefachampionsleague/news/0291-1be52628e744-a25f57a62887-1000--champions-league-top-scorers-raphinha-and-serhou-guirassy-/).
- Mistrzostwo Hiszpanii 2024/25 i 2025/26. Źródło: [FC Barcelona](https://www.fcbarcelona.com/en/football/first-team/news/4501708/the-29th-league-title-in-fc-barcelona-history).
- Numery 10 i 11 na sezon 2026/27. Źródło: [FC Barcelona](https://www.fcbarcelona.com/en/football/first-team/news/4570894/202627-first-team-jersey-numbers-confirmed).
- Obaj grają lewą nogą; Raphinha urodził się w Porto Alegre.

## Muzyka

Ścieżka jest oryginalna i w całości syntetyzowana w `audio/make_audio.py` (numpy/scipy), bez sampli i cudzych nagrań. Tempo 130 BPM, tonacja f-moll.

- **Część Yamala:** phonk z melodią na krowim dzwonku (cowbell) i basem 808.
- **Część Raphinhi:** brazylijski funk carioca (rytm tresillo, tomy, shaker, gwizdek).

Efekty (uderzenia, whoosh, narastania, filtr „slow-mo”, cisza przed dropem) biorą czasy z tej samej osi czasu co obraz (`timeline.json`), więc cięcia trafiają w bit co do próbki. Ścieżkę możesz publikować jako „original sound”.

Jeśli wolisz popularny dźwięk z TikToka, użyj wersji bez audio i wybierz utwór w tempie 130 BPM (albo 65 BPM w half-time). Wtedy cięcia zgrają się z bitem.

## Podgląd i ponowny render

```sh
python3 -m http.server 8000                     # w katalogu repozytorium
# podgląd z dźwiękiem: http://localhost:8000/edit/edit.html?preview
# jedna klatka:        http://localhost:8000/edit/edit.html?t=9.6

pip install numpy scipy imageio-ffmpeg
python edit/audio/make_audio.py edit/timeline.json edit/build/soundtrack_raw.wav
ffmpeg -i edit/build/soundtrack_raw.wav -af "volume=1.6dB,alimiter=limit=0.69:attack=4:release=60:level=false" -c:a pcm_s24le edit/build/soundtrack.wav
npm i playwright          # Chromium dla Playwrighta
node edit/render.mjs video --ffmpeg "$(python -c 'import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())')"
python edit/check_sync.py edit/out/barca-two-left-feet-tiktok.mp4 edit/timeline.json edit/build/soundtrack.wav
```

Sufit limitera (0,69) jest niższy, niż wymagałby sam plik WAV. Koder AAC podbija szczyty o 2–3 dB, a przy tym ustawieniu gotowy MP4 ma szczyt −1,5 dBTP.

`check_sync.py` sprawdza, czy dźwięk w MP4 nie jest przesunięty względem źródła i czy błysk każdego dropu, gola i finału wypada dokładnie w klatce wynikającej z osi czasu (różnica najwyżej ±8 ms).

Teksty są w `edit.js` w obiekcie `TXT`, a czasy w `timeline.json`.

## Publikacja na TikToku

- Wrzuć plik MP4 bez przycinania. Najważniejsze napisy są w bezpiecznej strefie, poza prawą kolumną przycisków i podpisem na dole.
- Na okładkę wybierz klatkę z planszą „10 × 11” (ok. 22 s) albo użyj `cover.png`.
- Filmik kończy się czernią i wraca do mocnego „TWO”, więc płynnie się zapętla.
- Propozycja opisu: `TWO LEFT FEET. ONE PROBLEM. #barca #lamineyamal #raphinha #fcbarcelona #edit`
