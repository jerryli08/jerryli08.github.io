#!/usr/bin/env python3
"""Storyboard every video end to end so it can be reviewed without watching it in real time.

One ffmpeg decode per video produces:
  - frames: one every --every seconds plus every scene cut, each with its timestamp
  - motion: mean frame-to-frame change per second (robot moving, crashes, camera swings)
  - loudness: RMS level per second (cheering, impacts, someone talking)
  - audio.wav: 16 kHz mono, for transcribe.py
Then it draws storyboard sheets (timestamped frames, a motion and loudness trace across the top,
peaks outlined in orange) and writes <video>.json with the frames, per-second traces and peaks.

Output goes to <out>/boards/<project>/<video>/. Videos already done are skipped, so the run can
be stopped and restarted. Originals are only read.

usage: python3 storyboard.py <folder> <out-dir> [--project NAME] [--every 2] [--limit N]
Needs ffmpeg (on PATH or from the imageio-ffmpeg pip package) and Pillow.
"""
import argparse, json, os, re, shutil, subprocess, sys, time
from PIL import Image, ImageDraw, ImageFont

FRAME_W, COLS, ROWS = 300, 6, 6


def find_ffmpeg():
    exe = shutil.which('ffmpeg')
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit('ffmpeg not found: pip install imageio-ffmpeg')


FF = find_ffmpeg()


def font(size):
    for f in ('DejaVuSans.ttf', 'arial.ttf', 'Arial.ttf'):
        try:
            return ImageFont.truetype(f, size)
        except Exception:
            pass
    return ImageFont.load_default()


def probe(path):
    r = subprocess.run([FF, '-hide_banner', '-i', path], capture_output=True, text=True, errors='replace')
    e = r.stderr
    d = re.search(r'Duration: (\d+):(\d+):([\d.]+)', e)
    dur = int(d.group(1)) * 3600 + int(d.group(2)) * 60 + float(d.group(3)) if d else None
    ct = re.search(r'creation_time\s*:\s*(\S+)', e)
    has_audio = bool(re.search(r'Stream #.*Audio:', e))
    return {'duration': dur, 'created': ct.group(1) if ct else None, 'audio': has_audio}


def parse_meta(path, key):
    """ffmpeg metadata=print file: 'frame:N pts:P pts_time:T' then 'key=value' lines."""
    out, t = [], None
    if not os.path.exists(path):
        return out
    for line in open(path, errors='replace'):
        m = re.search(r'pts_time:([\d.]+)', line)
        if m:
            t = float(m.group(1)); continue
        if line.startswith(key + '=') and t is not None:
            try:
                out.append((t, float(line.split('=', 1)[1])))
            except ValueError:
                pass
    return out


def per_second(samples, dur, agg):
    n = max(1, int(dur) + 1)
    bins = [[] for _ in range(n)]
    for t, v in samples:
        i = min(n - 1, int(t))
        bins[i].append(v)
    return [round(agg(b), 3) if b else None for b in bins]


