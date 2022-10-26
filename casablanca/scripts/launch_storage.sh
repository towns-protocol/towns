#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

echo 
echo "Launching Redis..."
echo 

docker compose up --detach --wait
