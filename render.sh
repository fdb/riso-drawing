#!/bin/sh
# usage: ./render.sh out.png "?f=10&s=5"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
  --virtual-time-budget=20000 --window-size=1080,1080 --screenshot="$1" "file://$PWD/jelly.html$2" 2>&1 | grep -v allocator
