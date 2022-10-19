#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

./launch_redis.sh

echo 
echo "To test instance run tests with:"
echo "  yarn workspace @zion/server run test-remote"
echo 
yarn workspace @zion/server run dev
