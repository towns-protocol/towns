#!/usr/bin/env bash

usage()
{
cat << EOF
usage: $0 PARAM [-wpp|--with-postgres-persist] [-was|--with-appservice] [-naz|--no-authz] [-h|--help]

This script does foo.

OPTIONS:
   PARAM        The param
   -h|--help    Show this message
   -wpp|--with-postgres-persist   Start Dendrite with persistent postgres
   -was|--with-appservice   Start Dendrite with appservice
   -spg|--skip-postgres   Dont start postgres at all
   -naz|--no-authz   Disable authorization aka gating checks
EOF
}

WITH_APPSERVICE="${1:-no}"
WITH_POSTGRES_PERSIST="${2:-no}"
SKIP_POSTGRES="${3:-no}"
NO_AUTHZ="${4:-with-authz}"

while [ ! $# -eq 0 ]; do
    case "$1" in
        -wpp | --with-postgres-persist)
            WITH_POSTGRES_PERSIST='with-postgres-persist'
            ;;
        -was | --with-appservice)
            WITH_APPSERVICE='with-appservice'
            ;;
        -spg | --skip-postgres)
            SKIP_POSTGRES='skip-postgres'
            ;;
        -naz | --no-authz)
            NO_AUTHZ='no-authz'
            ;;
        -h | --help)
            usage
            exit
            ;;
        *)
            usage
            exit
            ;;
    esac
    shift
done

DENDRITE_POSTGRES_IMAGE="dendrite-test-postgres"

SCRIPT_DIR=$PWD

LOCAL_TEST_DIR=${SCRIPT_DIR}/servers/dendrite_local_test

pushd ${LOCAL_TEST_DIR}
./build.sh
./deploy.sh
popd

if [ ${SKIP_POSTGRES} == "skip-postgres" ]; then
  echo "Skipping postgres"
else 
  if [ ${WITH_POSTGRES_PERSIST} == "with-postgres-persist" ]; then
    if [ ! "$(docker ps -q -f name=${DENDRITE_POSTGRES_IMAGE})" ]; then
      echo "Using persistent postgres"
        docker run \
            --name ${DENDRITE_POSTGRES_IMAGE} \
            -p 127.0.0.1:5432:5432 \
            -e POSTGRES_USER=dendrite \
            -e POSTGRES_PASSWORD=itsasecret \
            -e POSTGRES_DB=dendrite \
            -d postgres
    else
      echo "postgres already running"
      fi
  else
    echo "Using ephemeral postgres"
    docker rm -f ${DENDRITE_POSTGRES_IMAGE}
    docker run \
        --name ${DENDRITE_POSTGRES_IMAGE} \
        -p 127.0.0.1:5432:5432 \
        -e POSTGRES_USER=dendrite \
        -e POSTGRES_PASSWORD=itsasecret \
        -e POSTGRES_DB=dendrite \
        -d postgres
    # Remove the database on EXIT
    trap "docker rm -f ${DENDRITE_POSTGRES_IMAGE}" EXIT
  fi
  # Wait for postgres to be ready
  until docker exec -it dendrite-test-postgres psql -U dendrite -c '\l'; do
    sleep 1
  done
  echo >&2 "$(date +%Y%m%dt%H%M%S) Postgres is up"
fi

if [ ${WITH_APPSERVICE} == "with-appservice" ]
then
  ${SCRIPT_DIR}/scripts/deploy-appservice-config.sh
  cd ${LOCAL_TEST_DIR}
  ./run_single.sh 0 dendrite.with_appservice.yaml
else
   cd ${LOCAL_TEST_DIR}
  ./run_single.sh 0 dendrite.yaml ${NO_AUTHZ}
fi
