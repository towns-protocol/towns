#!/bin/bash

# very similar to running git clean -xd however, we don't want to remove
# .env.local files, dendrite keys (if you're running from vs), etc
# if you want to clean everything temporary created by the build, but 
# don't want a full reset on your dev environment, this is the script for you

pushd "$(git rev-parse --show-toplevel)"
echo "cleaning node"
find . -name "node_modules" -type d -exec rm -r "{}" \;
find . -name "dist" -type d -exec rm -r "{}" \;
find . -name "bin" -type d -exec rm -r "{}" \;
find . -name "coverage" -type d -exec rm -r "{}" \;
find . -name "out" -type d -exec rm -r "{}" \;
find . -name "gen" -type d -exec rm -r "{}" \;
find . -name ".turbo" -type d -exec rm -r "{}" \;
find . -name "tsconfig.tsbuildinfo" -type f -exec rm -r "{}" \;
find . -name ".eslintcache" -type f -exec rm -r "{}" \;
yarn cache clean
popd
