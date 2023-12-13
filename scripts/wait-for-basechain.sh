#!/bin/bash

echo "Waiting for BaseChain to launch on 8545..."

while ! nc -z 127.0.0.1 8545; do   
  sleep 0.1 # wait for 1/10 of the second before check again
done

echo "BaseChain launched"
