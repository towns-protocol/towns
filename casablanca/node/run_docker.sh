#!/bin/bash -ue

cd /usr/config/run_files/docker-single
if [ -n "$SKIP_GENKEY" ]; then
    echo "Reading wallet from environment."
    /usr/bin/node readkey
elif [ ! -f "./wallet/private_key" ]; then
    echo "Generating a new wallet."
    /usr/bin/node genkey
fi

/usr/bin/node run