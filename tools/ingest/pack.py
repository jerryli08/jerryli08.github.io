#!/usr/bin/env python3
"""Bundle one project's review material into a single tar, so it moves in one transfer.

Contents: every storyboard sheet, photo sheet, board.json and transcript for the project, plus
an index.md that lists each video (path, length, capture date, motion and sound peaks, the
transcript) and each photo group, so a reviewer can read the index and open only what matters.

usage: python3 pack.py <out> "<project folder name>"   ->  <out>/review/<slug>.tar
"""
import glob, io, json, os, re, sys, tarfile


def fmt(t):
    t = int(t)
    return f'{t // 60}:{t % 60:02d}'


def main():
    out, proj = sys.argv[1], sys.argv[2]
    slug = re.sub(r'[^A-Za-z0-9]+', '-', proj).strip('-')
    boards = sorted(glob.glob(os.path.join(out, 'boards', slug[:50], '*', 'board.json')))
    pj = os.path.join(out, 'photos', slug[:60] + '.json')
    L = [f'# Review index: {proj}', '']
    files = []
    L += [f'## Videos ({len(boards)})', '', 'Each video: storyboard sheet(s) show a frame every ~1-2 s (keyframes) with a motion (blue)',
          'and loudness (orange) trace on top; frames near a peak are outlined orange.', '']
    for bj in boards:
        m = json.load(open(bj))
        d = os.path.dirname(bj)
        rel = os.path.relpath(d, out)
        tr = open(os.path.join(d, 'transcript.txt')).read().strip() if os.path.exists(os.path.join(d, 'transcript.txt')) else '(not transcribed yet)'
        mp = ', '.join(fmt(p['t']) for p in m.get('motion_peaks', [])) or '-'
        lp = ', '.join(fmt(p['t']) for p in m.get('loud_peaks', [])) or '-'
        L += [f'### {m["path"]}', f'- length {fmt(m["duration"])}, captured {m.get("created") or "?"}, frames: {m.get("mode", "?")}',
              f'- sheets: ' + ', '.join(m.get('sheets', [])), f'- motion peaks: {mp}; sound peaks: {lp}',
              '- transcript:' + ('\n```\n' + tr + '\n```' if tr else ' (no speech)'), '']
        files += [os.path.join(out, s) for s in m.get('sheets', [])] + [bj]
    if os.path.exists(pj):
        ph = json.load(open(pj))
        L += [f'## Photos ({ph["photos"]} photos in {len(ph["groups"])} groups)', '',
              'Sheets show the sharpest photo of each group, numbered; xN = group size.', '']
        L += ['- sheets: ' + ', '.join(ph['sheets']), '']
        for g in ph['groups']:
            L.append(f'- #{g["n"]}: {g["best"]} (x{g["size"]}, {g["taken"][:16]})' + (
                '; others: ' + ', '.join(os.path.basename(x['path']) for x in g['members'][1:6]) if g['size'] > 1 else ''))
        files += [os.path.join(out, s) for s in ph['sheets']] + [pj]
    cad = [f for f in json.load(open(os.path.join(out, 'inventory.json')))['files'] if f['project'] == proj and f['kind'] == 'cad']
    if cad:
        L += ['', '## CAD files', ''] + [f'- {f["path"]} ({f["bytes"] / 1e6:.1f} MB)' for f in cad]
    os.makedirs(os.path.join(out, 'review'), exist_ok=True)
    tp = os.path.join(out, 'review', slug + '.tar')
    with tarfile.open(tp + '.tmp', 'w') as t:
        data = ('\n'.join(L) + '\n').encode()
        ti = tarfile.TarInfo('index.md'); ti.size = len(data)
        t.addfile(ti, io.BytesIO(data))
        for f in files:
            if os.path.exists(f):
                t.add(f, arcname=os.path.relpath(f, out))
    os.replace(tp + '.tmp', tp)
    print(tp, f'{os.path.getsize(tp) / 1e6:.1f} MB', len(boards), 'videos')


if __name__ == '__main__':
    main()
