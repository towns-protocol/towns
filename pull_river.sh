#!/bin/bash

print_usage() {
    echo "Usage: pull_river.sh [OPTIONS]"
    echo "Prerequisites: 1) have gh github cli installed, and"
    echo "               2) run: gh auth login && gh repo set-default"
    echo "  -h: Display this help message."
    echo "  -a: AUTO_MODE. Will run the script without waiting for user input."
    echo "  -u: USER_MODE. Will wait if there are CI errors and allow you to fix them."
    echo "  -x: USER_MODE_X. includes -u, and runs yarn lint, build, and test:unit."
    echo "  -k: PROMPT_BEFORE_PR. Will prompt the user before creating the pull request. (use if you know you need to fix things)"
    echo "  -j: PROMPT_BEFORE_MERGE. Will prompt the user before merging the pull request. (use if you know you need to fix things)"
    echo "  -i: INTERACTIVE. Runs -x and prompts for confirmation before creating a pull request. For debugging each step."
}

# Check if at least one argument is passed
if [ $# -eq 0 ]; then
    USER_MODE=1 # user mode is currently the only way this script is used.
fi

while getopts "hauxjki" arg; do
  case $arg in
    h)
        print_usage
        exit 0
        ;;
    a) 
        AUTO_MODE=1
        USER_MODE=1
        PROMPT_BEFORE_MERGE=0
        PROMPT_BEFORE_PR=0
        ;;
    u)
        USER_MODE=1
        ;;
    k)
        USER_MODE=1
        PROMPT_BEFORE_PR=1
        ;;
    j)
        USER_MODE=1
        PROMPT_BEFORE_MERGE=1
        ;;
    x)
        USER_MODE=1
        USER_MODE_X=1
        PROMPT_BEFORE_MERGE=1
        ;;
    i)
        USER_MODE=1
        USER_MODE_X=1
        INTERACTIVE=1
        PROMPT_BEFORE_MERGE=1
        ;;
    *)
      echo "Invalid argument. Use -h for help."
      exit 1
      ;;
  esac
done

function confirmContinue() {
    local promptMessage="$1"  # Use $1 to access the first argument passed to the function

    if [[ $INTERACTIVE -eq 1 ]]; then
        read -p "${promptMessage} (any key/n) " -n 1 -r
        echo    # Move to a new line
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            echo "Merge aborted."
            exit 1 
        fi
    fi
}

function play_failure_sound() {
    if [[ $USER_MODE -eq 1 ]]; then
        afplay /System/Library/Sounds/Sosumi.aiff
    fi
}
function play_success_sound() {
    if [[ $USER_MODE -eq 1 ]]; then
        afplay /System/Library/Sounds/Purr.aiff
    fi
}

