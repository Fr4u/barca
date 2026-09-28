#!/usr/bin/env python3
"""
Oryginalna ścieżka dźwiękowa do edita (130 BPM, F-moll), w całości syntetyzowana.
Bez sampli i cudzej muzyki: każdy dźwięk powstaje tutaj z sinusów, fal prostokątnych i szumu.

Układ (w bitach, 1 bit = 60/130 s):
  0–8    intro: dzwonek za filtrem, uderzenia pod napisy, werbel i narastanie, cisza przed dropem
  8–24   Yamal: phonk (stopa, klask, hi-hat, 808, melodia na krowim dzwonku)
  24–40  Raphinha: funk carioca (rytm tresillo, tomy, shaker, gwizdek)
  40–46  finał: phonk + funk razem
  46–    ostatnie uderzenie i wybrzmienie

Użycie: python make_audio.py timeline.json out.wav
"""
import json
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile

TL = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'edit/timeline.json'))
OUT = sys.argv[2] if len(sys.argv) > 2 else 'edit/build/soundtrack_raw.wav'
SR = TL['sampleRate']
BPM = TL['bpm']
BEAT = 60.0 / BPM
STEP = BEAT / 4
N = int(round(TL['duration'] * SR))
rng = np.random.default_rng(1899)  # rok założenia klubu jako ziarno


def at(b):
    return int(round(b * BEAT * SR))


def tvec(dur):
    return np.arange(int(dur * SR)) / SR


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def sos(kind, f, order=2):
    return signal.butter(order, f, btype=kind, fs=SR, output='sos')


def filt(x, kind, f, order=2):
    return signal.sosfilt(sos(kind, f, order), x)


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) + 1e-12
    return x * (peak / m)


def env_exp(t, tau):
    return np.exp(-t / tau)


def attack(t, a):
    return np.clip(t / a, 0, 1)


def note_hz(name):
    names = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6,
             'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
    n, o = name[:-1], int(name[-1])
    midi = 12 * (o + 1) + names[n]
    return 440.0 * 2 ** ((midi - 69) / 12)


def pan_stereo(x, pan):
    # pan -1 (lewo) .. 1 (prawo), stała moc
    a = (pan + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1)


class Bus:
    def __init__(self):
        self.x = np.zeros((N, 2))

    def add(self, sig, start, gain=1.0, pan=0.0):
        if start >= N:
            return
        s = sig if sig.ndim == 2 else pan_stereo(sig, pan)
        end = min(N, start + len(s))
        if start < 0:
            s = s[-start:]
            start = 0
            end = min(N, start + len(s))
        self.x[start:end] += gain * s[: end - start]


# ----------------------------------------------------------------- instrumenty
def kick(vel=1.0):
    t = tvec(0.42)
    f = 52 + 120 * env_exp(t, 0.032) + 18 * env_exp(t, 0.2)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * env_exp(t, 0.19) * attack(t, 0.0012)
    body += 0.35 * np.sin(2 * np.pi * 115 * t) * env_exp(t, 0.045)
    click = filt(noise(0.42), 'highpass', 2500) * env_exp(t, 0.0025) * 0.35
    s = np.tanh(2.2 * (body + click)) / np.tanh(2.2)
    return s * vel


def bass808(freq, dur):
    t = tvec(dur + 0.08)
    f = freq * (1 + 0.55 * env_exp(t, 0.018))
    ph = 2 * np.pi * np.cumsum(f) / SR
    a = attack(t, 0.004) * env_exp(t, 1.1)
    rel = np.clip((dur + 0.08 - t) / 0.08, 0, 1)
    s = np.sin(ph) * a * rel
    oct_ = np.sin(2 * ph) * a * rel * 0.35
    s = np.tanh(4.0 * (s + oct_)) / np.tanh(4.0)
    return filt(s, 'lowpass', 3200)


def clap():
    t = tvec(0.4)
    n = noise(0.4)
    e = np.zeros_like(t)
    for d in (0.0, 0.011, 0.023):
        e += np.where(t >= d, env_exp(np.maximum(t - d, 0), 0.006), 0)
    e += 0.55 * np.where(t >= 0.03, env_exp(np.maximum(t - 0.03, 0), 0.1), 0)
    s = filt(n * e, 'bandpass', [900, 4800])
    return norm(s, 0.9)


def hat(open_=False, vel=1.0):
    dur = 0.3 if open_ else 0.08
    t = tvec(dur)
    s = filt(noise(dur), 'highpass', 7200, 4) * env_exp(t, 0.13 if open_ else 0.022)
    return norm(s, 0.8) * vel


