#!/usr/bin/env bash

##
## Pin foundry to specific version to avoid breaking changes
## version is defined in the github ci workflow yml file
##

CI_YML=.github/workflows/ci.yml
VERSION=$(awk -F': ' '/FOUNDRY_VERSION:/ {print $2}' $CI_YML)

echo "Updating foundry to $VERSION"

foundryup -v $VERSION