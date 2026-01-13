#!/bin/bash
set -e

# Publish all non-private packages using bun publish
# Fails on real errors, but allows "already published" to continue

failed_packages=()

for dir in packages/*/; do
    if [ ! -f "$dir/package.json" ]; then
        continue
    fi

    cd "$dir"

    # Skip private packages
    if [ "$(bun pm pkg get private)" != "{}" ]; then
        echo "Skipping private package: $dir"
        cd - > /dev/null
        continue
    fi

    pkg_name=$(bun pm pkg get name | tr -d '"')
    echo "Publishing $pkg_name from $dir"

    # Capture output and exit code
    output=$(bun publish 2>&1) && exit_code=$? || exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo "✓ Published $pkg_name"
    elif echo "$output" | grep -q "already exists"; then
        echo "⊘ Skipped $pkg_name (already published)"
    else
        echo "✗ Failed to publish $pkg_name"
        echo "$output"
        failed_packages+=("$pkg_name")
    fi

    cd - > /dev/null
done

if [ ${#failed_packages[@]} -gt 0 ]; then
    echo ""
    echo "Failed to publish:"
    printf '  - %s\n' "${failed_packages[@]}"
    exit 1
fi

echo ""
echo "All packages published successfully"
