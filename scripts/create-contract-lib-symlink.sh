#!/usr/bin/env bash

mkdir -p river/node_modules
mkdir -p river/node_modules/@towns-protocol

# Create the symlinks with absolute paths instead of relative paths
BASEDIR=$(pwd)
ln -s "${BASEDIR}/node_modules/@openzeppelin" river/node_modules/@openzeppelin
ln -s "${BASEDIR}/node_modules/account-abstraction" river/node_modules/account-abstraction
ln -s "${BASEDIR}/node_modules/forge-std" river/node_modules/forge-std
ln -s "${BASEDIR}/node_modules/@prb" river/node_modules/@prb
ln -s "${BASEDIR}/node_modules/solady" river/node_modules/solady
ln -sf "${BASEDIR}/node_modules/@towns-protocol/diamond" river/node_modules/@towns-protocol/diamond
ln -s "${BASEDIR}/node_modules/crypto-lib" river/node_modules/crypto-lib
