#!/bin/bash
set -uo pipefail

echo 'scripts/kill-watches.sh'

watch_processes=$(ps -ax | grep 'pnpm watch' | grep -v 'grep pnpm watch' | awk '{print $1}')

if [ -n "$watch_processes" ]; then
    echo "killing watches $watch_processes"
    kill -- $watch_processes
fi

echo 'killed watches'