def peaks(series, k=2.0, min_gap=4):
    """Seconds where the value stands well above the video's own typical level."""
    vals = sorted(v for v in series if v is not None)
    if len(vals) < 6:
        return []
    med = vals[len(vals) // 2]
    mad = sorted(abs(v - med) for v in vals)[len(vals) // 2] or 1e-6
    cand = [(i, (v - med) / mad) for i, v in enumerate(series) if v is not None and (v - med) / mad > k * 1.4826]
    cand.sort(key=lambda c: -c[1])
    picked = []
    for i, z in cand:
        if all(abs(i - j) >= min_gap for j, _ in picked):
            picked.append((i, z))
    return sorted(picked)[:12]


def fmt(t):
    t = int(t)
    return f'{t // 3600}:{t % 3600 // 60:02d}:{t % 60:02d}' if t >= 3600 else f'{t // 60}:{t % 60:02d}'


def run_ffmpeg(path, work, every, audio, threads=0):
    # ffmpeg runs inside the work folder with bare file names, so no path ever needs
    # escaping inside the filter graph (spaces, colons and quotes in folder names are common)
    frames_dir = os.path.join(work, 'frames')
    os.makedirs(frames_dir, exist_ok=True)
    motion_f, loud_f, shown_f = 'motion.txt', 'loud.txt', 'shown.txt'
    # video: shrink first (cheap scene and motion maths), then split into the frame picker and the motion meter
    fc = (f"[0:v]scale=480:-2,split=2[a][b];"
          f"[a]select='isnan(prev_selected_t)+gte(t-prev_selected_t\\,{every})+gt(scene\\,0.32)',"
          f"metadata=mode=print:file='{shown_f}'[vf];"
          f"[b]scale=160:-2,signalstats,metadata=mode=print:key=lavfi.signalstats.YDIF:file='{motion_f}'[vm]")
    maps = ['-map', '[vf]', '-fps_mode', 'vfr', '-q:v', '5', 'frames/f%05d.jpg',
            '-map', '[vm]', '-f', 'null', '-']
    if audio:
        fc += (f";[0:a]aresample=16000,aformat=channel_layouts=mono,asplit=2[wa][la];"
               f"[la]asetnsamples=n=16000:p=0,astats=metadata=1:reset=1,"
               f"ametadata=mode=print:key=lavfi.astats.Overall.RMS_level:file='{loud_f}'[al]")
        maps += ['-map', '[wa]', '-c:a', 'pcm_s16le', 'audio.wav', '-map', '[al]', '-f', 'null', '-']
    cmd = [FF, '-hide_banner', '-v', 'error', '-y', '-threads', str(threads), '-i', os.path.abspath(path), '-filter_complex', fc] + maps
    r = subprocess.run(cmd, capture_output=True, text=True, errors='replace', cwd=work)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip()[-400:])
    # metadata=print writes one 'pts_time:T' line per frame that reaches the picker's output
    sp = os.path.join(work, shown_f)
    shown = [float(m) for m in re.findall(r'pts_time:([\d.]+)', open(sp, errors='replace').read())] if os.path.exists(sp) else []
    files = sorted(os.listdir(frames_dir))
    return ([(shown[i] if i < len(shown) else None, os.path.join(frames_dir, f)) for i, f in enumerate(files)],
            os.path.join(work, motion_f), os.path.join(work, loud_f))


def draw_sheets(frames, motion, loud, mpk, lpk, dur, title, out_prefix):
    big, small = font(16), font(13)
    per = COLS * ROWS
    sheets = []
    peak_secs = {s for s, _ in mpk} | {s for s, _ in lpk}
    for s in range(0, len(frames), per):
        chunk = frames[s:s + per]
        fh = int(FRAME_W * 9 / 16)
        sample = Image.open(chunk[0][1])
        if sample.height > sample.width:  # portrait video
            fh = int(FRAME_W * 16 / 9 * 0.62)
        graph_h, label_h = 70, 20
        rows = (len(chunk) + COLS - 1) // COLS
        W, H = FRAME_W * COLS, 34 + graph_h + rows * (fh + label_h)
        sheet = Image.new('RGB', (W, H), (8, 8, 8))
        d = ImageDraw.Draw(sheet)
        t0, t1 = chunk[0][0] or 0, chunk[-1][0] or dur
        d.text((8, 8), f'{title}   {fmt(t0)} to {fmt(t1)} of {fmt(dur)}   sheet {s // per + 1} of {(len(frames) + per - 1) // per}', fill=(235, 235, 235), font=big)
        # motion (blue) and loudness (orange) across the whole video, this sheet's span shaded
        gy = 34
        d.rectangle([0, gy, W, gy + graph_h], fill=(20, 20, 24))
        d.rectangle([int(W * t0 / max(dur, 1)), gy, int(W * t1 / max(dur, 1)), gy + graph_h], fill=(40, 40, 52))
        for series, col in ((motion, (90, 160, 255)), (loud, (255, 140, 60))):
            vals = [v for v in series if v is not None]
            if not vals:
                continue
            lo, hi = min(vals), max(vals)
            pts = [(int(W * i / max(len(series) - 1, 1)), gy + graph_h - 4 - int((graph_h - 8) * ((v - lo) / (hi - lo) if hi > lo else 0)))
                   for i, v in enumerate(series) if v is not None]
            if len(pts) > 1:
                d.line(pts, fill=col, width=2)
        for sec in peak_secs:
            x = int(W * sec / max(dur, 1))
            d.line([x, gy, x, gy + graph_h], fill=(255, 122, 46), width=1)
        for i, (t, f) in enumerate(chunk):
            x, y = (i % COLS) * FRAME_W, 34 + graph_h + (i // COLS) * (fh + label_h)
            im = Image.open(f).convert('RGB')
            im.thumbnail((FRAME_W - 4, fh - 4))
            sheet.paste(im, (x + (FRAME_W - im.width) // 2, y + (fh - im.height) // 2))
            hot = t is not None and any(abs(t - p) <= 1.5 for p in peak_secs)
            if hot:
                d.rectangle([x + 1, y + 1, x + FRAME_W - 2, y + fh - 2], outline=(255, 122, 46), width=3)
            d.text((x + 6, y + fh + 2), fmt(t) if t is not None else '?', fill=(255, 190, 120) if hot else (200, 200, 200), font=small)
        path = f'{out_prefix}-p{s // per + 1:02d}.jpg'
        sheet.save(path, quality=80)
        sheets.append(path)
    return sheets


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('folder'); ap.add_argument('out')
    ap.add_argument('--project', action='append')
    ap.add_argument('--every', type=float, default=2.0, help='seconds between regular frames')
    ap.add_argument('--limit', type=int, default=0, help='stop after N videos (testing)')
    ap.add_argument('--jobs', type=int, default=0, help='videos at once (default: half the CPU cores)')
    a = ap.parse_args()
    inv = json.load(open(os.path.join(a.out, 'inventory.json')))
    vids = [f for f in inv['files'] if f['kind'] == 'video' and (not a.project or f['project'] in a.project)]
    vids.sort(key=lambda f: (f['project'], f['path']))
    todo = vids[:a.limit] if a.limit else vids
    jobs = a.jobs or max(1, (os.cpu_count() or 2) // 2)
    print(f'{len(todo)} videos, {jobs} at a time')
    if jobs == 1:
        for f in todo:
            one(f, a.folder, a.out, a.every, 0)
    else:
        from concurrent.futures import ProcessPoolExecutor
        with ProcessPoolExecutor(jobs) as ex:
            for _ in ex.map(one, todo, [a.folder] * len(todo), [a.out] * len(todo), [a.every] * len(todo), [2] * len(todo)):
                pass


def one(f, folder, out, every, threads):
    """Storyboard one video; safe to run in parallel with others."""
    slug_p = re.sub(r'[^A-Za-z0-9]+', '-', f['project']).strip('-')[:50] or 'top'
    inner = f['path'][len(f['project']) + 1:] if f['path'].startswith(f['project'] + '/') else f['path']
    slug_v = re.sub(r'[^A-Za-z0-9]+', '-', os.path.splitext(inner)[0]).strip('-')[:80] or 'video'
    work = os.path.join(out, 'boards', slug_p, slug_v)
    meta_path = os.path.join(work, 'board.json')
    if os.path.exists(meta_path):
        return
    os.makedirs(work, exist_ok=True)
    src = os.path.join(folder, f['path'])
    info = probe(src)
    if not info['duration']:
        print('skip (unreadable):', f['path'], flush=True); return
    t_start = time.time()
    try:
        frames, mf, lf = run_ffmpeg(src, work, every, info['audio'], threads)
    except Exception as e:
        print('fail:', f['path'], e, flush=True); return
    dur = info['duration']
    motion = per_second(parse_meta(mf, 'lavfi.signalstats.YDIF'), dur, lambda b: sum(b) / len(b))
    loud = per_second([(t, v) for t, v in parse_meta(lf, 'lavfi.astats.Overall.RMS_level') if v > -120], dur, max)
    mpk, lpk = peaks(motion), peaks(loud)
    sheets = draw_sheets(frames, motion, loud, mpk, lpk, dur, f['path'], os.path.join(work, 'board'))
    shutil.rmtree(os.path.join(work, 'frames'), ignore_errors=True)  # the sheets hold them now
    meta = {'path': f['path'], 'project': f['project'], 'duration': dur, 'created': info['created'],
            'frames': [t for t, _ in frames], 'motion': motion, 'loudness_db': loud,
            'motion_peaks': [{'t': s, 'z': round(z, 1)} for s, z in mpk],
            'loud_peaks': [{'t': s, 'z': round(z, 1)} for s, z in lpk],
            'sheets': [os.path.relpath(s, out).replace(os.sep, '/') for s in sheets],
            'audio_wav': os.path.relpath(os.path.join(work, 'audio.wav'), out).replace(os.sep, '/') if info['audio'] else None}
    # written last and atomically: its presence means this video is finished
    json.dump(meta, open(meta_path + '.tmp', 'w'))
    os.replace(meta_path + '.tmp', meta_path)
    print(f'{f["path"]}: {fmt(dur)}, {len(frames)} frames, {len(sheets)} sheet(s), '
          f'{len(mpk)} motion + {len(lpk)} sound peaks, {time.time() - t_start:.0f} s', flush=True)


if __name__ == '__main__':
    main()
