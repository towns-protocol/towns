#!/bin/bash -ue

cd /usr/config/run_files/docker-single

if [ ! -f "./wallet/private_key" ]; then
    echo "Generating a new wallet."
    /usr/bin/node genkey
fi

/usr/bin/node run