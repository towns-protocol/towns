#!/bin/bash
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

echo
echo "===================================="
echo "===========Pull River Dev==========="
echo "===================================="
echo

if [[ $# -eq 0 ]]; then  
    echo "WARNING: This script will pull in changes from the river-stage repository."
    echo "It is intended for testing purposes only. "
    echo "Do not make a pull request with these changes."
    echo "Please use pull_river.sh to pull in any changes from river-stage."
    echo
    read -p "Do you understand this warning message ? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo
        echo "Please chat with Austin to get up to speed."
        exit 0
    fi
fi

print_usage() {
    echo "Usage: pull_river_dev.sh [OPTIONS]"
    echo "Pull any branch of river-stage into your local branch"
    echo "Prerequisites: 1) have gh github cli installed, and"
    echo "               2) run: gh auth login && gh repo set-default"
    echo "  -h: Display this help message."
    echo "  -i: INTERACTIVE_MODE. Will prompt at most steps."
    echo "  [-b branch_name]: pass a branch name at invocation."
}

while getopts "hib:" arg; do
  case $arg in
    h)
        print_usage
        exit 0
        ;;
    i)
        INTERACTIVE_MODE=1
        ;;
    b)
      SUBTREE_BRANCH="$OPTARG"
      ;;
    *)
      echo "Invalid argument. Use -h for help."
      exit 1
      ;;
  esac
done

confirmContinue() {
    local promptMessage="$1"  # Use $1 to access the first argument passed to the function

    if [[ $INTERACTIVE_MODE -eq 1 ]]; then
        read -p "${promptMessage} (any key/n) " -n 1 -r
        echo    # Move to a new line
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            echo "Merge aborted."
            exit 1 
        fi
    fi
}

function parse_git_branch() {
    git branch 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/\1/'
}

function make_pr_description() {
    # Use git log to list commit messages not present on origin/main
    git log origin/main..HEAD
}

function remove_river_yarn_files() {
    # these files shouldn't be checked into the harmony repo
    rm -rf "${SUBTREE_PREFIX}/.git" 2>/dev/null || echo "${SUBTREE_PREFIX}/.git not found, skipping"
    git rm "${SUBTREE_PREFIX}/package.json" 2>/dev/null || echo "${SUBTREE_PREFIX}/package.json not found, skipping"
    rm "${SUBTREE_PREFIX}/package.json" 2>/dev/null || echo "${SUBTREE_PREFIX}/package.json not found, skipping"
    git rm "${SUBTREE_PREFIX}/yarn.lock" 2>/dev/null || echo "${SUBTREE_PREFIX}/yarn.lock not found, skipping"
    rm "${SUBTREE_PREFIX}/yarn.lock" 2>/dev/null || echo "${SUBTREE_PREFIX}/yarn.lock not found, skipping"
}

function yarn_install_and_check() {
    ./scripts/yarn-clean.sh
    
    # run yarn, give user a chance to fix issues
    while true; do
        # Run yarn to check for build breakages and update the lockfile
        echo "Running yarn install..."
        yarn install
        exit_status_yarn=$?
        if [ $exit_status_yarn -eq 0 ]; then
            break
        fi

        echo "Yarn process failed."
        echo ""
        read -n 1 -s -r -p "Please fix issues and commit your changes. Press any key to continue"
        echo ""
    done

    # if you run on a fresh repo, the yarn lock file can get re-created
    remove_river_yarn_files

    confirmContinue "Yarn install complete. Continue with the merge?"

    # check for changes after running yarn
    if [[ "$(git status --porcelain)" != "" ]]; then
        echo "Commiting yarn changes."
        git add .
        YARN_FIXUP_MESSAGE="$(RIVER_ALLOW_COMMIT=true git commit --dry-run)"
        RIVER_ALLOW_COMMIT=true git commit -m "Yarn Install Fix-Ups" -m "$YARN_FIXUP_MESSAGE"
    fi
}


#
#
# BEGIN SCRIPT LOGIC
#
#

ORIGINAL_BRANCH="$(parse_git_branch)"

if [[ "$(git status --porcelain)" != "" ]]; then
    echo "There are uncommitted changes. Please commit or stash them before running this script."
    exit 1
elif [[ "$ORIGINAL_BRANCH" == "main" ]]; then
    echo "This script is not meant to be run on main, please create a new branch."
    exit 1
fi

# Main repository details
MAINTREE_REPO="herenotthere/harmony"
# Subtree details
SUBTREE_PREFIX="river"
SUBTREE_REPO="https://github.com/river-build/river"


if [[ -z "$SUBTREE_BRANCH" ]]; then
  # enter a branch name
  read -p "Branch to merge from (default: main): " SUBTREE_BRANCH
  # Check if the user entered something
  if [[ -z "$SUBTREE_BRANCH" ]]; then
    # default to main
    SUBTREE_BRANCH="main"
  fi
fi

# get the hash
COMMIT_HASH=$(git ls-remote "${SUBTREE_REPO}" "${SUBTREE_BRANCH}" | cut -f 1)
SHORT_HASH="${COMMIT_HASH:0:7}"

# check if the hash is empty
if [[ -z "$COMMIT_HASH" ]]; then
    echo "Failed to fetch the latest commit hash from the ${SUBTREE_REPO} repository at branch '${SUBTREE_BRANCH}'."
    exit 1
fi

echo 
echo
echo "Merging from ${SUBTREE_REPO} at branch '${SUBTREE_BRANCH}' commit: $COMMIT_HASH / $SHORT_HASH"
echo
echo

BRANCH_NAME="${ORIGINAL_BRANCH}_${SHORT_HASH}"

git fetch --all

# checkout a new working branch
git checkout -b "${BRANCH_NAME}"

# Pull the latest changes from the subtree, blasting away any local changes
rm -rf river
rm -rf river # run twice to get around permission denied errors

confirmContinue "Deleted river complete. Continue with the clone?"

git clone -b "${SUBTREE_BRANCH}" "${SUBTREE_REPO}" river

remove_river_yarn_files

git add .

# if interactive mode pause and ask for confirmation to continue
confirmContinue "Subtree pull compelte. Continue with the merge?"


# Commit the changes if there are any
if ! git diff main --quiet --cached; then

    SUBTREE_MERGE_MESSAGE="$(RIVER_ALLOW_COMMIT=true git commit --dry-run)"
    RIVER_ALLOW_COMMIT=true git commit -m "./pull_river_dev.sh --prefix=${SUBTREE_PREFIX} ${SUBTREE_REPO} ${SUBTREE_BRANCH} --squash" -m "$SUBTREE_MERGE_MESSAGE"
    echo "Subtree changes committed."

    # Run yarn, commit new yarn.lock, and check for build breakages
    yarn_install_and_check

    # squash and merge back onto the original branch
    git checkout "$ORIGINAL_BRANCH"
    git merge --squash "$BRANCH_NAME"

    confirmContinue "Merge to original branch complete. Continue with the merge?"

    COMMIT_MERGE_MESSAGE="$(RIVER_ALLOW_COMMIT=true git commit --dry-run)"
    RIVER_ALLOW_COMMIT=true git commit -m "Dev - merged ${SUBTREE_PREFIX} at ${SHORT_HASH}" -m "$COMMIT_MERGE_MESSAGE"
else
    echo "No changes to commit."
fi

git checkout "$ORIGINAL_BRANCH"
git branch -D "$BRANCH_NAME"

