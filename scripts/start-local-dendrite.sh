#!/usr/bin/env bash

usage()
{
cat << EOF
usage: $0 PARAM [-wpp|--with-postgres-persist] [-was|--with-appservice] [-h|--help]

This script does foo.

OPTIONS:
   PARAM        The param
   -h|--help    Show this message
   -wpp|--with-postgres-persist   Start Dendrite with persistent postgres
   -spg|--skip-postgres   Dont start postgres at all
EOF
}

# Set constants
SCRIPT_DIR=$PWD
LOCAL_TEST_DIR=${SCRIPT_DIR}/servers/dendrite_local_test

# Parse command line arguments
WITH_POSTGRES_PERSIST=""
SKIP_POSTGRES=""


while [ "$1" != "" ]; do
    case $1 in
        -wpp | --with-postgres-persist )  
            WITH_POSTGRES_PERSIST="with-postgres-persist"
            ;;
        -spg | --skip-postgres )  
            SKIP_POSTGRES="skip-postgres"
            ;;
        -h | --help )
            usage
            exit
            ;;
        * )                     
            usage
            exit 1
            ;;
    esac
    shift
done

pushd ${LOCAL_TEST_DIR}
./build.sh
./deploy.sh
popd

# helper function to start postgres in the background
start_postgres_in_bg()
{
  echo "starting postgres in background"
  docker compose up -d postgres-dendrite
}

remove_postgres_container()
{
  echo "removing postgres container"
  docker stop postgres-dendrite
  docker rm postgres-dendrite
}

if [ "${SKIP_POSTGRES}" == "skip-postgres" ]; then
  echo "Skipping postgres"
else 
  if [ "${WITH_POSTGRES_PERSIST}" == "with-postgres-persist" ]; then
    echo "Using persistent postgres"
    start_postgres_in_bg

  else
    echo "Using ephemeral postgres"
    remove_postgres_container
    start_postgres_in_bg 
    trap remove_postgres_container EXIT
  fi

  # Wait for postgres to be ready
  until docker exec postgres-dendrite psql -U dendrite -c '\l'; do
    sleep 1
  done
  echo >&2 "$(date +%Y%m%dt%H%M%S) Postgres is up"
fi

cd ${LOCAL_TEST_DIR}
./run_single.sh 0 dendrite.yaml