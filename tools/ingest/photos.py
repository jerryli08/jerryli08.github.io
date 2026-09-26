#!/usr/bin/env python3
"""Group near-identical photos (bursts, retakes, copies) and rank each group, per project.

For every photo: capture time (EXIF, else file date), a 64-bit difference hash, sharpness
(edge variance on a 512 px grayscale copy) and exposure (mean level, clipped share).
Photos taken within --window seconds of each other that look alike, and exact look-alikes
anywhere in the project, share a group. Each group is ranked sharpest first.

Writes <out>/photos/<project>.json (every group and its ranked members) and numbered sheets
of the best photo from each group, badged with the group size. photos.json maps numbers to
groups, so a pick like "12" means "the best shot of group 12" and the rest stay findable.

usage: python3 photos.py <folder> <out-dir> [--project NAME] [--window 20]
Needs Pillow; HEIC photos need pillow-heif.
"""
import argparse, datetime as dt, json, os, re, time
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps, ImageStat

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except Exception:
    pass

CELL_W, THUMB_H, LABEL_H, COLS, PER = 330, 250, 36, 6, 36


def font(size):
    for f in ('DejaVuSans.ttf', 'arial.ttf', 'Arial.ttf'):
        try:
            return ImageFont.truetype(f, size)
        except Exception:
            pass
    return ImageFont.load_default()


def analyse(path, fallback_date):
    im = Image.open(path)
    taken = None
    try:
        ex = im.getexif()
        raw = ex.get_ifd(0x8769).get(36867) or ex.get(306)  # DateTimeOriginal, else DateTime
        if raw:
            taken = dt.datetime.strptime(str(raw)[:19], '%Y:%m:%d %H:%M:%S')
    except Exception:
        pass
    try:
        im.draft('RGB', (1024, 1024))  # JPEG: decode at reduced size, much faster
    except Exception:
        pass
    im = ImageOps.exif_transpose(im).convert('RGB')
    size = im.size
    g = im.convert('L')
    g.thumbnail((512, 512))
    sharp = ImageStat.Stat(g.filter(ImageFilter.FIND_EDGES)).var[0]
    st = ImageStat.Stat(g)
    hist = g.histogram()
    clipped = (sum(hist[:6]) + sum(hist[250:])) / max(1, g.width * g.height)
    small = g.resize((9, 8), Image.LANCZOS)
    px = list(small.tobytes())  # one byte per pixel in L mode
    h = 0
    for r in range(8):
        for c in range(8):
            h = (h << 1) | (px[r * 9 + c] > px[r * 9 + c + 1])
    thumb = im.copy()
    thumb.thumbnail((CELL_W, THUMB_H))
    when = taken or dt.datetime.strptime(fallback_date, '%Y-%m-%d')
    return {'taken': when.isoformat(), 'exif_time': bool(taken), 'w': size[0], 'h': size[1],
            'sharp': round(sharp, 1), 'mean': round(st.mean[0], 1), 'clipped': round(clipped, 3), 'hash': h}, thumb


