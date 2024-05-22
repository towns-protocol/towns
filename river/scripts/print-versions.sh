#!/bin/bash -ue

# binary, version arg
function print_version() {
    local binary=$1
    local version_arg=$2
    # Check if binary exists
    if ! command -v $binary &> /dev/null
    then
        echo "$binary could not be found"
    else
        local version=$($binary $version_arg 2>/dev/null)
        echo "$binary version:"
        echo "  $version        $(which $binary)"
    fi
}

print_version "go" "version"
print_version "node" "--version"
print_version "yarn" "--version"
print_version "anvil" "--version"
print_version "forge" "--version"
print_version "docker" "--version"
print_version "protoc" "--version"
print_version "buf" "--version"
print_version "rustc" "--version"
print_version "cargo" "--version"
print_version "buf" "--version"