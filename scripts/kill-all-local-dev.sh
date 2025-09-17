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

function do_kill() {
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
    (cd ./core && just stop)

    # just in case
    do_kill './bin/river_node run'
fi

if prompt 'Stop App registry?:y/n '
then
    (cd ./core && just stop-app-registry)
fi

if prompt 'Stop Stress?:y/n '
then
    ./packages/stress/scripts/stop_redis.sh
fi

do_kill run_files "$1" # get the tail command from the start stream node run-and-tail
do_kill just "$1"
do_kill yarn "$1"
do_kill anvil "$1"
do_kill wrangler "$1"
do_kill mitmweb "$1"

echo ""
if prompt 'Stop Anvil Docker Containers?:y/n '
then
    docker stop towns-base-chain towns-river-chain 2>/dev/null || true
    docker rm towns-base-chain towns-river-chain 2>/dev/null || true
fi

echo ""
if prompt 'Remove Casbablanca Docker Containers?:y/n '
then
    ./core/scripts/stop_storage.sh 
fi
