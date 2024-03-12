#!/bin/bash

# To use this script you need to 1) be an admin of the main repo, 2) have gh github cli installed, 3) run `gh auth login` && `gh repo set-default`
# Define a function to print usage information
print_usage() {
    echo "Usage: pull_river.sh [OPTIONS]"
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

# Checkout a new branch for the merge
git checkout -b "${BRANCH_NAME}"

# Pull the latest changes from the subtree, preserving history
git subtree pull --prefix="${SUBTREE_PREFIX}" "${SUBTREE_REPO}" "${SUBTREE_BRANCH}" || echo "Subtree pull expected to fail due to conflicts"

# Remove specific files that should not be merged
git rm "${SUBTREE_PREFIX}/package.json" 2>/dev/null || echo "package.json not found, skipping"
git rm "${SUBTREE_PREFIX}/yarn.lock" 2>/dev/null || echo "yarn.lock not found, skipping"

# Check for unresolved conflicts
if git ls-files -u | grep -q '^[^ ]'; then
  echo "Unresolved conflicts detected. Aborting merge."
  git checkout main
  git branch -D "${BRANCH_NAME}"
  exit 1
fi

# Commit the changes if there are any
if ! git diff main --quiet --cached; then
    RIVER_ALLOW_COMMIT=true git commit -m "Merge ${SUBTREE_PREFIX} at ${SHORT_HASH}"
    echo "Changes committed."
    
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
    PR_TITLE="Merge ${SUBTREE_PREFIX} at ${SHORT_HASH}"
    PR_BODY="This merges the latest changes from the ${SUBTREE_PREFIX} repository at commit ${SHORT_HASH}."
    gh pr create --base main --head "${BRANCH_NAME}" --title "${PR_TITLE}" --body "${PR_BODY}"
    echo "Pull request created."

    while true; do

      WAIT_TIME=5
      while true; do
        OUTPUT=$(gh pr checks "${BRANCH_NAME}" 2>&1)
        if [[ "$OUTPUT" == *"no checks reported on the '${BRANCH_NAME}' branch"* ]]; then
          echo "Checks for '$branch_name' haven't started yet. Waiting for $WAIT_TIME seconds..."
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

    # Enable merge commits temporarily
    gh api -X PATCH repos/${MAINTREE_REPO} -H "Accept: application/vnd.github.v3+json" -f allow_merge_commit=true

    # Merge the pull request
    gh pr merge "${BRANCH_NAME}" --merge --delete-branch

    # Disable merge commits as we generally don't want them enabled
    gh api -X PATCH repos/${MAINTREE_REPO} -H "Accept: application/vnd.github.v3+json" -f allow_merge_commit=false

    echo "Subtree merge completed successfully."
else
    echo "No changes to commit."
    git checkout main
    git branch -D "${BRANCH_NAME}"
fi

