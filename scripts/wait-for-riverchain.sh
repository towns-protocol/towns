#!/bin/bash

echo "Waiting for RiverChain to launch on 8546..."

while ! nc -z 127.0.0.1 8546; do   
  sleep 0.1 # wait for 1/10 of the second before check again
done

echo "RiverChain launched"
