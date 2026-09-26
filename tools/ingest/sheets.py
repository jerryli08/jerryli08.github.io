#!/usr/bin/env python3
"""Numbered contact sheets of every photo and video in each project folder.

Reads inventory.json (from inventory.py) and, per project, writes JPEG grids where each cell
is one file: a photo's thumbnail, or three frames from a video (10%, 50%, 90% through) with its
length. Every cell carries a number; sheets.json maps each number back to the file, so picks
can be made by number and nothing is read into the build that was not seen first.

Needs Pillow; HEIC photos need pillow-heif; videos need ffmpeg (on PATH, or the binary that
ships with the imageio-ffmpeg pip package). Missing pieces are reported, not fatal.

usage: python3 sheets.py <folder> <out-dir> [--project NAME] [--per-sheet 30]
"""
import argparse, json, os, re, shutil, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont, ImageOps

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    HEIF = True
except Exception:
    HEIF = False


def find_ffmpeg():
    exe = shutil.which('ffmpeg')
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


FF = find_ffmpeg()
CELL_W, THUMB_H, LABEL_H, COLS = 360, 240, 34, 5


def duration(path):
    r = subprocess.run([FF, '-hide_banner', '-i', path], capture_output=True, text=True)
    m = re.search(r'Duration: (\d+):(\d+):([\d.]+)', r.stderr)
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)) if m else None


def video_tile(path, tmp):
    d = duration(path)
    if not d:
        return None, None
    frames = []
    for i, frac in enumerate((0.1, 0.5, 0.9)):
        f = os.path.join(tmp, f'f{i}.jpg')
        subprocess.run([FF, '-v', 'error', '-y', '-ss', f'{d * frac:.2f}', '-i', path, '-frames:v', '1',
                        '-vf', 'scale=480:-2', f], capture_output=True)
        if os.path.exists(f):
            frames.append(Image.open(f).convert('RGB'))
            os.remove(f)
    if not frames:
        return None, d
    tile = Image.new('RGB', (CELL_W, THUMB_H), (18, 18, 18))
    if frames[0].width > frames[0].height and len(frames) == 3:
        # landscape: the middle frame large on top, the first and last frames small beneath it
        top_h = THUMB_H * 2 // 3
        big = ImageOps.contain(frames[1], (CELL_W, top_h - 2))
        tile.paste(big, ((CELL_W - big.width) // 2, 0))
        for i, fr in enumerate((frames[0], frames[2])):
            fr = ImageOps.contain(fr, (CELL_W // 2 - 2, THUMB_H - top_h))
            tile.paste(fr, (i * CELL_W // 2 + (CELL_W // 2 - fr.width) // 2, top_h))
    else:
        # portrait: three frames side by side, each letterboxed to a third of the width
        w3 = CELL_W // 3
        for i, fr in enumerate(frames):
            fr = ImageOps.contain(fr, (w3 - 2, THUMB_H))
            tile.paste(fr, (i * w3 + (w3 - fr.width) // 2, (THUMB_H - fr.height) // 2))
    return tile, d


def image_tile(path):
    im = Image.open(path)
    im = ImageOps.exif_transpose(im).convert('RGB')
    size = im.size  # the original's size, before thumbnailing
    im = ImageOps.contain(im, (CELL_W, THUMB_H))
    tile = Image.new('RGB', (CELL_W, THUMB_H), (18, 18, 18))
    tile.paste(im, ((CELL_W - im.width) // 2, (THUMB_H - im.height) // 2))
    return tile, size


def font(size):
    for f in ('DejaVuSans.ttf', 'arial.ttf', 'Arial.ttf'):
        try:
            return ImageFont.truetype(f, size)
        except Exception:
            pass
    return ImageFont.load_default()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('folder'); ap.add_argument('out')
    ap.add_argument('--project', action='append', help='only these project folders (repeatable)')
    ap.add_argument('--per-sheet', type=int, default=30)
    a = ap.parse_args()
    inv = json.load(open(os.path.join(a.out, 'inventory.json')))
    root = a.folder
    items = [f for f in inv['files'] if f['kind'] in ('image', 'video')]
    if a.project:
        items = [f for f in items if f['project'] in a.project]
    by_proj = {}
    for f in sorted(items, key=lambda f: (f['project'], f['mtime'], f['path'])):
        by_proj.setdefault(f['project'], []).append(f)
    if not FF:
        print('warning: no ffmpeg found; videos will be listed but not drawn')
    if not HEIF:
        print('warning: pillow-heif missing; HEIC photos will be listed but not drawn')
    index, big, small = {}, font(15), font(12)
    sheet_dir = os.path.join(a.out, 'sheets')
    os.makedirs(sheet_dir, exist_ok=True)
    tmp = tempfile.mkdtemp()
    n = 0
    for proj, lst in by_proj.items():
        slug = re.sub(r'[^A-Za-z0-9]+', '-', proj).strip('-')[:60] or 'top'
        for s in range(0, len(lst), a.per_sheet):
            chunk = lst[s:s + a.per_sheet]
            rows = (len(chunk) + COLS - 1) // COLS
            sheet = Image.new('RGB', (CELL_W * COLS, (THUMB_H + LABEL_H) * rows), (8, 8, 8))
            draw = ImageDraw.Draw(sheet)
            for i, f in enumerate(chunk):
                n += 1
                x, y = (i % COLS) * CELL_W, (i // COLS) * (THUMB_H + LABEL_H)
                p = os.path.join(root, f['path'])
                tile, info = None, ''
                try:
                    if f['kind'] == 'video' and FF:
                        tile, d = video_tile(p, tmp)
                        info = f'{d:.0f} s' if d else 'unreadable'
                    elif f['kind'] == 'image':
                        tile, size = image_tile(p)
                        info = f'{size[0]}x{size[1]}'
                except Exception as e:
                    info = 'unreadable'
                if tile:
                    sheet.paste(tile, (x, y))
                else:
                    draw.text((x + 10, y + THUMB_H // 2), f'{f["ext"]} not drawn', fill=(150, 150, 150), font=small)
                draw.rectangle([x, y, x + 44, y + 22], fill=(255, 122, 46))
                draw.text((x + 5, y + 3), str(n), fill=(0, 0, 0), font=big)
                name = os.path.basename(f['path'])
                draw.text((x + 6, y + THUMB_H + 3), name[:44], fill=(230, 230, 230), font=small)
                draw.text((x + 6, y + THUMB_H + 18), f'{f["kind"]} {info} {f["bytes"] / 1e6:.0f} MB {f["mtime"]}', fill=(140, 140, 140), font=small)
                index[n] = f['path']
            out = os.path.join(sheet_dir, f'{slug}-{s // a.per_sheet + 1:02d}.jpg')
            sheet.save(out, quality=78)
            print(out, f'({len(chunk)} items)')
    json.dump(index, open(os.path.join(a.out, 'sheets.json'), 'w'), indent=0)
    shutil.rmtree(tmp, ignore_errors=True)
    print(f'{n} items on sheets; numbers mapped in sheets.json')


if __name__ == '__main__':
    main()
