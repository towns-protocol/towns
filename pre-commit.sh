#!/bin/bash

# Redirect output to stderr.
exec 1>&2

# Check for staged files in the 'river' directory.
if git diff --cached --name-only | grep '^river/'; then
  echo "Error: Attempt to commit changes in the 'river' subtree is blocked."
  echo "Please remove changes to the 'river' directory from the staging area to proceed."
  exit 1
fi