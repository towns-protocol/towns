#!/bin/bash -ue

echo "Killing node processes..."
echo ""

pkill -SIGINT -f "/go-build.*/exe/node" || true

pkill -SIGINT -f "/go-build.*/exe/main" || true

exit 0