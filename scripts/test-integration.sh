#!/usr/bin/env bash

#
# runs integration tests in client/web/lib
# makes actual api calls against locally running services
#
#


pushd "$(git rev-parse --show-toplevel)"
pushd clients/web/lib
yarn test
popd
popd

