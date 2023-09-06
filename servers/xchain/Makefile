# Makefile

# Configurations
OUTPUT_DIR=./bin

# Default target executed when no arguments are given to make.
default: build

# The `clean` target ensures all the compiled files are deleted.
clean:
	rm -rf $(OUTPUT_DIR)

# The `build` target compiles the code and puts the resulting binary in OUTPUT_DIR.
build: clean
	go build -o $(OUTPUT_DIR)/node ./node
	go build -o $(OUTPUT_DIR)/integration_test ./integration_test


# The `test` target runs the tests.
test:
	go test -v ./...
	
# The `vet` target runs go vet to examine Go source code and reports suspicious constructs.
vet:
	go vet ./...

lint:
	golangci-lint run --enable exhaustive --path-prefix=.

