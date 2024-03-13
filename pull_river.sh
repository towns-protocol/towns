#!/bin/bash

print_usage() {
    echo "Usage: pull_river.sh [OPTIONS]"
    echo "Prerequisites: 1) have gh github cli installed, and"
    echo "               2) run: gh auth login && gh repo set-default"
    echo "  -h: Display this help message."
    echo "  -i: Interactive mode. Will prompt for confirmation before creating a pull request."
    echo "  -u: Enable USER_MODE. Will wait if there are ci errors and allow you to fix them."
    echo "  -c: Enable CI_MODE. Will fail on ci errors and not prompt for user input."
}

# Check if at least one argument is passed
if [ $# -eq 0 ]; then
    print_usage
    exit 1
fi

while getopts "hiuc" arg; do
  case $arg in
    h)
        print_usage
        exit 0
        ;;
    i)
        INTERACTIVE=1
        USER_MODE=1
        ;;
    u)
        USER_MODE=1
        ;;
    c)
        CI_MODE=1
        ;;
    *)
      echo "Invalid argument. Use -h for help."
      exit 1
      ;;
  esac
done

function parse_git_branch() {
    git branch 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/\1/'
}

function make_pr_description() {
    # Use git log to list commit messages not present on origin/main
    git log origin/main..HEAD
}

if [[ "$(git status --porcelain)" != "" ]]; then
  echo "There are uncommitted changes. Please commit or stash them before running this script."
  exit 1
fi

if [[ "$(parse_git_branch)" != "main" ]]; then
  echo "You must be on the main branch to run this script."
  exit 1
fi

# Main repository details
MAINTREE_REPO="herenotthere/harmony"
# Subtree details
SUBTREE_PREFIX="river"
SUBTREE_REPO="https://github.com/river-build/river-stage"
SUBTREE_BRANCH="main"

# Fetch the latest commit hash from the subtree's main branch
COMMIT_HASH=$(git ls-remote "${SUBTREE_REPO}" "${SUBTREE_BRANCH}" | cut -f 1)
SHORT_HASH="${COMMIT_HASH:0:7}"

# Use the commit hash in the branch name
BRANCH_NAME="river_subtree_merge_${SHORT_HASH}"
git fetch --all
git pull


PR_TITLE="Merge ${SUBTREE_PREFIX} at ${SHORT_HASH}"
PR_BODY_DESC="This merges the latest changes from the ${SUBTREE_PREFIX} repository at commit ${SHORT_HASH}."

# Checkout a new branch for the merge
git checkout -b "${BRANCH_NAME}"

# Pull the latest changes from the subtree, preserving history
git subtree pull --prefix="${SUBTREE_PREFIX}" "${SUBTREE_REPO}" "${SUBTREE_BRANCH}" --squash || echo "Subtree pull expected to fail due to conflicts"

# Remove specific files that should not be merged
git rm "${SUBTREE_PREFIX}/package.json" 2>/dev/null || echo "package.json not found, skipping"
git rm "${SUBTREE_PREFIX}/yarn.lock" 2>/dev/null || echo "yarn.lock not found, skipping"

# Check for unresolved conflicts
if git ls-files -u | grep -q '^[^ ]'; then
  echo "Unresolved conflicts detected. Accepting theirs."
  git diff --name-only --diff-filter=U | xargs git checkout --theirs
  git add .
fi

# Commit the changes if there are any
if ! git diff main --quiet --cached; then
    SUBTREE_MERGE_MESSAGE="$(git commit --dry-run)"
    RIVER_ALLOW_COMMIT=true git commit -m "git subtree pull --prefix=${SUBTREE_PREFIX} ${SUBTREE_REPO} ${SUBTREE_BRANCH} --squash" -m "$SUBTREE_MERGE_MESSAGE"
    echo "Subtree changes committed."

    # Run yarn to update the lockfile
    yarn

    # check for changes after running yarn
    if [[ "$(git status --porcelain)" != "" ]]; then
        echo "Commiting yarn lockfile."
        git add yarn.lock
        git commit -m "Update yarn.lock"
    fi
    

    if [[ $INTERACTIVE -eq 1 ]]; then
        read -p "Do you want to continue and create a pull request? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Pull request creation aborted."
            exit 0
        fi
    fi

    # Push the branch to origin
    git push origin "${BRANCH_NAME}"

    # Create a pull request
    PR_BODY="${PR_BODY_DESC}"$'\n\n'"$(make_pr_description)"
    gh pr create --base main --head "${BRANCH_NAME}" --title "${PR_TITLE}" --body "${PR_BODY}"
    echo "Pull request created."

    while true; do

      WAIT_TIME=5
      while true; do
        OUTPUT=$(gh pr checks "${BRANCH_NAME}" 2>&1)
        if [[ "$OUTPUT" == *"no checks reported on the '${BRANCH_NAME}' branch"* ]]; then
          echo "Checks for '${BRANCH_NAME}' haven't started yet. Waiting for $WAIT_TIME seconds..."
          sleep $WAIT_TIME
        else
          break
        fi
      done

      gh pr checks "${BRANCH_NAME}" --fail-fast --interval 2 --watch
      exit_status=$?

      # Check if the command succeeded or failed
      if [ $exit_status -ne 0 ]; then
          echo "Failure detected in PR checks."
          if [[ $USER_MODE -eq 1 ]]; then
              read -p "Have you fixed the issue and pushed your changes yet? (y/n) " -n 1 -r
              echo
              if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                  echo "Pull request creation aborted."
                  exit $exit_status
              else
                PR_BODY="${PR_BODY_DESC}"$'\n\n'"$(make_pr_description)"
                gh pr edit --body "${PR_BODY}"
              fi
          else
              exit $exit_status
          fi
      else 
          echo "All checks passed."
          break
      fi
    done

    if [[ $INTERACTIVE -eq 1 ]]; then
        read -p "Do you want to merge the pull request? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Pull request creation aborted."
            exit 0
        fi
    fi
    
    # Merge the pull request
    gh pr merge "${BRANCH_NAME}" --squash --delete-branch

    echo "Subtree merge completed successfully."
else
    echo "No changes to commit."
    git checkout main
    git branch -D "${BRANCH_NAME}"
fi

