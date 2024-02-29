#!/bin/bash
set -euo pipefail

tmux list-windows -t River -F '#I' | xargs -I {} tmux kill-window -t River:{}
