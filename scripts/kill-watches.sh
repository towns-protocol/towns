#!/bin/bash
set -uo pipefail

echo 'scripts/kill-watches.sh'

# TODO: check
watch_processes=$(ps -ax | grep 'bun run watch' | grep -v 'grep bun run watch' | awk '{print $1}')

if [ -n "$watch_processes" ]; then
    echo "killing watches $watch_processes"
    kill -- $watch_processes
fi

watch_processes=$(ps -ax | grep 'bun run watch' | grep -v 'grep bun run watch' | awk '{print $1}')

if [ -n "$watch_processes" ]; then
    echo "killing watches $watch_processes"
    kill -- $watch_processes
fi

echo 'killed watches'