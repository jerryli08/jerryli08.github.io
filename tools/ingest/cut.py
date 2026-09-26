#!/usr/bin/env python3
"""Turn a project's media picks into web-ready files, on the machine that holds the originals.

picks JSON: {"slug": "hybrid-vehicle", "items": [ ... ]} where each item is one of
  video clip: {"src": "<path in folder>", "out": "name", "start": 3.0, "end": 12.5,
               "w": 1280, "audio": false, "speed": 1.0, "crop": [x, y, w, h] | null}
  still:      {"src": "<video path>", "out": "name", "at": 7.2, "w": 1600}
  photo:      {"src": "<image path>", "out": "name", "w": 1600, "crop": [x, y, w, h] | null}
Writes <out>/web/<slug>/: name.mp4 + name.jpg poster (clips), name.webp + name-s.webp (stills
and photos, 1600 and 800 px). iPhone HDR (HLG / PQ) video is tone-mapped to SDR so it does not
look washed out. Existing outputs are skipped; --budget stops cleanly between items.

usage: python3 cut.py <folder> <out> <picks.json> [--budget 150]
"""
import argparse, json, os, re, shutil, subprocess, sys, time

FF = shutil.which('ffmpeg')
TONEMAP = ('zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,'
           'tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p')


def probe(path):
    r = subprocess.run([FF, '-hide_banner', '-i', path], capture_output=True, text=True, errors='replace')
    e = r.stderr
    hdr = bool(re.search(r'arib-std-b67|smpte2084', e))
    has_audio = bool(re.search(r'Stream #.*Audio:', e))
    return hdr, has_audio


def vf_chain(hdr, w, crop=None, speed=1.0, portrait_ok=True):
    parts = []
    if hdr:
        parts.append(TONEMAP)
    if crop:
        x, y, cw, ch = crop
        parts.append(f'crop={cw}:{ch}:{x}:{y}')
    # long edge = w, keep aspect, even dimensions
    parts.append(f"scale='if(gt(iw,ih),min({w},iw),-2)':'if(gt(iw,ih),-2,min({w},ih))':flags=lanczos")
    if speed != 1.0:
        parts.append(f'setpts=PTS/{speed}')
    parts.append("fps='min(30,source_fps)'" if speed == 1.0 else 'fps=30')
    parts.append('format=yuv420p')
    return ','.join(parts)


def clip(src, dst, it):
    hdr, has_audio = probe(src)
    start, end = float(it.get('start', 0)), it.get('end')
    args = [FF, '-v', 'error', '-y', '-ss', f'{start:.2f}']
    if end is not None:
        args += ['-t', f'{float(end) - start:.2f}']
    args += ['-i', src, '-vf', vf_chain(hdr, it.get('w', 1280), it.get('crop'), it.get('speed', 1.0))]
    if it.get('audio') and has_audio and it.get('speed', 1.0) == 1.0:
        args += ['-c:a', 'aac', '-b:a', '96k']
    else:
        args += ['-an']
    args += ['-c:v', 'libx264', '-preset', 'medium', '-crf', str(it.get('crf', 27)), '-profile:v', 'high',
             '-movflags', '+faststart', dst + '.tmp.mp4']
    subprocess.run(args, check=True, capture_output=True)
    os.replace(dst + '.tmp.mp4', dst)
    # poster: first frame of the clip
    subprocess.run([FF, '-v', 'error', '-y', '-i', dst, '-frames:v', '1', '-q:v', '4', dst[:-4] + '.jpg'], check=True, capture_output=True)


def still(src, dst_base, it):
    hdr, _ = probe(src)
    tmp = dst_base + '.tmp.png'
    subprocess.run([FF, '-v', 'error', '-y', '-ss', f'{float(it["at"]):.2f}', '-i', src, '-frames:v', '1',
                    '-vf', vf_chain(hdr, it.get('w', 1600), it.get('crop')).replace(",fps='min(30,source_fps)'", ''), tmp],
                   check=True, capture_output=True)
    webp_pair(tmp, dst_base, it.get('w', 1600), None)
    os.remove(tmp)


def webp_pair(src, dst_base, w, crop):
    from PIL import Image, ImageOps
    try:
        from pillow_heif import register_heif_opener
        register_heif_opener()
    except Exception:
        pass
    im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
    if crop:
        x, y, cw, ch = crop
        im = im.crop((x, y, x + cw, y + ch))
    for suffix, size in (('', w), ('-s', 800)):
        c = im.copy()
        c.thumbnail((size, size), Image.LANCZOS)
        c.save(dst_base + suffix + '.webp', quality=80, method=5)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('folder'); ap.add_argument('out'); ap.add_argument('picks')
    ap.add_argument('--budget', type=float, default=150)
    a = ap.parse_args()
    t_end = time.time() + a.budget
    picks = json.load(open(a.picks))
    odir = os.path.join(a.out, 'web', picks['slug'])
    os.makedirs(odir, exist_ok=True)
    done = todo = 0
    for it in picks['items']:
        src = os.path.join(a.folder, it['src'])
        is_video = os.path.splitext(src)[1].lower() in ('.mov', '.mp4', '.m4v') and 'at' not in it
        dst = os.path.join(odir, it['out'] + ('.mp4' if is_video else '.webp'))
        if os.path.exists(dst):
            continue
        if time.time() + (40 if is_video else 5) > t_end:
            todo += 1
            continue
        try:
            if is_video:
                clip(src, dst, it)
            elif 'at' in it:
                still(src, dst[:-5], it)
            else:
                webp_pair(src, dst[:-5], it.get('w', 1600), it.get('crop'))
            done += 1
        except Exception as e:
            print('fail', it['out'], str(e)[:200], flush=True)
    print(json.dumps({'slug': picks['slug'], 'done': done, 'left': todo}))


if __name__ == '__main__':
    main()
