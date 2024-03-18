#!/bin/bash

print_usage() {
    echo "Usage: pull_river.sh [OPTIONS]"
    echo "Prerequisites: 1) have gh github cli installed, and"
    echo "               2) run: gh auth login && gh repo set-default"
    echo "  -h: Display this help message."
    echo "  -u: USER_MODE. Will wait if there are CI errors and allow you to fix them."
    echo "  -x: USER_MODE_X. includes -u, and runs yarn lint, build, and test:unit."
    echo "  -i: INTERACTIVE. Runs -x and prompts for confirmation before creating a pull request."
    echo "  -c: CI_MODE. Will fail on any errors and not prompt for user input."
    echo "  -p: PREVIEW. Print diff of changes without creating a pull request."
}

# Check if at least one argument is passed
if [ $# -eq 0 ]; then
    print_usage
    exit 1
fi

while getopts "huxicp" arg; do
  case $arg in
    h)
        print_usage
        exit 0
        ;;
    u)
        USER_MODE=1
        ;;
    x)
        USER_MODE=1
        USER_MODE_X=1
        ;;
    i)
        USER_MODE=1
        USER_MODE_X=1
        INTERACTIVE=1
        ;;
    c)
        CI_MODE=1
        ;;
    p)
        PREVIEW_MODE=1
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

function remove_river_yarn_files() {
    # these files shouldn't be checked into the harmony repo
    git rm "${SUBTREE_PREFIX}/package.json" 2>/dev/null || echo "${SUBTREE_PREFIX}/package.json not found, skipping"
    rm "${SUBTREE_PREFIX}/package.json" 2>/dev/null || echo "${SUBTREE_PREFIX}/package.json not found, skipping"
    git rm "${SUBTREE_PREFIX}/yarn.lock" 2>/dev/null || echo "${SUBTREE_PREFIX}/yarn.lock not found, skipping"
    rm "${SUBTREE_PREFIX}/package.json" 2>/dev/null || echo "${SUBTREE_PREFIX}/package.json not found, skipping"
}

function yarn_install_and_check() {
    # clean yarn artifacts so we know that yarn link will actually run and tell is if the build is broken
    ./scripts/yarn-clean.sh

    # run yarn, give user a chance to fix issues
    while true; do
        # Run yarn to check for build breakages and update the lockfile
        echo "Running yarn install..."
        yarn install
        exit_status_yarn=$?
        if [ $exit_status_yarn -eq 0 ]; then
            if [[ $USER_MODE_X -ne 1 ]]; then
                break
            else
                echo "Running yarn build..."
                yarn build
                exit_status_yarn=$?
                if [ $exit_status_yarn -eq 0 ]; then
                    echo "Running yarn lint..."
                    yarn lint
                    exit_status_yarn=$?
                    if [ $exit_status_yarn -eq 0 ]; then
                        echo "Running yarn test:unit..."
                        yarn test:unit
                        exit_status_yarn=$?
                        if [ $exit_status_yarn -eq 0 ]; then
                            break
                        fi
                    fi
                fi
            fi
        fi

        echo "Yarn process failed."
        if [[ $USER_MODE -eq 1 ]]; then
            echo ""
            read -n 1 -s -r -p "Please fix issues and commit your changes. Press any key to continue"
            echo ""
        else
            exit $exit_status_yarn
        fi
    done

    # if you run on a fresh repo, the yarn lock file can get re-created
    remove_river_yarn_files

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
    
# preview can just diff and exit
if [[ $PREVIEW_MODE -eq 1 ]]; then
    git diff HEAD:./$SUBTREE_PREFIX FETCH_HEAD --summary
    exit 0
elif [[ "$(git status --porcelain)" != "" ]]; then
    echo "There are uncommitted changes. Please commit or stash them before running this script."
    exit 1
elif [[ "$(parse_git_branch)" != "main" ]]; then
    echo "You must be on the main branch to run this script."
    exit 1
fi

git pull

PR_TITLE="Merge ${SUBTREE_PREFIX} at ${SHORT_HASH}"
PR_BODY_DESC="This merges the latest changes from the ${SUBTREE_PREFIX} repository at commit ${SHORT_HASH}."

# Checkout a new branch for the merge
git checkout -b "${BRANCH_NAME}"

if [[ "$(parse_git_branch)" != "${BRANCH_NAME}" ]]; then
  echo "Failed to check out ${BRANCH_NAME}."
  exit 1
fi

# Pull the latest changes from the subtree, preserving history
git subtree pull --prefix="${SUBTREE_PREFIX}" "${SUBTREE_REPO}" "${SUBTREE_BRANCH}" --squash -m "git subtree pull ${SUBTREE_PREFIX} at ${SHORT_HASH}"

# Check for unresolved conflicts
if git ls-files -u | grep -q '^[^ ]'; then
  echo "Unresolved conflicts detected. Accepting theirs."
  git diff --name-only --diff-filter=U | xargs git checkout --theirs
fi

# Remove specific files that should not be merged
remove_river_yarn_files

# Commit the changes if there are any
if ! git diff main --quiet --cached; then
    git add .
    SUBTREE_MERGE_MESSAGE="$(RIVER_ALLOW_COMMIT=true git commit --dry-run)"
    RIVER_ALLOW_COMMIT=true git commit -m "git subtree pull --prefix=${SUBTREE_PREFIX} ${SUBTREE_REPO} ${SUBTREE_BRANCH} --squash" -m "$SUBTREE_MERGE_MESSAGE"
    echo "Subtree changes committed."

    # Run yarn, commit new yarn.lock, and check for build breakages
    yarn_install_and_check
    
    if [[ $INTERACTIVE -eq 1 ]]; then
        read -p "Do you want to continue and create a pull request? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Pull request creation aborted."
            exit 0
        fi
    fi

    # Push the branch to origin
    git push -u origin "${BRANCH_NAME}"

    # Create a pull request
    PR_BODY="${PR_BODY_DESC}"$'\n\n'"$(make_pr_description)"
    gh pr create --base main --head "${BRANCH_NAME}" --title "${PR_TITLE}" --body "${PR_BODY}"
    echo "Pull request created."

    # Open the pull request in the browser
    if [[ $USER_MODE_X -eq 1 ]]; then
        gh pr view --web
    fi

    # wait for the checks to complete
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
              read -p "Have you fixed the issue and pushed your changes yet? (any key to continue/n) " -n 1 -r
              echo ""
              if [[ $REPLY =~ ^[Nn]$ ]]; then
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

