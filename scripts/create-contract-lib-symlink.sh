#!/usr/bin/env bash

mkdir -p river/node_modules
ln -s ../../node_modules/@openzeppelin river/node_modules/@openzeppelin
ln -s ../../node_modules/account-abstraction river/node_modules/account-abstraction
ln -s ../../node_modules/ds-test river/node_modules/ds-test
ln -s ../../node_modules/forge-std river/node_modules/forge-std
ln -s ../../node_modules/@prb river/node_modules/@prb
ln -s ../../node_modules/solady river/node_modules/solady
