## Introduction

This is a reference for the terraform implementation of the stress tests

## Environment variables

    see variables in packages/stress/scripts/start.sh

## Local development

From the root of the load-testing directory (/harmony/servers/load-testing), run `SESSION_ID=$(uuidgen) docker compose up --build`. This should bring up all the necessary components and run the load tests for you. If you ever make a change, you should run `SESSION_ID=$(uuidgen) docker compose` with the `--build` option. Otherwise it will use the cached version, which will exclude your recent changes.
