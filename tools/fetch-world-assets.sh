#!/usr/bin/env bash
# Downloads the CC0 source assets for the Mars scene (Poly Haven) and the NASA panorama.
# Sources (all CC0 / public domain):
#   Poly Haven textures: gravelly_sand, red_sand   https://polyhaven.com
#   Poly Haven scans:    rock_09, moon_rock_03, namaqualand_boulder_05
#   NASA/JPL-Caltech/ASU PIA24264 Mastcam-Z 360 panorama, Jezero Crater
set -e
D=${1:-/home/claude/assets-src/dl}; mkdir -p "$D"; cd "$D"
for t in gravelly_sand red_sand; do
  for m in diff nor_gl rough; do
    [ -f ${t}_${m}_1k.jpg ] || curl -sfL -o ${t}_${m}_1k.jpg "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/$t/${t}_${m}_1k.jpg"
  done
done
for r in rock_09 moon_rock_03 namaqualand_boulder_05; do
  mkdir -p $r/textures; cd $r
  curl -sf "https://api.polyhaven.com/files/$r" -o files.json
  python3 - "$r" <<'PY'
import json, sys, urllib.request, os
r = sys.argv[1]; j = json.load(open('files.json'))['gltf']['1k']['gltf']
urllib.request.urlretrieve(j['url'], f'{r}.gltf')
for rel, v in j['include'].items():
    os.makedirs(os.path.dirname(rel) or '.', exist_ok=True)
    if not os.path.exists(rel): urllib.request.urlretrieve(v['url'], rel)
PY
  cd ..
done
[ -f PIA24264.jpg ] || curl -sfL -o PIA24264.jpg "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia24/pia24264/PIA24264.jpg"
ls -la "$D" "$D"/*/ | head -60
