#!/bin/bash

pushd "$(git rev-parse --show-toplevel)"
echo "running git clean"
git clean -f -x -d -i 
yarn cache clean
popd
