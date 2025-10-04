#!/bin/bash
set -uo pipefail

echo 'scripts/kill-watches.sh'

# Kill yarn watch processes (legacy)
watch_processes=$(ps -ax | grep 'yarn watch' | grep -v 'grep yarn watch' | awk '{print $1}')

if [ -n "$watch_processes" ]; then
    echo "killing yarn watches $watch_processes"
    kill -- $watch_processes
fi

watch_processes=$(ps -ax | grep 'yarn.js watch' | grep -v 'grep yarn.js watch' | awk '{print $1}')

if [ -n "$watch_processes" ]; then
    echo "killing yarn.js watches $watch_processes"
    kill -- $watch_processes
fi

# Kill bun watch processes
watch_processes=$(ps -ax | grep 'bun.*watch' | grep -v 'grep bun.*watch' | awk '{print $1}')

if [ -n "$watch_processes" ]; then
    echo "killing bun watches $watch_processes"
    kill -- $watch_processes
fi

echo 'killed watches'