def band_square(freq, t, maxh=16000):
    s = np.zeros_like(t)
    k = 1
    while k * freq < maxh:
        s += np.sin(2 * np.pi * k * freq * t) / k
        k += 2
    return s * (4 / np.pi)


def cowbell(freq, dur=0.36, vel=1.0):
    t = tvec(dur)
    s = 0.62 * band_square(freq, t) + 0.38 * band_square(freq * 1.4815, t)
    s = filt(s, 'bandpass', [620, 4200])
    e = (0.72 * env_exp(t, 0.014) + 0.28 * env_exp(t, 0.26)) * attack(t, 0.0006)
    s = np.tanh(1.6 * norm(s) * e) / np.tanh(1.6)
    return s * vel


def tom(f_hi, f_lo, vel=1.0):
    t = tvec(0.3)
    f = f_lo + (f_hi - f_lo) * env_exp(t, 0.045)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * env_exp(t, 0.15) * attack(t, 0.001)
    s += filt(noise(0.3), 'bandpass', [300, 2000]) * env_exp(t, 0.01) * 0.25
    return np.tanh(1.5 * s) * vel


def shaker(vel=1.0):
    t = tvec(0.09)
    s = filt(noise(0.09), 'bandpass', [4500, 11000]) * attack(t, 0.006) * env_exp(t, 0.03)
    return norm(s, 0.7) * vel


def swept(x, kind, f_from, f_to, blocks=96, order=2):
    """Filtr o zmiennej częstotliwości (przetwarzanie blokami, stan filtra przenoszony)."""
    out = np.zeros_like(x)
    edges = np.linspace(0, len(x), blocks + 1).astype(int)
    zi = None
    for i in range(blocks):
        u = i / max(1, blocks - 1)
        f = f_from * (f_to / f_from) ** u if not callable(f_to) else f_to(u)
        fc = f if kind != 'bandpass' else [f * 0.7, min(f * 1.4, SR / 2 - 100)]
        s = sos(kind, fc, order)
        if zi is None:
            zi = signal.sosfilt_zi(s) * 0
        seg = x[edges[i]:edges[i + 1]]
        y, zi = signal.sosfilt(s, seg, zi=zi)
        out[edges[i]:edges[i + 1]] = y
    return out


def riser(dur):
    t = tvec(dur)
    u = t / dur
    n = swept(noise(dur), 'bandpass', 250, 9000)
    s = norm(n) * u ** 2.3
    f = 140 + 900 * u ** 2
    s += 0.18 * np.sin(2 * np.pi * np.cumsum(f) / SR) * u ** 3
    return s


def whoosh(dur=0.5):
    t = tvec(dur)
    u = t / dur
    n = swept(noise(dur), 'bandpass', 350, lambda v: 350 + 2600 * np.sin(np.pi * v) ** 1.5)
    s = norm(n) * np.sin(np.pi * u) ** 2
    pan = np.linspace(-0.85, 0.85, len(s))
    a = (pan + 1) * np.pi / 4
    return np.stack([s * np.cos(a), s * np.sin(a)], axis=1)


def crash(dur=2.2):
    t = tvec(dur)
    s = filt(noise(dur), 'highpass', 3200) * env_exp(t, 0.55)
    for f in (3350, 4870, 6230, 7810, 9120):
        s += 0.08 * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * env_exp(t, 0.35)
    return norm(s, 0.9) * attack(t, 0.002)


def impact(big=False):
    dur = 2.4 if big else 0.9
    t = tvec(dur)
    f = 38 + 55 * env_exp(t, 0.09)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(t, 0.55 if big else 0.22) * attack(t, 0.001)
    rumble = filt(noise(dur), 'lowpass', 420) * env_exp(t, 0.16 if big else 0.08)
    s = boom + 0.9 * norm(rumble) * 0.6
    s[: len(kick())] += kick() * 0.9
    return np.tanh(1.7 * s) / np.tanh(1.7)


def hit_small():
    t = tvec(0.25)
    s = filt(noise(0.25), 'bandpass', [1400, 5200]) * env_exp(t, 0.028)
    s = norm(s) * 0.7 + np.sin(2 * np.pi * 185 * t) * env_exp(t, 0.05) * 0.6
    return s


def shot_sfx():
    t = tvec(0.3)
    f = 60 + 70 * env_exp(t, 0.02)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(t, 0.06)
    s += norm(filt(noise(0.3), 'bandpass', [900, 3500])) * env_exp(t, 0.012) * 0.8
    whip = norm(filt(noise(0.3), 'bandpass', [2000, 6000])) * np.exp(-((t - 0.05) / 0.03) ** 2) * 0.35
    return np.tanh(1.4 * (s + whip))


