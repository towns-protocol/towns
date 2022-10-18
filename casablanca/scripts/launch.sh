#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

echo "I can't figure out how to run Docker on Mac OS without sudo, so here you go:"
sudo docker compose up --detach --wait

echo 
echo "To test instance run tests with: yarn workspace @zion/server run test-remote"
echo 
yarn workspace @zion/server run dev
