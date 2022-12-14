#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

echo 
echo "Clean & Build..."
echo
yarn run --top-level csb:clean
yarn run --top-level csb:build

./launch_storage.sh

echo 
echo "To test instance run tests with:"
echo "  yarn csb:test-remote"
echo 
yarn workspace @zion/server run dev
