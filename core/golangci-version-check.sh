#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

usage() {
  cat <<'EOF'
Usage: ./golangci-version-check.sh [--install]

Checks for golangci-lint installation and ensures the version matches
.golangci-lint-version. Use --install to install the required version.
EOF
}

install_requested=false
for arg in "$@"; do
  case "$arg" in
    --install)
      install_requested=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ ! -f .golangci-lint-version ]]; then
  echo "ERROR: .golangci-lint-version not found." >&2
  exit 1
fi

required_version="$(tr -d '[:space:]' < .golangci-lint-version)"
if [[ -z "$required_version" ]]; then
  echo "ERROR: .golangci-lint-version is empty." >&2
  exit 1
fi

install_version="$required_version"
if [[ "$install_version" != v* ]]; then
  install_version="v${install_version}"
fi

needs_install=false
if ! command -v golangci-lint >/dev/null 2>&1; then
  needs_install=true
else
  installed_version="$(golangci-lint version --short | tr -d '[:space:]')"
  installed_version="${installed_version#v}"
  if [[ "$installed_version" != "$required_version" ]]; then
    needs_install=true
  fi
fi

if [[ "$needs_install" == true ]]; then
  if [[ "$install_requested" == true ]]; then
    curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/HEAD/install.sh | \
      sh -s -- -b "$(go env GOPATH)/bin" "$install_version"
  else
    echo "ERROR: golangci-lint $required_version is not installed or does not match the required version." >&2
    echo "Run command to install the correct version:" >&2
    echo "" >&2
    echo "    ./golangci-version-check.sh --install" >&2
    echo "" >&2
    exit 1
  fi
fi
