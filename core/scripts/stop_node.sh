#!/bin/bash -ue

echo "Killing node processes..."
echo ""

pkill -SIGINT -f "/go-build.*/exe/node" || true

pkill -SIGINT -f "/go-build.*/exe/main" || true


echo ""
echo "Killing yarn cbs processes..."
ps -ax | grep "csb:dev"
ps -ax | grep "csb:start"
echo ""

kill -9 $(ps -ax | grep "csb:start" | awk '{print $1}') || true
kill -9 $(ps -ax | grep "csb:dev" | awk '{print $1}') || true

exit 0