#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

echo 
echo "Clean & Build..."
echo
yarn run --top-level csb:build

./launch_storage.sh

echo 
echo "!!!Multi Node!!!"
echo ""
echo ""

./start_node_multi.sh $@
