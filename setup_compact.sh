#!/bin/bash
set -e
echo "Downloading compactc 0.31.1..."
curl -L https://github.com/midnightntwrk/compact/releases/download/compactc-v0.31.1/compactc_v0.31.1_x86_64-unknown-linux-musl.zip -o /tmp/compactc.zip
mkdir -p ~/.compact/versions/0.31.1
python3 -c "import zipfile; zipfile.ZipFile('/tmp/compactc.zip').extractall('/home/siddh/.compact/versions/0.31.1')"
chmod -R +x ~/.compact/versions/0.31.1/
echo "0.31.1" > ~/.compact/version
echo "Compact compiler version 0.31.1 setup successfully!"
