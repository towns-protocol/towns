#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

echo 
echo "Clean & Build..."
echo
yarn run --top-level csb:cb

./launch_storage.sh

echo 
echo "To test instance run tests with:"
echo "  yarn csb:test"
echo 
./start_node.sh
