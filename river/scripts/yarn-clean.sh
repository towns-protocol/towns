#!/bin/bash

# very similar to running git clean -xd however, we don't want to remove
# .env.local files, etc
# if you want to clean everything temporary created by the build, but 
# don't want a full reset on your dev environment, this is the script for you
#
# run git clean -d -x --dry-run to see what didn't get deleted

pushd "$(git rev-parse --show-toplevel)"

# Check for untracked files
UNTRACKED_FILES=$(git ls-files --others --exclude-standard)
if [ -n "$UNTRACKED_FILES" ]; then
    echo
    echo "There are untracked files. Please add or ignore them before running this script."
    echo
    echo "$(tput setaf 9)$UNTRACKED_FILES$(tput sgr0)"
    echo
    exit 1
fi

echo "cleaning node"

yarn cache clean

# remove large directories that we know we will rebuild. Git clean hangs if we try to remove these in one go
find . -name "node_modules" -type d -exec rm -r "{}" \;
find . -name "dist" -type d -exec rm -r "{}" \;
find . -name "coverage" -type d -exec rm -r "{}" \;
find . -name "out" -type d -exec rm -r "{}" \;
find . -name ".turbo" -type d -exec rm -r "{}" \;
find . -name "tsconfig.tsbuildinfo" -type f -exec rm -r "{}" \;
find . -name ".eslintcache" -type f -exec rm -r "{}" \;

# remove run_files
pushd "core/node" > /dev/null
rm -rf run_files/*
popd > /dev/null
pushd "core/xchain" > /dev/null
rm -rf run_files/*
popd > /dev/null

echo ""

# remove files not tracked by git, but keep dev files
git clean -fdx -e .DS_Store -e '.env.*' -e '.env.*.*' -e '*.yaml' -e .vscode -e '*.pem' -e '*.crt' -e '*.key' -e .keys -e *_key -e *_address -e .wrangler -e .dev.* -e test-config.json

# remove empty directories and directories that only contain .DS_Store files
find . -type d -not -path "./.git/*" -print0 | while IFS= read -r -d '' dir; do
    content_count=$(find "$dir" -mindepth 1 -maxdepth 1 ! -name ".DS_Store" | wc -l)
    if [ "$content_count" -eq 0 ]; then
        echo "Deleting empty directory: $dir"
        rm -r "$dir"
    fi
done

echo "removing anvil tmp files" # --prune-history should be the default when running anvil, but it doesn't work
rm -rf ~/.foundry/anvil/tmp

popd
