#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

echo 
echo "Launching Postgres..."
echo 

docker compose --project-name river up --detach --wait
