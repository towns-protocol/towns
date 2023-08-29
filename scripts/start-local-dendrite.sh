#!/usr/bin/env bash

usage()
{
cat << EOF
usage: $0 PARAM [-wpp|--with-postgres-persist] [-was|--with-appservice] [-wpn|--with-push-notification] [-h|--help]

This script does foo.

OPTIONS:
   PARAM        The param
   -h|--help    Show this message
   -wpp|--with-postgres-persist   Start Dendrite with persistent postgres
   -wpn|--with-push-notification  Start Dendrite with push notification enabled
   -wv3|--with-smart-contracts-v3  Start Dendrite with smart contracts v3 enabled
   -spg|--skip-postgres   Dont start postgres at all
   -dco|--docker-compose-only  Start dendrite from docker-compose instead of source
EOF
}

# Set constants
SCRIPT_DIR=$PWD
LOCAL_TEST_DIR=${SCRIPT_DIR}/servers/dendrite_local_test

# Parse command line arguments
WITH_POSTGRES_PERSIST=""
WITH_PUSH_NOTIFICATION=""
SKIP_POSTGRES=""
DOCKER_COMPOSE_ONLY=""
export DENDRITE_TRACE_INTERNAL="1"

while [ "$1" != "" ]; do
    case $1 in
        -wpp | --with-postgres-persist )  
            WITH_POSTGRES_PERSIST="with-postgres-persist"
            ;;
        -wpn | --with-push-notification )  
            WITH_PUSH_NOTIFICATION="with-push-notification"
            ;;
        -spg | --skip-postgres )  
            SKIP_POSTGRES="skip-postgres"
            ;;
        -dco | --docker-compose-only )
            DOCKER_COMPOSE_ONLY="docker-compose-only"
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

cd ${LOCAL_TEST_DIR}


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

if [ "${WITH_PUSH_NOTIFICATION}" == "with-push-notification" ]; then
  echo "Enabling Push Notification by exporting env vars"
  export PUSH_NOTIFICATION_AUTH_TOKEN="Zm9v"
  export PUSH_NOTIFICATION_URL="http://127.0.0.1:8787"
else
  echo "Push Notification disabled"
  export PUSH_NOTIFICATION_AUTH_TOKEN=""
  export PUSH_NOTIFICATION_URL=""
fi

if [ "${DOCKER_COMPOSE_ONLY}" == "docker-compose-only" ]; then
  echo "Starting dendrite from docker-compose"
  docker compose up dendrite
else
  echo "Starting dendrite from source"
  ./build.sh
  ./deploy.sh
  ./run_single.sh 0 dendrite.yaml
fi
