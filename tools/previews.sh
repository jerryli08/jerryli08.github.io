#!/usr/bin/env bash
# Short silent hover-preview loops + poster frames for the landing page viewer.
set -e
cd "$(dirname "$0")/.."
mk() { # slug src start dur [extra-vf]
  local slug=$1 src=$2 ss=$3 t=$4 vf=${5:-}
  local f="${vf:+$vf,}scale='if(gt(iw,ih),min(960,iw),-2)':'if(gt(iw,ih),-2,min(960,ih))':flags=lanczos,fps=30,format=yuv420p"
  ffmpeg -loglevel error -y -ss "$ss" -t "$t" -i "videos/$src" -an -vf "$f" -c:v libx264 -preset slow -crf 29 -profile:v high -movflags +faststart "assets/previews/$slug.mp4"
  ffmpeg -loglevel error -y -ss "$ss" -i "videos/$src" -frames:v 1 -vf "$f" -q:v 4 "assets/posters/$slug.jpg"
}
mk hybrid-vehicle     hybrid-vehicle-flight.mp4 0 8
mk ftc-decode         ftc-decode-turret-tracking.mp4 3 8
mk build-plate-robot  replac3d-demo-4x.mp4 0 8 "crop=608:1080:656:0"
mk electric-bike      ebike-riding.mp4 0 7.5
mk electric-vehicle   sciolyev-school-test.mp4 0 4.9
mk ftc-into-the-deep  ftc-2025.mp4 0 8
mk pen-plotter        pen-plotter-jerryli.mp4 1.5 8
mk battlebot          battlebot-1.mp4 0 8
mk braille-printer    braille-printer.mp4 0 7.6
mk robot-tour         robot-tour.mp4 0 8
mk bike-odometer      bike-odometer.mp4 0.5 5
mk cardboard-simulator cardboard-simulator-demo.mp4 2 8
mk ftc-centerstage    ftc-2024.mp4 33 8
mk ftc-powerplay      ftc-2023.mp4 0 8
mk ftc-freight-frenzy ftc-2022.mp4 0 5
mk ftc-ultimate-goal  ftc-2021.mp4 2 8
