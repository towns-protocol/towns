#!/bin/bash
set -e
cd "$(dirname "$0")/.."

pnpm m ls --json --depth=-1 \
  | jq '.[1:] | .[] | .name' \
  | sed 's?'$PWD/'??' \
  | grep -v sdk \
  | xargs -I arg echo -n "--filter arg "