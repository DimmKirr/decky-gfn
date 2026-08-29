#!/usr/bin/env sh
# Assemble the Decky sideload zip: decky-gfn/{plugin.json,package.json,main.py,dist/index.js,...}
set -eu
cd "$(dirname "$0")/.."
rm -rf build/decky-gfn decky-gfn.zip
mkdir -p build/decky-gfn/dist
cp plugin.json package.json main.py LICENSE README.md build/decky-gfn/
cp dist/index.js build/decky-gfn/dist/
cd build && python3 -m zipfile -c ../decky-gfn.zip decky-gfn
echo "wrote decky-gfn.zip"
