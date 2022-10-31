#!/bin/bash

echo "Waiting Casablanca to launch on 80..."

while ! nc -z localhost 80; do   
  sleep 0.1 # wait for 1/10 of the second before check again
done

echo "Casablanca launched"