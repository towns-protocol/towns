#!/usr/bin/env bash

#
# runs integration tests in casablanca
# makes actual api calls against locally running services 
#
#

yarn workspace harmony run csb:test-remote