def ham(a, b):
    return bin(a ^ b).count('1')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('folder'); ap.add_argument('out')
    ap.add_argument('--project', action='append')
    ap.add_argument('--window', type=float, default=20, help='seconds between shots of one burst')
    a = ap.parse_args()
    inv = json.load(open(os.path.join(a.out, 'inventory.json')))
    by_proj = {}
    for f in inv['files']:
        if f['kind'] == 'image' and (not a.project or f['project'] in a.project):
            by_proj.setdefault(f['project'], []).append(f)
    odir = os.path.join(a.out, 'photos')
    os.makedirs(odir, exist_ok=True)
    big, small = font(15), font(12)
    for proj, files in sorted(by_proj.items()):
        slug = re.sub(r'[^A-Za-z0-9]+', '-', proj).strip('-')[:60] or 'top'
        if os.path.exists(os.path.join(odir, slug + '.json')):
            continue
        t0 = time.time()
        items, thumbs = [], {}
        for f in files:
            try:
                info, th = analyse(os.path.join(a.folder, f['path']), f['mtime'])
            except Exception as e:
                print('unreadable:', f['path'], str(e)[:80]); continue
            info['path'] = f['path']; info['bytes'] = f['bytes']
            items.append(info); thumbs[f['path']] = th
        items.sort(key=lambda x: (x['taken'], x['path']))
        # union-find: same burst (close in time and alike) or the same picture anywhere in the project
        parent = list(range(len(items)))
        def find(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]; i = parent[i]
            return i
        def join(i, j):
            parent[find(i)] = find(j)
        ts = [dt.datetime.fromisoformat(x['taken']).timestamp() for x in items]
        for i in range(len(items)):
            j = i + 1
            while j < len(items) and ts[j] - ts[i] <= a.window:
                if ham(items[i]['hash'], items[j]['hash']) <= 12:
                    join(i, j)
                j += 1
            for k in range(i):
                if ham(items[i]['hash'], items[k]['hash']) <= 3:
                    join(i, k)
        groups = {}
        for i in range(len(items)):
            groups.setdefault(find(i), []).append(items[i])
        glist = []
        for members in groups.values():
            # sharpest first; a badly clipped or very dark frame drops behind its siblings
            members.sort(key=lambda x: -(x['sharp'] * (0.5 if x['clipped'] > 0.25 or x['mean'] < 35 else 1)))
            glist.append(members)
        glist.sort(key=lambda m: m[0]['taken'])
        out = {'project': proj, 'photos': len(items), 'groups': [
            {'n': gi + 1, 'best': m[0]['path'], 'size': len(m), 'taken': m[0]['taken'],
             'members': [{k: x[k] for k in ('path', 'taken', 'w', 'h', 'sharp', 'mean', 'clipped', 'bytes')} for x in m]}
            for gi, m in enumerate(glist)]}
        sheets = []
        for s in range(0, len(glist), PER):
            chunk = glist[s:s + PER]
            rows = (len(chunk) + COLS - 1) // COLS
            sheet = Image.new('RGB', (CELL_W * COLS, rows * (THUMB_H + LABEL_H)), (8, 8, 8))
            d = ImageDraw.Draw(sheet)
            for i, m in enumerate(chunk):
                n = s + i + 1
                x, y = (i % COLS) * CELL_W, (i // COLS) * (THUMB_H + LABEL_H)
                th = thumbs[m[0]['path']]
                sheet.paste(th, (x + (CELL_W - th.width) // 2, y + (THUMB_H - th.height) // 2))
                d.rectangle([x, y, x + 46, y + 22], fill=(255, 122, 46))
                d.text((x + 5, y + 3), str(n), fill=(0, 0, 0), font=big)
                if len(m) > 1:
                    d.rectangle([x + CELL_W - 52, y, x + CELL_W - 4, y + 22], fill=(40, 40, 40))
                    d.text((x + CELL_W - 47, y + 3), f'x{len(m)}', fill=(240, 240, 240), font=big)
                d.text((x + 6, y + THUMB_H + 3), os.path.basename(m[0]['path'])[:44], fill=(225, 225, 225), font=small)
                d.text((x + 6, y + THUMB_H + 19), m[0]['taken'].replace('T', ' ')[:16] + ('' if m[0].get('exif_time', True) else ' (file date)'),
                       fill=(140, 140, 140), font=small)
            p = os.path.join(odir, f'{slug}-{s // PER + 1:02d}.jpg')
            sheet.save(p, quality=80)
            sheets.append(os.path.relpath(p, a.out).replace(os.sep, '/'))
        out['sheets'] = sheets
        json.dump(out, open(os.path.join(odir, slug + '.json'), 'w'))
        print(f'{proj}: {len(items)} photos -> {len(glist)} groups, {len(sheets)} sheet(s), {time.time() - t0:.0f} s')


if __name__ == '__main__':
    main()
