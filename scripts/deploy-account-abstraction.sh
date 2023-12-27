#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ../contracts

set -a
. .env.localhost
set +a

make deploy-base-anvil-nb contract=DeployEntrypoint
make deploy-base-anvil-nb contract=DeployAccountFactory
