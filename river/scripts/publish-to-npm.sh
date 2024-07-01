

function parse_git_branch() {
    git branch 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/\1/'
}

function make_pr_description() {
    # Use git log to list commit messages not present on origin/main
    git log origin/main..HEAD
}

# if current branch is main, then exit
if [[ "$(git status --porcelain)" != "" ]]; then
    echo "There are uncommitted changes. Please commit or stash them before running this script."
    exit 1
elif [[ "$(parse_git_branch)" != "main" ]]; then
    echo "You must be on the main branch to run this script."
    exit 1
fi


# get the current git hash 
COMMIT_HASH=$(git rev-parse HEAD)
SHORT_HASH="${COMMIT_HASH:0:7}"
BRANCH_NAME="release-sdk/${SHORT_HASH}"
PR_TITLE="Release SDK ${SHORT_HASH}"

git checkout -b "${BRANCH_NAME}"

./scripts/yarn-clean.sh
yarn install
exit_status_yarn=$?

if [ $exit_status_yarn -ne 0 ]; then
    echo "yarn install failed."
    exit 1
fi

yarn build
exit_status_yarn=$?

if [ $exit_status_yarn -ne 0 ]; then
    echo "yarn build failed."
    exit 1
fi

git push -u origin "${BRANCH_NAME}"

npx lerna version --yes --force-publish --no-private

PR_DESCRIPTION="$(make_pr_description)"

gh pr create --base main --head "${BRANCH_NAME}" --title "${PR_TITLE}" --body "$(PR_DESCRIPTION)"

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
            read -p "Harmony CI is failing. Restart CI. (any key to retry/q) " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Qq]$ ]]; then
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

# Merge the pull request
gh pr merge "${BRANCH_NAME}" --squash --delete-branch

exit_status=$?
if [ $exit_status -ne 0 ]; then
    play_failure_sound
    echo "Failed to merge pull request."
    exit $exit_status
fi

# Pull the changes to local main
git pull --rebase

npx lerna publish from-package --yes --no-private --force-publish
