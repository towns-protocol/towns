#!/usr/bin/env zsh
tmux new-session -d -s harmony
tmux new-window -d -t '=harmony' -n anvil
tmux send-keys -t '=harmony:=anvil' 'anvil' Enter

tmux new-window -d -t '=harmony' -n deploy
tmux send-keys -t '=harmony:=deploy' './scripts/deploy-zion-governance-contracts.sh' Enter

tmux new-window -d -t '=harmony' -n dendrite
tmux send-keys -t '=harmony:=dendrite' './scripts/start-local-dendrite.sh -waz' Enter

tmux new-window -d -t '=harmony' -n casablanca
tmux send-keys -t '=harmony:=casablanca' 'yarn csb:dev' Enter

tmux new-window -d -t '=harmony' -n lib -c 'clients/web/lib'
tmux send-keys -t '=harmony:=lib' 'yarn watch' Enter

tmux new-window -d -t '=harmony' -n sample-app -c 'clients/web/sample-app'
tmux send-keys -t '=harmony:=sample-app' 'yarn dev' Enter


[ -n "${TMUX:-}" ] &&
    tmux switch-client -t '=harmony' ||
    tmux attach-session -t '=harmony'
