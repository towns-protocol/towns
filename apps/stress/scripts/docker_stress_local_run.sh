#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ../../..

docker run -it --network host --cpus=1.0 stress-local /bin/bash -c \
  "./apps/stress/scripts/localhost_chat_setup.sh && ./apps/stress/scripts/localhost_chat.sh"
