#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

# Define tool versions as environment variables
GOLANGCI_LINT_VERSION="v2.0.2"
STATICCHECK_VERSION="v0.6.1"

# If the script is called with --install, only install the pinned versions of the tools and exit.
if [[ "${1:-}" == "--install" ]]; then
  echo "Installing pinned linting tools..."
  go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@${GOLANGCI_LINT_VERSION}
  go install honnef.co/go/tools/cmd/staticcheck@${STATICCHECK_VERSION}
  echo "Installation complete."
  exit 0
fi

echo "golangci-lint"
go run github.com/golangci/golangci-lint/v2/cmd/golangci-lint@${GOLANGCI_LINT_VERSION} run

echo "lint_extensions.sh"
./node/lint_extensions.sh

echo "staticcheck"
go run honnef.co/go/tools/cmd/staticcheck@${STATICCHECK_VERSION} ./...