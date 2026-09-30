#!/usr/bin/env python3
"""
Pliki pochodne ze zdjęć zawodników (oryginały zostają nietknięte):

  img/players/face/<id>.jpg  wycinek głowy i ramion 320×320 do kółek na boisku i list
  img/players/web/<id>.jpg   JPEG 940×940 dla portretów zapisanych jako ciężkie PNG

Aktualizuje img/players/sources.json (blok "derived" przy każdym zawodniku)
i zapisuje od nowa js/photos.js na podstawie sources.json.

Użycie (z katalogu repozytorium): python tools/make_web_photos.py   (wymaga Pillow)
"""
import hashlib
import json
import os

from PIL import Image

SRC = 'img/players/sources.json'
# kadr wycinka jako ułamek boku portretu (zdjęcia klubowe mają powtarzalne ujęcie)
CROP = {'x': 0.275, 'y': 0.05, 'size': 0.45}
FACE_PX = 320


def sha(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def info(path, **extra):
    im = Image.open(path)
    return {'path': path, **extra, 'sha256': sha(path), 'width': im.width, 'height': im.height, 'bytes': os.path.getsize(path)}


def main():
    data = json.load(open(SRC, encoding='utf-8'))
    os.makedirs('img/players/face', exist_ok=True)
    os.makedirs('img/players/web', exist_ok=True)
    for p in data['players']:
        pid = p['id']
        portrait = p['files']['portrait']['path']
        im = Image.open(portrait).convert('RGB')
        w, h = im.size
        box = (round(CROP['x'] * w), round(CROP['y'] * h), round((CROP['x'] + CROP['size']) * w), round((CROP['y'] + CROP['size']) * h))
        face = f'img/players/face/{pid}.jpg'
        im.crop(box).resize((FACE_PX, FACE_PX), Image.LANCZOS).save(face, 'JPEG', quality=86, optimize=True, progressive=True)
        derived = {'face': info(face, derived_from=portrait, crop_box=list(box))}
        if Image.open(portrait).format != 'JPEG':
            web = f'img/players/web/{pid}.jpg'
            im.save(web, 'JPEG', quality=88, optimize=True, progressive=True)
            derived['web'] = info(web, derived_from=portrait)
        p['derived'] = derived
    data['derived_note'] = ('Pliki w img/players/face i img/players/web są pochodnymi oryginałów '
                            '(wycinek głowy i ramion 320×320 oraz JPEG zamiast PNG) wygenerowanymi przez tools/make_web_photos.py.')
    json.dump(data, open(SRC, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    open(SRC, 'a', encoding='utf-8').write('\n')

    entries = {}
    for p in data['players']:
        d = p['derived']
        entries[p['id']] = {
            'src': d['web']['path'] if 'web' in d else p['files']['portrait']['path'],
            'face': d['face']['path'],
            'thumb': p['files']['thumb']['path'],
            'original': p['files']['portrait']['path'],
            'credit': data['provider'],
            'page': p['page'],
            'official': True,
        }
    header = (
        '/*\n'
        ' * Oficjalne zdjęcia wszystkich 27 zawodników z serwisu FC Barcelona (zapisane lokalnie).\n'
        ' * Mają pierwszeństwo przed pamięcią podręczną i Wikimedia Commons.\n'
        ' *   src      portret 940×940 do profilu i podglądu pod kursorem\n'
        ' *   face     wycinek głowy i ramion 320×320 do kółek na boisku i list\n'
        ' *   thumb    oryginalna miniatura 160×160 z serwisu klubu (zapasowo)\n'
        ' *   original plik pobrany z serwisu klubu (gdy src jest jego lżejszą kopią JPEG)\n'
        ' * Plik generuje tools/make_web_photos.py na podstawie img/players/sources.json.\n'
        ' */\n'
    )
    with open('js/photos.js', 'w', encoding='utf-8') as f:
        f.write(header + 'window.LOCAL_PHOTOS = ' + json.dumps(entries, ensure_ascii=False, indent=2) + ';\n')
    total = sum(os.path.getsize(e['face']) for e in entries.values())
    print(f'{len(entries)} zawodników, wycinki twarzy razem {total / 1024:.0f} KB')
    for pid, e in entries.items():
        if e['src'] != e['original']:
            print(f'  {pid}: {os.path.getsize(e["original"]) / 1e6:.2f} MB -> {os.path.getsize(e["src"]) / 1e6:.2f} MB')


if __name__ == '__main__':
    main()
