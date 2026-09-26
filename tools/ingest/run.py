#!/usr/bin/env python3
"""Run the whole first pass over Jerry's project folder, unattended and restartable.

  1. inventory   what is there, per project and kind (seconds)
  2. photos      burst/duplicate groups, ranked, with numbered sheets
  3. storyboard  every video end to end: frames, motion, loudness, audio
  4. transcribe  timestamped speech for every video with sound

Each step skips work already done, so after a crash or a sleep just run it again.
Progress goes to <out>/progress.json and the log to <out>/ingest.log. Start it in the
background so it outlives the shell that launched it:

  nohup python3 tools/ingest/run.py "<folder>" "<out>" > /dev/null 2>&1 &

Originals are only read. Everything written goes under <out>.
"""
import json, os, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
DEPS = {'PIL': 'pillow', 'pillow_heif': 'pillow-heif', 'imageio_ffmpeg': 'imageio-ffmpeg', 'faster_whisper': 'faster-whisper'}


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    folder, out = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
    extra = sys.argv[3:]
    os.makedirs(out, exist_ok=True)
    log = open(os.path.join(out, 'ingest.log'), 'a', buffering=1)
    prog_path = os.path.join(out, 'progress.json')
    prog = {'started': time.strftime('%Y-%m-%d %H:%M:%S'), 'steps': {}}

    def save(step, state, **kw):
        prog['steps'][step] = {'state': state, 'at': time.strftime('%H:%M:%S'), **kw}
        json.dump(prog, open(prog_path, 'w'), indent=1)

    missing = []
    for mod, pkg in DEPS.items():
        try:
            __import__(mod)
        except Exception:
            missing.append(pkg)
    if missing:
        save('setup', 'installing', packages=missing)
        r = subprocess.run([sys.executable, '-m', 'pip', 'install', '--quiet', '--break-system-packages'] + missing, stdout=log, stderr=log)
        if r.returncode:
            r = subprocess.run([sys.executable, '-m', 'pip', 'install', '--quiet', '--user'] + missing, stdout=log, stderr=log)
        save('setup', 'done' if r.returncode == 0 else 'failed', packages=missing)
    steps = [
        ('inventory', [os.path.join(HERE, 'inventory.py'), folder, out]),
        ('photos', [os.path.join(HERE, 'photos.py'), folder, out] + extra),
        ('storyboard', [os.path.join(HERE, 'storyboard.py'), folder, out] + extra),
        ('transcribe', [os.path.join(HERE, 'transcribe.py'), out] + extra),
    ]
    for name, cmd in steps:
        if name == 'inventory' and os.path.exists(os.path.join(out, 'inventory.json')):
            save(name, 'done', note='kept existing inventory'); continue
        save(name, 'running')
        t0 = time.time()
        log.write(f'\n=== {name} {time.strftime("%H:%M:%S")} ===\n')
        r = subprocess.run([sys.executable] + cmd, stdout=log, stderr=log)
        save(name, 'done' if r.returncode == 0 else f'failed ({r.returncode})', minutes=round((time.time() - t0) / 60, 1))
    prog['finished'] = time.strftime('%Y-%m-%d %H:%M:%S')
    json.dump(prog, open(prog_path, 'w'), indent=1)


if __name__ == '__main__':
    main()
