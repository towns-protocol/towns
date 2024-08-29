#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ../../..

docker run -it --network host --cpus=1.0 stress-local /bin/bash -c \
  "./packages/stress/scripts/localhost_chat_setup.sh && ./packages/stress/scripts/localhost_chat.sh"
