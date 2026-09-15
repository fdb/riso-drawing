#!/bin/bash
# Tile renders/all/<name>.png into a half-size contact sheet, 6 per row.
# usage: scripts/sheet.sh out.png name1 name2 ...
out=$1; shift; n=$#; args=(); layout=""; i=0
for f in "$@"; do args+=(-i "renders/all/$f.png"); x=$(( (i % 6) * 540 )); y=$(( (i / 6) * 540 )); layout="$layout|${x}_${y}"; i=$((i+1)); done
layout=${layout#|}
ffmpeg -y -loglevel error "${args[@]}" -filter_complex "xstack=inputs=${n}:layout=${layout}:fill=black,scale=iw/2:ih/2" "$out"
