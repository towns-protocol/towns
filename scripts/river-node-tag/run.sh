#!/bin/bash
set -eo pipefail

# Description: This script is used to maintain the latest target deployment tag for the river-node.
# 
# It does not actually deploy the node. It provides no guarantees that it will be deployed.
# It's just a reference breadcrumb for the rest of the deployment scripts to follow.
#
# Note: Run this script from the monorepo root.

RIVER_NODE_TAG_FILE_PATH="scripts/river-node-tag/tag.txt"

function main() {
    if [ "$1" == "set" ]; then
      set_tag $2
    elif [ "$1" == "get" ]; then
      get_tag
    else
      echo "Usage: $0 [set <tag> | get]" >&2
      exit 1
    fi
}

function set_tag() {
  echo "Setting river-node tag to $1" >&2
  echo "$1" > $RIVER_NODE_TAG_FILE_PATH

  # if the AUTOCOMMIT env var is set, commit the change
  if [ "$AUTOCOMMIT" == "true" ]; then
    echo "Autocommit is enabled. Committing the change." >&2

    git add scripts/river-node-tag
    git commit -m "Update river node tag to $1"
  fi
}

function get_tag() {
  echo "Getting river-node tag" >&2
  cat $RIVER_NODE_TAG_FILE_PATH
}

main $1 $2