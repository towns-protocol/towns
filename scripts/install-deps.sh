#!/usr/bin/env bash

set -e

# Make sure that the working directory is always the directory of the script
cd "$(dirname "$0")"
yarn
