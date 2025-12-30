#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

./golangci-version-check.sh

usage() {
  cat <<'EOF'
Usage: ./fmt.sh [--stdin|--all]

Default: format modified Go files detected by git.
  --stdin  Run: golangci-lint fmt --stdin
  --all    Run: golangci-lint fmt
EOF
}

if [[ $# -eq 0 ]]; then
  git_root="$(git rev-parse --show-toplevel)"

  list_modified_go_files() {
    {
      # Unstaged changes
      git diff --name-only --diff-filter=ACMR
      # Staged changes
      git diff --cached --name-only --diff-filter=ACMR
      # Untracked files
      git ls-files --others --exclude-standard
      # Committed changes vs origin/main (if it exists)
      if git rev-parse --verify origin/main >/dev/null 2>&1; then
        git diff --name-only --diff-filter=ACMR origin/main...HEAD
      elif git rev-parse --verify main >/dev/null 2>&1; then
        git diff --name-only --diff-filter=ACMR main...HEAD
      fi
    } | awk 'NF && /\.go$/ { print }' | sort -u
  }

  files=()
  while IFS= read -r file; do
    # Paths from git are relative to repo root - check existence there
    # Only include files in core/ directory, strip the core/ prefix for golangci-lint
    if [[ -f "$git_root/$file" ]] && [[ "$file" == core/* ]]; then
      files+=("${file#core/}")
    fi
  done < <(list_modified_go_files)

  if [[ ${#files[@]} -eq 0 ]]; then
    echo "No modified Go files to format."
    exit 0
  fi

  golangci-lint fmt "${files[@]}"
  exit 0
fi

if [[ $# -ne 1 ]]; then
  echo "ERROR: unexpected arguments." >&2
  usage >&2
  exit 2
fi

case "$1" in
  --stdin)
    golangci-lint fmt --stdin
    ;;
  --all)
    golangci-lint fmt
    ;;
  -h|--help)
    usage
    ;;
  *)
    echo "Unknown option: $1" >&2
    usage >&2
    exit 2
    ;;
esac
