# Ingest: first pass over Jerry's project folder

Runs on the computer that holds the folder. It only reads the originals and writes everything
under an output folder. Start it in the background; every step can be re-run and skips what is done.

    nohup python3 tools/ingest/run.py "<project folder>" "<out folder>" > /dev/null 2>&1 &
    cat "<out folder>/progress.json"      # which step, how long

| Step | Script | Produces |
|---|---|---|
| inventory | `inventory.py` | `inventory.md` / `.json`: sizes per project and kind, CAD list, biggest videos, duplicates |
| photos | `photos.py` | burst/duplicate groups ranked by sharpness; numbered sheets of each group's best shot |
| storyboard | `storyboard.py` | every video end to end: a frame every 2 s plus scene cuts, motion and loudness per second, peaks outlined |
| transcribe | `transcribe.py` | timestamped speech per video (faster-whisper, local CPU) |

`sheets.py` is a quick all-media overview (3 frames per video) for a first look at a new album.

Review, in order: `inventory.md`, then per project the photo sheets, then each video's storyboard
sheets with `transcript.txt` beside them. Log picks as file + timestamp range; cut picks at full
frame rate and check them before encoding (`tools/media.sh` settings: 1280 px long edge, CRF 27, silent).
