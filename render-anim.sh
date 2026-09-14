#!/bin/sh
# Render N frames of the jelly cycle at 24 fps with headless Chrome, then assemble an mp4.
# usage: ./render-anim.sh [frames] [seed]
N=${1:-56}; S=${2:-5}
mkdir -p renders/frames
i=0
while [ $i -lt $N ]; do
  f=$(printf "%03d" $i)
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
    --virtual-time-budget=20000 --window-size=1080,1080 --screenshot="renders/frames/f_$f.png" "file://$PWD/jelly.html?f=$i&s=$S" >/dev/null 2>&1
  i=$((i+1))
done
ffmpeg -v error -y -framerate 24 -i renders/frames/f_%03d.png -c:v libx264 -pix_fmt yuv420p -crf 18 renders/jelly-anim.mp4
echo "wrote renders/jelly-anim.mp4 ($N frames)"
