#!/bin/bash
set -euo pipefail

# Default session name
SESSION_NAME="River"

# Check if an argument is passed, if so, override the session name
if [ $# -gt 0 ]; then
    SESSION_NAME="$1"
fi

sh ./scripts/kill-all-local-dev.sh -y

tmux list-windows -t "$SESSION_NAME" -F '#I' | xargs -I {} tmux kill-window -t "$SESSION_NAME":{}
