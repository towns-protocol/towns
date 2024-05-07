#!/bin/bash

##
## If visual studio crashes after running ~start local dev~ 
## it will leave lots of things running in the background
## this script will kill all the processes that are running on your local machine.
## it will also clean up core/river docker containers
##
## usage: ./kill-all-local-dev.sh -y
##


# Argument parsing
while getopts "yf" arg; do
  case $arg in
    y)
        skip_prompt=1
        ;;
    f)
        skip_prompt=1
        force_kill="-9"
        ;;
    *)
      echo "Invalid argument"
      exit 1
      ;;
  esac
done

# Function to handle user prompts
prompt() {
    local message=$1

    # Check if we should skip prompts
    if [[ $skip_prompt -eq 1 ]]
    then
        echo "$message -y"
        return 0
    else
        read -p "$message" b_continue
        if [[ "$b_continue" == "y" ]]
        then
            return 0
        else
            return 1
        fi
    fi
}

function do_killl() {
    echo ""
    echo "finding processes containing $1"
    echo ""
    param="$1"
    first="${param:0:1}"
    rest="${param:1}"
    term="[${first}]${rest}"
    if [[ $(ps -ax | grep "$term") ]]
    then
        ps -ax | grep "$term"
        echo ""

        if prompt 'Kill these processes?:y/n '
        then
            kill $force_kill $(ps -ax | grep "$term" | awk '{print $1}')
        fi
    else
        echo "no results found"
    fi
}

echo ""
if prompt 'Stop Casbablanca?:y/n '
then
    ./core/scripts/stop_node.sh 
    ./core/node/stop_multi.sh

    # just in case
    do_killl './bin/river_node run'
fi

if prompt 'Stop XChain?:y/n '
then
    RUN_ENV=single ./core/xchain/stop_multi.sh
    RUN_ENV=single_ne ./core/xchain/stop_multi.sh
    RUN_ENV=multi ./core/xchain/stop_multi.sh
    RUN_ENV=multi_ne ./core/xchain/stop_multi.sh

    # that script doesn't always work
    do_killl './bin/xchain_node run'
fi

do_killl yarn "$1"
do_killl anvil "$1"
do_killl wrangler "$1"
do_killl mitmweb "$1"

# Specify the name or ID of the Docker container you want to stop
container_name="bullmq-redis"

# Check if the container is running
if docker ps --filter "name=$container_name" --format '{{.ID}}' | grep -qE "^[0-9a-f]+$"; then
  # The container is running, so stop it
  docker stop "$container_name"
  echo "Container $container_name stopped."
else
  echo "Container $container_name is not running."
fi

echo ""
if prompt 'Remove Casbablanca Docker Containers?:y/n '
then
    ./core/scripts/stop_storage.sh 
fi
