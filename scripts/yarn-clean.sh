#!/bin/bash

pushd "$(git rev-parse --show-toplevel)"
echo "cleaning node"
find . -name "node_modules" -type d -exec rm -r "{}" \;
find . -name "dist" -type d -exec rm -r "{}" \;
find . -name "bin" -type d -exec rm -r "{}" \;
find . -name "tsconfig.tsbuildinfo" -type f -exec rm -r "{}" \;
yarn cache clean
popd