def whistle():
    parts = [(0.0, 0.12), (0.17, 0.12), (0.34, 0.42)]
    dur = 0.8
    t = tvec(dur)
    gate = np.zeros_like(t)
    for s0, d in parts:
        m = (t >= s0) & (t < s0 + d)
        u = (t[m] - s0) / d
        gate[m] = np.minimum(1, np.minimum(u / 0.08, (1 - u) / 0.12))
    f = 2850 + 170 * np.sin(2 * np.pi * 27 * t)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * gate
    s += filt(noise(dur), 'bandpass', [2200, 4200]) * gate * 0.08
    return filt(s, 'lowpass', 6500)


def reverb_ir(dur=2.4, tau=0.42):
    t = tvec(dur)
    ir = np.stack([filt(noise(dur), 'lowpass', 5200), filt(noise(dur), 'lowpass', 5200)], axis=1)
    ir *= env_exp(t, tau)[:, None] * attack(t, 0.008)[:, None]
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


# ------------------------------------------------------------------- aranżacja
drums, bass, music, fx, send = Bus(), Bus(), Bus(), Bus(), Bus()
duck = np.ones(N)

KICK = kick()
CLAP = clap()


def put_kick(b, vel=1.0):
    i = at(b)
    drums.add(KICK * vel, i, 0.95)
    t = tvec(0.25)
    curve = 1 - 0.6 * vel * env_exp(t, 0.09)
    e = min(N, i + len(curve))
    if i < N:
        duck[i:e] = np.minimum(duck[i:e], curve[: e - i])


def put_clap(b, vel=1.0):
    drums.add(CLAP * vel, at(b), 1.0)
    send.add(CLAP * vel, at(b), 0.22)


RIFF_A = ['C5', None, 'C5', None, None, 'Ab4', None, 'C5', None, 'Bb4', None, 'Ab4', 'F4', None, 'Ab4', None]
RIFF_B = ['C5', None, 'C5', None, None, 'Eb5', None, 'C5', None, 'Bb4', None, 'Ab4', 'G4', None, 'F4', None]
RIFF_C = {0: 'C5', 3: 'C5', 6: 'Eb5', 8: 'C5', 11: 'Bb4', 14: 'Ab4'}
RIFF_D = {0: 'C5', 3: 'C5', 6: 'F5', 8: 'Eb5', 11: 'C5', 14: 'Bb4'}
BASS_A = [(0, 'F1', 6), (7, 'F1', 2), (10, 'C2', 3), (13, 'Ab1', 3)]
BASS_B = [(0, 'F1', 6), (7, 'F1', 2), (10, 'Eb2', 3), (13, 'C2', 3)]
BASS_FUNK_A = [(0, 'F1', 3), (3, 'F1', 3), (6, 'C2', 2), (8, 'F1', 3), (11, 'Ab1', 3), (14, 'Eb2', 2)]
BASS_FUNK_B = [(0, 'F1', 3), (3, 'F1', 3), (6, 'Eb2', 2), (8, 'F1', 3), (11, 'C2', 3), (14, 'Ab1', 2)]

cow_cache = {}


def cow(n, dur=0.36, vel=1.0):
    k = (n, dur)
    if k not in cow_cache:
        cow_cache[k] = cowbell(note_hz(n), dur)
    return cow_cache[k] * vel


def put_riff(bar, variant, vel=1.0, dest=None):
    dest = dest or music
    b0 = bar * 4
    if variant in ('A', 'B'):
        riff = RIFF_A if variant == 'A' else RIFF_B
        for s, n in enumerate(riff):
            if n:
                v = vel * (1.0 if s % 4 == 0 else 0.85)
                dest.add(cow(n), at(b0 + s / 4), 0.95 * v)
                send.add(cow(n), at(b0 + s / 4), 0.07 * v)
    else:
        riff = RIFF_C if variant == 'C' else RIFF_D
        for s, n in riff.items():
            dest.add(cow(n, 0.28), at(b0 + s / 4), 0.95 * vel)
            send.add(cow(n, 0.28), at(b0 + s / 4), 0.07 * vel)


def put_bass(bar, pattern, vel=1.0):
    b0 = bar * 4
    for s, n, ln in pattern:
        bass.add(bass808(note_hz(n), ln * STEP), at(b0 + s / 4), 0.62 * vel)


