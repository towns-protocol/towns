#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

echo 
echo "Clean & Build..."
echo
yarn run --top-level csb:build

./launch_storage.sh

echo 
echo "To test instance run tests with:"
echo "  yarn csb:test"
echo ""
echo " (currently need to run with dev-no-entitlements.yaml for tests to pass)"
echo ""
echo ""

if [[ $# -eq 2 && "$1" == "--config" ]]; then
    config_file_name="$2"
    ./start_node.sh --config "$config_file_name"
    exit 0
fi

./start_node.sh