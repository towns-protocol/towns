# Makefile

# Configurations
OUTPUT_DIR=./bin

# Source files
SRC := $(shell find . -type f -name '*.go')

# Default target executed when no arguments are given to make.
default: build

# The `clean` target ensures all the compiled files are deleted.
clean:
	rm -rf $(OUTPUT_DIR)

# The `build` target compiles the code and puts the resulting binary in OUTPUT_DIR.
.PHONY: build
build: $(OUTPUT_DIR)/node

# Compiles the node binary
$(OUTPUT_DIR)/node: $(SRC)
	go build -o $(OUTPUT_DIR)/xchain_node ./node

# The `test` target runs the tests.
test:
	go test -v ./...

integration_tests:
	go test -timeout 10m ./server -v -tags integration

# The `vet` target runs go vet to examine Go source code and reports suspicious constructs.
vet:
	go vet ./...

lint:
	golangci-lint run --enable exhaustive --path-prefix=.

fmt:
	./fmt.sh

