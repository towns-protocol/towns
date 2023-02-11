#!/usr/bin/env bash

# This is a script to scp initial config files to the dendrite volumes.
# Files such as dendrite.yaml, matrix_key.pem, server.crt, server.key

REMOTE_USER="ec2-user"

# TODO: turn this into an arg
REMOTE_SERVER_ADDRESS="35.170.243.125"
LOCAL_ROOT="/mnt/zion-root"

SSH_CONNECTION_STRING="${REMOTE_USER}@${REMOTE_SERVER_ADDRESS}"

DENDRITE_CONFIG_LOCAL_PATH="$LOCAL_ROOT/dendrite/etc-dendrite"
DENDRITE_MEDIA_LOCAL_PATH="$LOCAL_ROOT/dendrite/media"
POSTGRES_LOCAL_PATH="$LOCAL_ROOT/postgres"
POSTGRES_DATA_LOCAL_PATH="$POSTGRES_LOCAL_PATH/data"

DENDRITE_CONFIG_REMOTE_PATH="$SSH_CONNECTION_STRING:$DENDRITE_CONFIG_LOCAL_PATH"
POSTGRES_REMOTE_PATH="$SSH_CONNECTION_STRING:$POSTGRES_LOCAL_PATH"
# TODO: consider using s3 as a media mount

# temporarily giving full permissions to the dendrite user so we can place the config files
ssh -i dendrite.pem $SSH_CONNECTION_STRING "sudo chmod 777 $LOCAL_ROOT"

ssh -i dendrite.pem $SSH_CONNECTION_STRING "mkdir -p $DENDRITE_CONFIG_LOCAL_PATH"
ssh -i dendrite.pem $SSH_CONNECTION_STRING "mkdir -p $POSTGRES_LOCAL_PATH"
ssh -i dendrite.pem $SSH_CONNECTION_STRING "mkdir -p $DENDRITE_MEDIA_LOCAL_PATH"
ssh -i dendrite.pem $SSH_CONNECTION_STRING "mkdir -p $POSTGRES_DATA_LOCAL_PATH"

scp -pr -i dendrite.pem ./volumes/dendrite/config/dendrite.yaml $DENDRITE_CONFIG_REMOTE_PATH
scp -r -i dendrite.pem ./volumes/dendrite/config/matrix_key.pem $DENDRITE_CONFIG_REMOTE_PATH
scp -r -i dendrite.pem ./volumes/dendrite/config/server.crt $DENDRITE_CONFIG_REMOTE_PATH
scp -r -i dendrite.pem ./volumes/dendrite/config/server.key $DENDRITE_CONFIG_REMOTE_PATH

# Reverting the permissions back to the original
ssh -i dendrite.pem $SSH_CONNECTION_STRING "sudo chmod -R 755 $LOCAL_ROOT"