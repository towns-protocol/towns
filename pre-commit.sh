#!/bin/bash

# Redirect output to stderr.
exec 1>&2

# Check if RIVER_ALLOW_COMMIT is set to true; if so, bypass the check.
if [ "$RIVER_ALLOW_COMMIT" = "true" ]; then
  echo "RIVER_ALLOW_COMMIT is set to true. Bypassing the check for changes in the 'river' directory."
  exit 0
fi

# Check for staged files in the 'river' directory.
if git diff --cached --name-only | grep '^river/'; then
  echo "Error: Attempt to commit changes in the 'river' subtree is blocked."
  echo "Please remove changes to the 'river' directory from the staging area to proceed."
  exit 1
fi