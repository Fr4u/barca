#!/usr/bin/env python3
"""
Kontrola gotowego MP4.

1. Parametry strumieni (rozdzielczość, fps, kolory, dźwięk).
2. Dźwięk: przesunięcie ścieżki w MP4 względem pliku źródłowego (korelacja).
   0 ms oznacza, że koder AAC i kontener nie wprowadziły opóźnienia.
3. Obraz: przy każdym mocnym uderzeniu (drop, gol, finał) błysk musi wypaść w pierwszej
   klatce, której środek przypada w chwili uderzenia albo po niej. Obraz i dźwięk różnią się
   wtedy najwyżej o pół klatki (±8 ms przy 60 kl./s).

Użycie: python edit/check_sync.py edit/out/plik.mp4 edit/timeline.json edit/build/soundtrack.wav
"""
import json
import math
import subprocess
import sys

import imageio_ffmpeg
import numpy as np
from scipy import signal

VIDEO, TLF, WAV = sys.argv[1], sys.argv[2], sys.argv[3]
TL = json.load(open(TLF))
FF = imageio_ffmpeg.get_ffmpeg_exe()
BEAT = 60 / TL['bpm']
FPS = TL['fps']
ok = True

info = subprocess.run([FF, '-hide_banner', '-i', VIDEO], capture_output=True, text=True).stderr
for line in info.splitlines():
    if 'Stream #' in line or 'Duration' in line:
        print(line.strip())


def pcm(path, seconds=6):
    raw = subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-i', path, '-t', str(seconds), '-vn', '-ac', '1',
                          '-ar', '48000', '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.float32)


a_mp4, a_src = pcm(VIDEO), pcm(WAV)
n = min(len(a_mp4), len(a_src))
xc = signal.correlate(a_mp4[:n], a_src[:n], mode='full', method='fft')
lag = int(np.argmax(xc)) - (n - 1)
print(f'\nprzesunięcie dźwięku w MP4 względem źródła: {lag} próbek = {lag / 48:.2f} ms')
ok &= abs(lag) <= 48

raw_v = subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-i', VIDEO, '-vf', 'scale=108:192,format=gray',
                        '-f', 'rawvideo', '-'], capture_output=True).stdout
luma = np.frombuffer(raw_v, np.uint8).reshape(-1, 192 * 108).mean(axis=1)
print(f'klatek: {len(luma)} (oczekiwane {round(TL["duration"] * FPS)}), jasność pierwszej: {luma[0]:.0f}, ostatniej: {luma[-1]:.0f}')
ok &= len(luma) == round(TL['duration'] * FPS)

print('\nuderzenie  bit    czas uderzenia  klatka  jasność przed -> w klatce  obraz po dźwięku')
for h in TL['hits']:
    if h['type'] not in ('drop', 'goal', 'final'):
        continue
    te = h['b'] * BEAT
    i = math.ceil(te * FPS - 0.5)  # pierwsza klatka, której środek jest w chwili uderzenia lub później
    jump = luma[i] - luma[i - 1]
    lag_ms = (i / FPS - te) * 1000
    good = jump > 60
    ok &= good
    print(f'{h["type"]:<9} {h["b"]:>5}   {te:9.4f} s   {i:5d}    {luma[i - 1]:5.0f} -> {luma[i]:5.0f}          '
          f'{lag_ms:+5.1f} ms  {"OK" if good else "BŁĄD"}')

print('\nWYNIK:', 'OK' if ok else 'BŁĄD')
sys.exit(0 if ok else 1)
