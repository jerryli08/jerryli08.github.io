#!/usr/bin/env python3
"""Do as much of the first pass as fits in a time budget, then stop cleanly.

For environments where a command can only run a few minutes (the Cowork VM kills everything
when each call ends). Call it again and again; it resumes exactly where it stopped because
every unit of work (one video storyboard, one photo, one minute of audio) is saved when done.

Projects are processed in priority order (--order file, one folder name per line; unlisted
folders follow alphabetically), finishing one project before starting the next, so the most
important projects become reviewable first. Writes <out>/status.json after every call.

usage: python3 work.py <folder> <out> --budget 150 [--order order.txt] [--tmp ~/ingest_tmp]
"""
import argparse, glob, json, os, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('folder'); ap.add_argument('out')
    ap.add_argument('--budget', type=float, default=150)
    ap.add_argument('--order', default=None)
    ap.add_argument('--tmp', default=os.path.expanduser('~/ingest_tmp'))
    ap.add_argument('--model', default='base.en')
    ap.add_argument('--skip-transcripts', action='store_true')
    a = ap.parse_args()
    t_end = time.time() + a.budget
    os.makedirs(a.tmp, exist_ok=True)
    inv_p = os.path.join(a.out, 'inventory.json')
    if not os.path.exists(inv_p):
        subprocess.run([sys.executable, os.path.join(HERE, 'inventory.py'), a.folder, a.out], check=True)
    inv = json.load(open(inv_p))
    import storyboard, photos, transcribe
    projects = sorted({f['project'] for f in inv['files']})
    order = [l.strip() for l in open(a.order)] if a.order and os.path.exists(a.order) else []
    order = [p for p in order if p in projects] + [p for p in projects if p not in order]
    # a unit that was running when the last call was cut off gets one more try, then is skipped
    state_p = os.path.join(a.tmp, 'state.json')
    state = json.load(open(state_p)) if os.path.exists(state_p) else {'attempts': {}, 'skipped': []}
    def save_state():
        json.dump(state, open(state_p, 'w'))
    def begin(unit):
        n = state['attempts'].get(unit, 0)
        if n >= 2:
            if unit not in state['skipped']:
                state['skipped'].append(unit)
            return False
        state['attempts'][unit] = n + 1; save_state(); return True
    def end(unit):
        state['attempts'].pop(unit, None); save_state()

    model = None
    did = {'boards': 0, 'photos': 0, 'transcripts': 0}
    status = {'projects': {}}
    for proj in order:
        files = [f for f in inv['files'] if f['project'] == proj]
        vids = [f for f in files if f['kind'] == 'video']
        imgs = [f for f in files if f['kind'] == 'image']
        # 1) storyboards
        for f in sorted(vids, key=lambda f: f['path']):
            work, _ = storyboard.board_dir(f, a.out)
            if os.path.exists(os.path.join(work, 'board.json')):
                continue
            est = 5 + f['bytes'] / 25e6  # seconds, from measured keyframe throughput
            if time.time() + min(est, 120) > t_end:
                break
            unit = 'v:' + f['path']
            if not begin(unit):
                continue
            storyboard.one(f, a.folder, a.out, 2.0, 0, tmp_root=a.tmp, max_full_decode=90)
            end(unit); did['boards'] += 1
        # 2) photos, then this project's groups and sheets once every photo is analysed
        pj = os.path.join(a.out, 'photos', photos.slug_of(proj) + '.json')
        if imgs and not os.path.exists(pj):
            cache = os.path.join(a.tmp, 'photo-cache')
            for f in imgs:
                if time.time() + 3 > t_end:
                    break
                if photos.analyse_cached(a.folder, f, cache):
                    did['photos'] += 1
            done = len(glob.glob(os.path.join(cache, photos.slug_of(proj), '*.json')))
            if done >= len(imgs) and time.time() + 5 < t_end:
                photos.assemble(proj, cache, a.out)
        # 3) transcripts for this project's boards
        if not a.skip_transcripts:
            for bj in sorted(glob.glob(os.path.join(a.out, 'boards', photos.slug_of(proj)[:50], '*', 'board.json'))):
                if os.path.exists(os.path.join(os.path.dirname(bj), 'transcript.json')):
                    continue
                if time.time() + 25 > t_end:
                    break
                if model is None:
                    from faster_whisper import WhisperModel
                    model = WhisperModel(a.model, device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 2)
                unit = 't:' + bj
                if not begin(unit):
                    continue
                if transcribe.transcribe_one(model, bj, budget_end=t_end - 20):
                    did['transcripts'] += 1
                end(unit)
        nb = sum(1 for f in vids if os.path.exists(os.path.join(storyboard.board_dir(f, a.out)[0], 'board.json')))
        nt = len(glob.glob(os.path.join(a.out, 'boards', photos.slug_of(proj)[:50], '*', 'transcript.json')))
        status['projects'][proj] = {'videos': len(vids), 'boards': nb, 'transcripts': nt, 'photos': len(imgs),
                                    'photos_done': os.path.exists(pj) or not imgs}
        if time.time() > t_end:
            break
    # totals over everything, including projects not reached this call
    for proj in order:
        if proj in status['projects']:
            continue
        files = [f for f in inv['files'] if f['project'] == proj]
        status['projects'][proj] = {'videos': sum(f['kind'] == 'video' for f in files), 'boards': 0, 'transcripts': 0,
                                    'photos': sum(f['kind'] == 'image' for f in files), 'photos_done': False}
    P = status['projects'].values()
    complete = [p for p, v in status['projects'].items() if v['boards'] == v['videos'] and v['photos_done']
                and (a.skip_transcripts or v['transcripts'] == v['videos'])]
    status.update({'at': time.strftime('%H:%M:%S'), 'did': did, 'skipped': state['skipped'],
                   'boards': f"{sum(v['boards'] for v in P)}/{sum(v['videos'] for v in P)}",
                   'transcripts': sum(v['transcripts'] for v in P),
                   'complete_projects': complete})
    json.dump(status, open(os.path.join(a.out, 'status.json'), 'w'), indent=1)
    print(json.dumps({k: status[k] for k in ('at', 'did', 'boards', 'transcripts')}), '| complete:', ', '.join(complete[-6:]) or '-')


if __name__ == '__main__':
    main()
