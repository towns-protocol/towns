#!/usr/bin/env bash

#
# runs integration tests in client/web/lib
# makes actual api calls against locally running services
#
# prerequisites:
# yarn install
# ./scripts/start-local-casablanca.sh
# ./scripts/start-local-basechain.sh
# ./scripts/deploy-towns-contracts.sh
#


pushd "$(git rev-parse --show-toplevel)"
pushd clients/web/lib
yarn test
popd
popd

