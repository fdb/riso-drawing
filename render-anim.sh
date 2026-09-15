#!/bin/sh
# Render N frames of a scene at 24 fps with headless Chrome (WebGPU), then assemble an mp4.
# usage: ./render-anim.sh [frames] [seed] [scene] [res]
N=${1:-56}; S=${2:-5}; SC=${3:-jelly}; R=${4:-1080}
mkdir -p renders/frames && rm -f renders/frames/f_*.png
i=0
while [ $i -lt $N ]; do
  f=$(printf "%03d" $i)
  node scripts/run-headless.mjs "file://$PWD/render.html?scene=$SC&f=$i&s=$S&gpu=1&res=$R" --shot "renders/frames/f_$f.png" --size $R | grep -v "^TITLE: done\|^SHOT"
  i=$((i+1))
done
ffmpeg -v error -y -framerate 24 -i renders/frames/f_%03d.png -c:v libx264 -pix_fmt yuv420p -crf 18 "renders/$SC-anim.mp4"
echo "wrote renders/$SC-anim.mp4 ($N frames)"
