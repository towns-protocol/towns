#!/bin/bash
echo running matrix-zion-bridge prepareInstall.sh ...
command -v cmake >/dev/null 2>&1 || { echo >&2 "Requires cmake to build the bridge. Install cmake and re-run yarn"; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo >&2 "Requires Rust compiler and tools but they are not installed.  Installing..."; curl https://sh.rustup.rs -sSf | sh -s -- -y; }
command -v cargo >/dev/null 2>&1  && source $HOME/.cargo/env 
echo matrix-zion-bridge prepareInstall.sh done