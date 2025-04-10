#!/usr/bin/env bash

# Clear all VITE_ prefixed environment variables in case you have them in your shell and are re-starting the app
for var in $(env | grep '^VITE_' | cut -d= -f1); do
    unset $var
done

# Run vite
exec vite "$@" 