#!/usr/bin/env python3
"""Inventory Jerry's project folder without touching it.

Walks the folder, sorts every file into cad / video / image / doc / other, and writes
  inventory.json  every file: path, bytes, kind, extension, modified time
  inventory.md    totals per project folder and kind, the CAD file list, the biggest
                  videos, and likely duplicates (same name and size in two places)
Standard library only, so it runs anywhere Python 3 does.

usage: python3 inventory.py <folder> <out-dir> [--depth N]
  --depth  how many folder levels count as "the project" (default 1: top-level folders)
"""
import argparse, json, os, time
from collections import defaultdict

KINDS = {
    'cad': {'.step', '.stp', '.f3d', '.f3z', '.iges', '.igs', '.stl', '.3mf', '.obj', '.sldprt', '.sldasm',
            '.x_t', '.x_b', '.sat', '.dxf', '.dwg', '.ipt', '.iam', '.fbx', '.glb', '.gltf', '.3dm', '.skp', '.scad'},
    'video': {'.mp4', '.mov', '.m4v', '.avi', '.mkv', '.webm', '.mts', '.m2ts', '.3gp', '.wmv', '.insv', '.lrv'},
    'image': {'.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.gif', '.tif', '.tiff', '.bmp', '.dng', '.cr2', '.nef', '.arw', '.raw'},
    'doc': {'.pdf', '.docx', '.doc', '.pptx', '.ppt', '.key', '.pages', '.xlsx', '.xls', '.csv', '.txt', '.md', '.rtf', '.numbers'},
    'code': {'.py', '.ino', '.cpp', '.c', '.h', '.hpp', '.java', '.kt', '.js', '.ts', '.json', '.yaml', '.yml', '.m', '.ipynb'},
}
SKIP_NAMES = {'.DS_Store', 'Thumbs.db', 'desktop.ini', '.localized'}
SKIP_DIRS = {'_portfolio_ingest', '.git', '__pycache__', 'node_modules', '.Trashes', '.Spotlight-V100', '.fseventsd', '$RECYCLE.BIN', 'System Volume Information'}


def kind_of(ext):
    for k, exts in KINDS.items():
        if ext in exts:
            return k
    return 'other'


def human(n):
    for unit in ('B', 'KB', 'MB', 'GB', 'TB'):
        if n < 1024 or unit == 'TB':
            return f'{n:.1f} {unit}' if unit != 'B' else f'{n} B'
        n /= 1024


def main():
    ap = argparse.ArgumentParser(description='Inventory a project folder without touching it.')
    ap.add_argument('folder'); ap.add_argument('out')
    ap.add_argument('--depth', type=int, default=1, help='folder levels that count as the project')
    a = ap.parse_args()
    root, out, depth = os.path.abspath(a.folder), os.path.abspath(a.out), a.depth
    os.makedirs(out, exist_ok=True)
    files, skipped = [], 0
    t0 = time.time()
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith('._')]
        for fn in filenames:
            if fn in SKIP_NAMES or fn.startswith('._'):  # macOS AppleDouble files from the exFAT copy
                skipped += 1
                continue
            p = os.path.join(dirpath, fn)
            try:
                st = os.stat(p)
            except OSError:
                skipped += 1
                continue
            rel = os.path.relpath(p, root).replace(os.sep, '/')
            ext = os.path.splitext(fn)[1].lower()
            parts = rel.split('/')
            project = '/'.join(parts[:depth]) if len(parts) > depth else '(top level)'
            files.append({'path': rel, 'bytes': st.st_size, 'kind': kind_of(ext), 'ext': ext,
                          'mtime': time.strftime('%Y-%m-%d', time.localtime(st.st_mtime)), 'project': project})
    by_proj = defaultdict(lambda: defaultdict(lambda: [0, 0]))
    by_kind = defaultdict(lambda: [0, 0])
    for f in files:
        by_proj[f['project']][f['kind']][0] += 1
        by_proj[f['project']][f['kind']][1] += f['bytes']
        by_kind[f['kind']][0] += 1
        by_kind[f['kind']][1] += f['bytes']
    total = sum(f['bytes'] for f in files)
    dup_groups = defaultdict(list)
    for f in files:
        if f['bytes'] > 256 * 1024:
            dup_groups[(os.path.basename(f['path']).lower(), f['bytes'])].append(f['path'])
    dups = [v for v in dup_groups.values() if len(v) > 1]
    dup_bytes = sum(k[1] * (len(v) - 1) for k, v in dup_groups.items() if len(v) > 1)

    with open(os.path.join(out, 'inventory.json'), 'w') as fh:
        json.dump({'root': root, 'depth': depth, 'files': files}, fh)
    kinds = ['cad', 'video', 'image', 'doc', 'code', 'other']
    L = [f'# Inventory of {os.path.basename(root)}', '',
         f'{len(files):,} files, {human(total)} ({skipped:,} system files skipped), scanned in {time.time() - t0:.0f} s.', '',
         '| Kind | Files | Size |', '|---|---:|---:|']
    L += [f'| {k} | {by_kind[k][0]:,} | {human(by_kind[k][1])} |' for k in kinds if by_kind[k][0]]
    L += ['', '## By project folder', '', '| Folder | ' + ' | '.join(kinds) + ' | Total |', '|---|' + '---:|' * (len(kinds) + 1)]
    for proj in sorted(by_proj, key=lambda p: -sum(v[1] for v in by_proj[p].values())):
        row = by_proj[proj]
        cells = [f'{row[k][0]} ({human(row[k][1])})' if row[k][0] else '' for k in kinds]
        L.append(f'| {proj} | ' + ' | '.join(cells) + f' | {human(sum(v[1] for v in row.values()))} |')
    cad = sorted((f for f in files if f['kind'] == 'cad'), key=lambda f: f['path'])
    L += ['', f'## CAD files ({len(cad)})', '']
    L += [f'- {f["path"]} ({human(f["bytes"])}, {f["mtime"]})' for f in cad]
    vids = sorted((f for f in files if f['kind'] == 'video'), key=lambda f: -f['bytes'])[:40]
    L += ['', '## Largest videos', '']
    L += [f'- {f["path"]} ({human(f["bytes"])})' for f in vids]
    L += ['', f'## Likely duplicates ({len(dups)} groups, {human(dup_bytes)} redundant)', '']
    L += ['- ' + ' = '.join(g) for g in dups[:60]]
    with open(os.path.join(out, 'inventory.md'), 'w') as fh:
        fh.write('\n'.join(L) + '\n')
    print(f'{len(files):,} files, {human(total)}; wrote inventory.json and inventory.md to {out}')


if __name__ == '__main__':
    main()