def phonk_bar(bar, last_in_phrase=False):
    b0 = bar * 4
    kicks = [0, 6, 10] if bar % 2 == 0 else [0, 3, 10, 14]
    for s in kicks:
        put_kick(b0 + s / 4, 1.0 if s in (0, 10) else 0.8)
    for s in (4, 12):
        put_clap(b0 + s / 4)
    for s in range(16):
        if last_in_phrase and s >= 12:
            continue
        v = [1.0, 0.45, 0.7, 0.45][s % 4]
        drums.add(hat(vel=v), at(b0 + s / 4), 0.38, pan=0.18)
    if last_in_phrase:  # trapowe triole na końcu frazy
        for k in range(9):
            drums.add(hat(vel=0.5 + 0.05 * k), at(b0 + 3 + k / 9), 0.38, pan=0.18)
    if bar % 2 == 0:
        drums.add(hat(True, 0.6), at(b0 + 14 / 4), 0.3, pan=-0.2)
    put_bass(bar, BASS_A if bar % 2 == 0 else BASS_B)
    put_riff(bar, 'A' if bar % 2 == 0 else 'B')


def funk_bar(bar, with_phonk_riff=False):
    b0 = bar * 4
    for s in (0, 3, 6, 8, 11, 14):
        put_kick(b0 + s / 4, 1.0 if s in (0, 8) else 0.72)
    for s in (4, 12):
        put_clap(b0 + s / 4)
    for s, hi in ((2, True), (5, False), (10, True), (13, False)):
        drums.add(tom(210, 150, 0.8) if hi else tom(150, 100, 0.8), at(b0 + s / 4), 0.45, pan=0.25 if hi else -0.25)
    for s in range(16):
        swing = 0.12 if s % 2 else 0.0
        drums.add(shaker(0.5 + 0.5 * (s % 2 == 0)), at(b0 + (s + swing) / 4), 0.26, pan=-0.3)
    put_bass(bar, BASS_FUNK_A if bar % 2 == 0 else BASS_FUNK_B)
    if with_phonk_riff:
        put_riff(bar, 'A' if bar % 2 == 0 else 'B')
    else:
        put_riff(bar, 'C' if bar % 2 == 0 else 'D')


def snare_roll(b_from, b_to):
    b = b_from
    while b < b_to - 1e-6:
        u = (b - b_from) / (b_to - b_from)
        step = 0.25 if u < 0.5 else 0.125
        drums.add(CLAP * (0.25 + 0.75 * u), at(b), 0.6)
        b += step


# --- intro (bity 0–8)
intro = Bus()
for bar in (0, 1):
    put_riff(bar, 'A' if bar == 0 else 'B', vel=0.9, dest=intro)
intro_x = intro.x.copy()
# dzwonek „zza ściany”: filtr otwiera się pod koniec intra
lp = np.stack([filt(intro_x[:, c], 'lowpass', 900, 4) for c in range(2)], axis=1)
open_ = np.clip((np.arange(N) - at(6)) / (at(7.5) - at(6)), 0, 1)[:, None]
music.x += lp * (1 - open_) + intro_x * open_ * 0.8

for b in (0, 1, 2, 4, 5):
    fx.add(impact(False), at(b), 0.55)
    send.add(impact(False), at(b), 0.12)
for b in (1, 2, 3):
    put_kick(b - 0.5, 0.35)  # delikatne „bicie serca” między uderzeniami
snare_roll(6, 7.5)

# --- Yamal (takty 2–5), Raphinha (6–9), finał (10–11)
for bar in range(2, 6):
    phonk_bar(bar, last_in_phrase=(bar == 5))
for bar in range(6, 10):
    funk_bar(bar)
for bar in range(10, 12):
    funk_bar(bar, with_phonk_riff=True)
    for s in range(0, 16, 2):
        drums.add(hat(vel=0.6), at(bar * 4 + s / 4 + 0.25), 0.3, pan=0.18)

snare_roll(38, 39.5)

