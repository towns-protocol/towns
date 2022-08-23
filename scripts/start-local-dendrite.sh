#!/usr/bin/env bash
cd servers/dendrite_local_test
./build.sh
./deploy.sh
./run_single.sh 0
