#!/usr/bin/env bash

function parse_git_branch() {
    git branch 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/\1/'
}

function make_pr_description() {
    # Use git log to list commit messages not present on origin/main
    git log origin/main..HEAD
}

# You must be on main with a clean working directory to run this script.
if [[ "$(git status --porcelain)" != "" ]]; then
    echo "There are uncommitted changes. Please commit or stash them before running this script."
    exit 1
elif [[ "$(parse_git_branch)" != "main" ]]; then
    echo "You must be on the main branch to run this script."
    exit 1
fi

# get the current git hash 
COMMIT_HASH=$(git rev-parse --short HEAD)
BRANCH_NAME="release-sdk/${COMMIT_HASH}"
PR_TITLE="Release SDK ${COMMIT_HASH}"
VERSION_PREFIX="sdk-${COMMIT_HASH}-"

git checkout -b "${BRANCH_NAME}"

./scripts/yarn-clean.sh
bun install --frozen-lockfile
exit_status=$?

if [ $exit_status -ne 0 ]; then
    echo "bun install failed."
    exit 1
fi

bun run build
exit_status=$?

if [ $exit_status -ne 0 ]; then
    echo "bun build failed."
    exit 1
fi

# Generate contract types for publishing
echo "Generating contract types for publishing..."
bun run --filter @towns-protocol/generated build-types
exit_status_contracts=$?

if [ $exit_status_contracts -ne 0 ]; then
    echo "Contract type generation failed."
    exit 1
fi

# build docs
bun run --filter @towns-protocol/react-sdk gen
exit_status_docgen=$?

if [ $exit_status_docgen -ne 0 ]; then
    echo "bun run --filter @towns-protocol/react-sdk gen failed."
    exit 1
fi

git add packages/docs/
git commit -m "docs for version ${VERSION_PREFIX}"

# copy contracts
./packages/generated/scripts/copy-addresses.sh
git add packages/generated/deployments packages/generated/config/deployments.json
git commit -m "deployments for version ${VERSION_PREFIX}"

git push -u origin "${BRANCH_NAME}"

# Get the new patch version from Lerna and tag it
npx lerna version patch --yes --force-publish --no-private --tag-version-prefix "${VERSION_PREFIX}"

PR_DESCRIPTION="$(make_pr_description)"

# Create PR and capture the PR number
PR_URL=$(gh pr create --base main --head "${BRANCH_NAME}" --title "${PR_TITLE}" --body "${PR_DESCRIPTION}")
if [ $? -ne 0 ]; then
    echo "Failed to create PR"
    exit 1
fi
PR_NUMBER=$(echo $PR_URL | rev | cut -d'/' -f1 | rev)

# Enable auto-merge
gh pr merge "${PR_NUMBER}" --auto --squash

echo "Created PR #${PR_NUMBER}"

# Wait for required checks to pass (skip CodeRabbit and other non-required checks)
while true; do
    WAIT_TIME=10
    # Get status of all checks except CodeRabbit
    CHECKS_OUTPUT=$(gh pr checks "${BRANCH_NAME}" --json name,state 2>/dev/null || echo "[]")
    
    if [[ "$CHECKS_OUTPUT" == "[]" ]]; then
        echo "No checks reported yet, waiting..."
        sleep $WAIT_TIME
        continue
    fi
    
    # Filter out CodeRabbit and check if all other checks passed
    FAILED_CHECKS=$(echo "$CHECKS_OUTPUT" | jq -r '.[] | select(.name != "CodeRabbit") | select(.state == "FAILURE") | .name' 2>/dev/null | tr '\n' ' ')
    PENDING_CHECKS=$(echo "$CHECKS_OUTPUT" | jq -r '.[] | select(.name != "CodeRabbit") | select(.state == "IN_PROGRESS" or .state == "PENDING" or .state == "QUEUED") | .name' 2>/dev/null | tr '\n' ' ')
    
    if [[ -n "$FAILED_CHECKS" && "$FAILED_CHECKS" != " " ]]; then
        echo "Failed checks: $FAILED_CHECKS"
        if [[ ${USER_MODE:-0} -eq 1 ]]; then
            read -p "Harmony CI is failing. Restart CI. (any key to retry/q) " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Qq]$ ]]; then
                echo "Pull request creation aborted."
                exit 1
            fi
        else
            echo "Harmony CI is failing. Waiting for CI to be rerun..."
        fi
        # Sleep before retrying to avoid hammering the GitHub API
        sleep ${RETRY_SLEEP:-30}
        continue
    fi
    
    if [[ -z "$PENDING_CHECKS" || "$PENDING_CHECKS" == " " ]]; then
        echo "All required checks passed (ignoring CodeRabbit)"
        break
    fi
    
    echo "Waiting for checks: $PENDING_CHECKS"
    sleep $WAIT_TIME
done

# Wait for PR to be merged using the specific PR number
TIMEOUT=7200  # 2 hours in seconds
START_TIME=$(date +%s)

while gh pr view "$PR_NUMBER" --json state -q ".state" | grep -q "OPEN"; do
    CURRENT_TIME=$(date +%s)
    ELAPSED_TIME=$(($CURRENT_TIME - $START_TIME))

    if [ $ELAPSED_TIME -ge $TIMEOUT ]; then
        echo "Error: Timed out waiting for PR #${PR_NUMBER} to merge after 2 hours"
        exit 1
    fi

    echo "Waiting for PR #${PR_NUMBER} to be merged..."
    sleep 30
done
echo "PR #${PR_NUMBER} has been merged"

# Pull the changes to local main
git pull --rebase

# Publish the nightly version to npm
echo "Starting Lerna publish..."
npx lerna publish from-package --yes --no-private --force-publish --tag-version-prefix "${VERSION_PREFIX}" || {
    echo "Lerna publish failed with exit code $?"
    exit 1
}
echo "Lerna publish completed successfully"