# --- efekty przypisane do zdarzeń z osi czasu
IMP_BIG = impact(True)
IMP_SMALL = impact(False)
CRASH = crash()
HIT = hit_small()
SHOT = shot_sfx()
for h in TL['hits']:
    b, kind = h['b'], h['type']
    i = at(b)
    if kind == 'drop':
        fx.add(IMP_BIG, i, 0.75)
        fx.add(CRASH, i, 0.32, pan=0.1)
        send.add(IMP_BIG, i, 0.2)
        send.add(CRASH, i, 0.15)
    elif kind in ('goal', 'big'):
        fx.add(IMP_BIG, i, 0.7)
        fx.add(CRASH, i, 0.34, pan=-0.1)
        send.add(CRASH, i, 0.2)
        send.add(IMP_BIG, i, 0.2)
    elif kind == 'slam' and b >= 8:
        fx.add(IMP_SMALL, i, 0.45)
    elif kind in ('card', 'tick'):
        fx.add(HIT, i, 0.35)
        send.add(HIT, i, 0.1)
    elif kind == 'whoosh':
        fx.add(whoosh(0.55), i - int(0.28 * SR), 0.45)
    elif kind == 'shot':
        fx.add(SHOT, i, 0.6)
    elif kind == 'steal':
        fx.add(whoosh(0.35), i - int(0.17 * SR), 0.4)
        fx.add(HIT, i, 0.3)
    elif kind == 'final':
        fx.add(IMP_BIG, i, 0.9)
        fx.add(CRASH, i, 0.4)
        send.add(IMP_BIG, i, 0.3)
        send.add(CRASH, i, 0.3)
        last = cowbell(note_hz('F5'), 1.4)
        fx.add(last, i, 0.3)
        send.add(last, i, 0.5)
        fx.add(bass808(note_hz('F1'), 2.2), i, 0.55)

for r in TL['risers']:
    end = r['to'] - 0.5 if any(abs(g['to'] - r['to']) < 1e-6 for g in TL['gaps']) else r['to']
    fx.add(riser((end - r['from']) * BEAT), at(r['from']), 0.3)
    rc = crash(BEAT * 1.0)[::-1]
    fx.add(rc, at(r['to']) - len(rc), 0.22, pan=-0.1)

fx.add(whistle(), at(24) + int(0.05 * SR), 0.1, pan=0.2)
send.add(whistle(), at(24) + int(0.05 * SR), 0.2)

# --- miks
mus = drums.x + bass.x * duck[:, None] + music.x * (0.75 + 0.25 * duck[:, None])

# cisza przed dropem (gap) i zatrzymanie bitu na końcu
gate = np.ones(N)
for g in TL['gaps']:
    a, b = at(g['from']), at(g['to'])
    gate[a:b] = 0
    gate[max(0, a - 240):a] = np.linspace(1, 0, min(240, a))
gate[at(46):] = 0
gate[at(46) - 240:at(46)] = np.linspace(1, 0, 240)
mus *= gate[:, None]

# „slow-mo”: muzyka za filtrem dolnoprzepustowym, powrót dokładnie na uderzeniu
auto = np.zeros(N)
for s in TL['slowmo']:
    a, b = at(s['from']), at(s['to'])
    ramp = int(0.12 * SR)
    auto[a:b] = 1
    auto[a:a + ramp] = np.linspace(0, 1, ramp)
mus_lp = np.stack([filt(mus[:, c], 'lowpass', 650, 4) for c in range(2)], axis=1)
mus = mus * (1 - auto[:, None]) + mus_lp * auto[:, None] * 1.25

# pogłos
IR = reverb_ir()
wet = np.stack([signal.fftconvolve(send.x[:, c], IR[:, c])[:N] for c in range(2)], axis=1)

# echo dzwonka (ping-pong, kropkowana ósemka)
d = int(3 * STEP * SR)
echo = np.zeros((N, 2))
src = music.x * gate[:, None]
for k, g in ((1, 0.28), (2, 0.16), (3, 0.09)):
    ch = 0 if k % 2 else 1
    echo[k * d:, ch] += src[: N - k * d, 0] * g

mix = mus + fx.x + 0.3 * wet + 0.5 * echo
fade = np.ones(N)
fs = at(46) + int(1.6 * SR)
fade[fs:] = np.linspace(1, 0, N - fs) ** 2
mix *= fade[:, None]

mix = np.stack([filt(mix[:, c], 'highpass', 32, 2) for c in range(2)], axis=1)
# korekcja pod głośniki telefonów: mniej czystego subu, więcej obecności
sub = np.stack([filt(mix[:, c], 'lowpass', 60, 2) for c in range(2)], axis=1)
pres = np.stack([filt(mix[:, c], 'bandpass', [2000, 6000], 2) for c in range(2)], axis=1)
mix = mix - 0.4 * sub + 0.3 * pres
mix = mix - np.mean(mix, axis=0)
mix = norm(mix, 1.0)
mix = np.tanh(1.8 * mix) / np.tanh(1.8)
mix = norm(mix, 0.89)

wavfile.write(OUT, SR, (mix * 32767).astype(np.int16))
print('ok', OUT, f'{N / SR:.2f}s', 'peak', float(np.max(np.abs(mix))))
