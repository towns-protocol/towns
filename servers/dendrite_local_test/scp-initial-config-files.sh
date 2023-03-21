#!/usr/bin/env bash

# This is a script to scp initial config files to the dendrite volumes.
# Files such as matrix_key.pem, server.crt, server.key

# INSTRUCTIONS: 
# Do not forget to mount EFS to the efs-mount-point directory.
# You can do so via: 
# sudo mount -t nfs -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport mount-target-DNS:/   ~/efs-mount-point  
# Replace mount-target-DNS with the DNS of the mount target of your EFS.

REMOTE_USER="ec2-user"

REMOTE_SERVER_ADDRESS="184.72.192.112"
LOCAL_ROOT="~/efs-mount-point"

sh ./cert-and-key-gen.sh

SSH_CONNECTION_STRING="${REMOTE_USER}@${REMOTE_SERVER_ADDRESS}"

DENDRITE_CONFIG_LOCAL_PATH="$LOCAL_ROOT/dendrite/etc-dendrite"
DENDRITE_MEDIA_LOCAL_PATH="$LOCAL_ROOT/dendrite/media"

DENDRITE_CONFIG_REMOTE_PATH="$SSH_CONNECTION_STRING:$DENDRITE_CONFIG_LOCAL_PATH"

ssh -i bastion_keypair.pem $SSH_CONNECTION_STRING "mkdir -p $DENDRITE_CONFIG_LOCAL_PATH"
ssh -i bastion_keypair.pem $SSH_CONNECTION_STRING "mkdir -p $DENDRITE_MEDIA_LOCAL_PATH"

scp -r -i bastion_keypair.pem ./volumes/dendrite/config/matrix_key.pem $DENDRITE_CONFIG_REMOTE_PATH
scp -r -i bastion_keypair.pem ./volumes/dendrite/config/server.crt $DENDRITE_CONFIG_REMOTE_PATH
scp -r -i bastion_keypair.pem ./volumes/dendrite/config/server.key $DENDRITE_CONFIG_REMOTE_PATH