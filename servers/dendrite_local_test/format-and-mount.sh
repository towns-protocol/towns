#!/usr/bin/env bash

# This is a script to format and mount the volumes for the dendrite server and postgres database.

# We use xfs instead of ext4 as it is more performant for our use case. (I.e potentially large files & database scale)
sudo mkfs -t xfs /dev/xvdf

# We then create a mount point for the volume.
sudo mkdir $1 

# We then mount the volume to the mount point.
sudo mount /dev/xvdf $1 