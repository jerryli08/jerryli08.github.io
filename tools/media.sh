#!/usr/bin/env bash
# Web encodes of every project video (max 1280 px on the long edge, silent) plus poster frames.
set -e
cd "$(dirname "$0")/.."
for src in videos/*.mp4; do
  n=$(basename "$src" .mp4)
  out="assets/media/$n.mp4"
  [ -f "$out" ] && continue
  vf="scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))':flags=lanczos,fps='min(30,source_fps)',format=yuv420p"
  [ "$n" = "replac3d-demo-4x" ] && vf="crop=608:1080:656:0,$vf"
  ffmpeg -loglevel error -y -i "$src" -an -vf "$vf" -c:v libx264 -preset medium -crf 27 -profile:v high -movflags +faststart "$out"
  ffmpeg -loglevel error -y -ss 0.3 -i "$out" -frames:v 1 -q:v 5 "assets/media/posters/$n.jpg"
done
