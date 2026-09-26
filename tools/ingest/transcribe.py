#!/usr/bin/env python3
"""Timestamped speech transcripts for every storyboarded video (runs locally, nothing uploaded).

Reads the audio.wav that storyboard.py left in each board folder, runs faster-whisper on the
CPU, and writes transcript.json (segments with start/end seconds) and transcript.txt
("[1:23] text" lines) next to it. Silent clips and clips with only music or noise come out
empty, which is fine. The wav is deleted afterwards unless --keep-audio is passed.
Already-transcribed videos are skipped, so the run can be stopped and restarted.

usage: python3 transcribe.py <out-dir> [--model base.en] [--project NAME]
Needs: pip install faster-whisper   (the model downloads once, about 150 MB for base.en)
"""
import argparse, glob, json, os, sys, time


def fmt(t):
    t = int(t)
    return f'{t // 60}:{t % 60:02d}'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out')
    ap.add_argument('--model', default='base.en', help='tiny.en is faster, small.en is more accurate')
    ap.add_argument('--project', action='append')
    ap.add_argument('--keep-audio', action='store_true')
    ap.add_argument('--follow', help='keep going until this file exists (run.py sets it when storyboards finish)')
    a = ap.parse_args()
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit('pip install faster-whisper')
    model = WhisperModel(a.model, device='cpu', compute_type='int8', cpu_threads=max(2, (os.cpu_count() or 4) // 3))
    while True:
        stop = bool(a.follow and os.path.exists(a.follow))  # checked before the pass, so the last pass sees every board
        n = transcribe_pass(model, a)
        if not a.follow or (stop and n == 0):
            break
        if n == 0:
            time.sleep(20)


def transcribe_pass(model, a):
    n = 0
    boards = sorted(glob.glob(os.path.join(a.out, 'boards', '*', '*', 'board.json')))
    for bj in boards:
        meta = json.load(open(bj))
        if a.project and meta['project'] not in a.project:
            continue
        folder = os.path.dirname(bj)
        wav = os.path.join(folder, 'audio.wav')
        tj = os.path.join(folder, 'transcript.json')
        if os.path.exists(tj) or not os.path.exists(wav):
            continue
        t0 = time.time()
        # vad_filter skips stretches with no speech, which is most of a robot video
        segs, info = model.transcribe(wav, vad_filter=True, beam_size=5, condition_on_previous_text=False)
        out = [{'start': round(s.start, 1), 'end': round(s.end, 1), 'text': s.text.strip(),
                'no_speech': round(s.no_speech_prob, 2)} for s in segs]
        out = [s for s in out if s['text'] and s['no_speech'] < 0.8]
        json.dump({'path': meta['path'], 'model': a.model, 'segments': out}, open(tj, 'w'))
        with open(os.path.join(folder, 'transcript.txt'), 'w') as fh:
            fh.write('\n'.join(f'[{fmt(s["start"])}] {s["text"]}' for s in out) + ('\n' if out else ''))
        if not a.keep_audio:
            os.remove(wav)
        words = sum(len(s['text'].split()) for s in out)
        print(f'{meta["path"]}: {len(out)} segments, {words} words, {time.time() - t0:.0f} s', flush=True)
        n += 1
    return n


if __name__ == '__main__':
    main()