function play_prompt_sound() {
    if [[ $USER_MODE -eq 1 ]]; then
        afplay /System/Library/Sounds/Bottle.aiff
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
    rm -rf "${SUBTREE_PREFIX}/.git"
    git rm "${SUBTREE_PREFIX}/package.json"
    rm "${SUBTREE_PREFIX}/package.json" 2>/dev/null
    git rm "${SUBTREE_PREFIX}/yarn.lock"
    rm "${SUBTREE_PREFIX}/yarn.lock" 2>/dev/null
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

function list_inprogress_branches() {
    # stop if branch with same exact name exists
    branch_with_current_commit=$(git branch -r | grep "${BRANCH_NAME}" | sed 's/origin\///')
    if [ ! -z "$branch_with_current_commit" ]; then
        echo "Remote branch '$BRANCH_NAME' exists, pull_river already in progress"
        exit 0
    fi

    # list other branches in progress
    branches=$(git branch -r | grep 'river_subtree_merge' | sed 's/origin\///')
    if [ -z "$branches" ]; then
        echo "No branches with the prefix 'river_subtree_merge' found."
    else
        echo "Found branches with the prefix 'river_subtree_merge':"
        # Loop through the branches and print the author of the latest commit
        for branch in $branches; do
            # Fetch the author of the latest commit on the branch
            author=$(git log -1 --format="%an" "origin/$branch")
            echo "    Subtree pull in progress on branch '$branch' made by: $author"
        done
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
SUBTREE_REPO="https://github.com/river-build/river"
SUBTREE_BRANCH="main"


# prompt the user for a commit hash, if they don't enter one, just use the latest
if [[ $AUTO_MODE -ne 1 ]]; then
    echo "Enter the commit hash of the river repo you would like to merge, or press enter to use the latest."
    read -p "Commit hash: " COMMIT_HASH
fi

if [[ -z "$COMMIT_HASH" ]]; then
    echo "No commit hash entered. Using the latest commit."
    COMMIT_HASH=$(git ls-remote "${SUBTREE_REPO}" "${SUBTREE_BRANCH}" | cut -f 1)
else
    echo "Using commit hash: $COMMIT_HASH"
fi

if [[ $AUTO_MODE -ne 1 ]]; then
    if [[ $PROMPT_BEFORE_PR -ne 1 ]]; then
        read -p "Do you need to make fixes before submitting a PR? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            PROMPT_BEFORE_PR=1
        fi
    fi
fi

if [[ $AUTO_MODE -ne 1 ]]; then
    if [[ $PROMPT_BEFORE_MERGE -ne 1 ]]; then
        read -p "Would you like to auto commit when CI is green? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            PROMPT_BEFORE_MERGE=1
        fi
    fi
fi

# Fetch the latest commit hash from the subtree's main branch
SHORT_HASH="${COMMIT_HASH:0:7}"

# echo short hash
echo "Short hash: $SHORT_HASH"

# Use the commit hash in the branch name
BRANCH_NAME="river_subtree_merge_${SHORT_HASH}"

if [[ "$(git status --porcelain)" != "" ]]; then
    echo "There are uncommitted changes. Please commit or stash them before running this script."
    exit 1
elif [[ "$(parse_git_branch)" != "main" ]]; then
    echo "You must be on the main branch to run this script."
    exit 1
fi

git fetch --all
git pull

list_inprogress_branches

PR_TITLE="Merge ${SUBTREE_PREFIX} at ${SHORT_HASH}"
PR_BODY_DESC="This merges the latest changes from the ${SUBTREE_PREFIX} repository at commit ${SHORT_HASH}."


# Checkout a new branch for the merge
git checkout -b "${BRANCH_NAME}"

if [[ "$(parse_git_branch)" != "${BRANCH_NAME}" ]]; then
  echo "Failed to check out ${BRANCH_NAME}."
  exit 1
fi

# Pull the latest changes from the subtree, blasting away any local changes
rm -rf "${SUBTREE_PREFIX}"
rm -rf "${SUBTREE_PREFIX}" # run twice to get around permission denied errors
git clone --depth 1 "${SUBTREE_REPO}" "${SUBTREE_PREFIX}"
pushd "${SUBTREE_PREFIX}"
git checkout "${COMMIT_HASH}"
if git checkout "$COMMIT_HASH" >/dev/null 2>&1; then
  # If the fetch succeeds, the commit exists
  echo "$COMMIT_HASH is a valid commit in the repository."
else
  # If the fetch fails, the commit does not exist in the repository
  echo "$COMMIT_HASH is not a valid commit in the repository."
  exit 1
fi
popd

remove_river_yarn_files

git add .

confirmContinue "Subtree pull complete. Would you like to continue?"

# Commit the changes if there are any
if ! git diff main --quiet --cached; then

    SUBTREE_MERGE_MESSAGE="$(RIVER_ALLOW_COMMIT=true git commit --dry-run)"
    RIVER_ALLOW_COMMIT=true git commit -m "./pull_river.sh --prefix=${SUBTREE_PREFIX} ${SUBTREE_REPO} ${SUBTREE_BRANCH} --squash" -m "$SUBTREE_MERGE_MESSAGE"
    echo "Subtree changes committed."

    # Run yarn, commit new yarn.lock, and check for build breakages
    yarn_install_and_check
    
    # if PROMPT_BEFORE_PR is true, prompt the user for any key to continue
    if [[ $PROMPT_BEFORE_PR -eq 1 ]]; then
        play_prompt_sound
        read -p "Are you ready to submit a pr? (any key to continue/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            echo "Pull request creation aborted."
            exit $exit_status
        fi
    else
        confirmContinue "Do you want to continue and create a pull request?"
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
          play_failure_sound
          echo "Failure detected in PR checks."
          if [[ $USER_MODE -eq 1 ]]; then
              read -p "Harmony CI is failing. Please make fixes, commit and push your changes, or restart CI. (any key to continue/n) " -n 1 -r
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

    if [[ $PROMPT_BEFORE_MERGE -eq 1 ]]; then
        play_prompt_sound
        read -p "Do you want to merge the pull request? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Pull request creation aborted."
            exit 0
        fi
    fi
    
    # Merge the pull request
    gh pr merge "${BRANCH_NAME}" --squash --delete-branch

    exit_status=$?
    if [ $exit_status -ne 0 ]; then
        play_failure_sound
        echo "Failed to merge pull request."
        exit $exit_status
    fi

    echo "Subtree merge completed successfully."

    echo "Deploying river..."

    gh workflow run River_deploy.yml -f docker_image_tag="${SHORT_HASH}" -f run_mode="full" -f node_numbers="[1,2,3,4,5,6,7,8,9,10,11]"

    gh workflow run River_deploy.yml -f docker_image_tag="${SHORT_HASH}" -f run_mode="archive" -f node_numbers="[1]"

    play_success_sound
else
    play_failure_sound
    echo "No changes to commit."
    git checkout main
    git branch -D "${BRANCH_NAME}"
fi

