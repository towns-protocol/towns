#!/usr/bin/env bash

#
# runs integration tests in casablanca
# makes actual api calls against locally running services 
#
# prerequisites:
# yarn install
# ./scripts/start-local-casablanca.sh
#

yarn workspace harmony run csb:test-remote
