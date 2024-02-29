#!/usr/bin/env bash

#
# runs integration tests in core
# makes actual api calls against locally running services 
#
#

yarn workspace harmony run csb:test-remote
