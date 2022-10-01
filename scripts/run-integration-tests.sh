#!/usr/bin/env bash

pushd "$(git rev-parse --show-toplevel)"
cd clients/web/lib
yarn test
popd