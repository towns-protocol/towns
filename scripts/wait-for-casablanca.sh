#!/bin/bash

echo "Waiting Casablanca to launch on 7104..."

while ! nc -z localhost 7104; do   
  sleep 0.1 # wait for 1/10 of the second before check again
done

echo "Casablanca launched"