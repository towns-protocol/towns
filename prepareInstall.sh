#!/bin/bash
echo running root prepareInstall.sh ...

# install required modules for matrix-zion-bridge
./servers/matrix-zion-bridge/prepareInstall.sh
pushd servers/matrix-zion-bridge
yarn install
popd

echo root prepareInstall.sh done