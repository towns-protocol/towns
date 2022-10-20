#!/usr/bin/env bash

WITH_APPSERVICE="${1:-no}"

SCRIPT_DIR=$PWD

LOCAL_TEST_DIR=${SCRIPT_DIR}/servers/dendrite_local_test

pushd ${LOCAL_TEST_DIR}
./build.sh
./deploy.sh
popd

docker run \
    --name dendrite-test-postgres \
    -p 127.0.0.1:5432:5432 \
    -e POSTGRES_USER=dendrite \
    -e POSTGRES_PASSWORD=itsasecret \
    -e POSTGRES_DB=dendrite \
    -d postgres

# Wait for postgres to be ready
until docker exec -t dendrite-test-postgres psql -U dendrite -c '\l'; do
  sleep 1
done
echo >&2 "$(date +%Y%m%dt%H%M%S) Postgres is up"

# Remove the database on EXIT
trap "docker rm -f dendrite-test-postgres" EXIT

if [ ${WITH_APPSERVICE} == "with-appservice" ]
then
  ${SCRIPT_DIR}/scripts/deploy-appservice-config.sh
  cd ${LOCAL_TEST_DIR}
  ./run_single.sh 0 dendrite.with_appservice.yaml
else
   cd ${LOCAL_TEST_DIR}
  ./run_single.sh 0
fi

