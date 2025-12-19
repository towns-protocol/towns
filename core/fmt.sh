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
  list_modified_go_files() {
    {
      git diff --name-only --diff-filter=ACMR
      git ls-files --others --exclude-standard
    } | awk 'NF && /\.go$/ { print }' | sort -u
  }

  files=()
  while IFS= read -r file; do
    files+=("$file")
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
