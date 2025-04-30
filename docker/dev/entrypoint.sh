#!/bin/bash
set -e

# Start PostgreSQL service
service postgresql start

# Init NVM
source $NVM_DIR/nvm.sh

# Execute whatever command was passed in (default is /bin/bash)
exec "$@" 