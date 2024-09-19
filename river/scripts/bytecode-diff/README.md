# Bytecode-Diff Tool

Bytecode-Diff is a tool to retrieve and display contract bytecode diff for Base deployed contracts and Solidity source compiled bytecode compiled with forge. It provides functionality to run source code diffs or remote bytecode diffs and create reports that detail changes between two compiled bytecode versions of contracts.

## Prerequisites

- Go 1.22 or later
- Base RPC Provider URL
- Basescan API Key

## Usage

### Local Source Code Diff

Compile contracts with forge and run source code diff comparing nearest commit report with checked out commit.

The basic command structure is:

```bash
# ensure contracts are compiled with forge
cd ../../contracts
make build
# disable go.work file since bytecode-diff is not a module in parent go workspace
go mod download
# run source diff from checked out commitSha compared nearest commit with a source diff report in SOURCE_DIFF_DIR
GOWORK=off go run main.go -v -s

# write report with contract addresses, their keccak256 compilaed bytecode hash under two keys, existing and updated.
➜  bytecode-diff ✗ yq eval '.existing' source-diffs/00adc44f_08292024_5.yaml
Architect: 0xd291e489716f2c9cfc2e2c6047ce777159969943c85d09c51aaf7bbad10f7c13
ArchitectBase: 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470
ArchitectStorage: 0x86159d997458669c4df8af2da4b5ce9ca742099a3f854c5eb3e718e16a74e4da
Banning: 0xde1354882fd30088cce4b00ff720a6dbc8c9f25653477c6ee99e20e17edb6068
BanningBase: 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470
BanningStorage: 0x86159d997458669c4df8af2da4b5ce9ca742099a3f854c5eb3e718e16a74e4da
ChannelBase: 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470
...
```

### Run pairwise remote bytecode diff on facets deployed to two networks

Runs bytecode diff from deployed facets for diamonds in alpha, gamma, and omega environments as per source coordinates of diamonds for each environment.

```bash
# compare omega against gamma facets and facet selectors
GOWORK=off go run ./main.go gamma omega -v

# output facet implementation changes by facet or selectors that are missing from omega
➜  bytecode-diff git:(jt/net-62-contract-differ) ✗ yq eval deployed-diffs/facet_diff_090324_18.yaml
diamonds:
  - name: spaceOwner
    source: gamma
    target: omega
    facets:
      - sourceContractName: ""
        sourceFacetAddress: 0xfa98a1648761e494fc7d6efe5a06e357a76bd6fb
        selectorsDiff:
          - "0x3953801b"
          - "0x91de4a83"
        sourceBytecodeHash: 0xf86d9dbe53c89e14fa69cde925cca02b6efad519fe172f7b04d9515d7700a59b
        sourceVerified: false
        targetVerified: false
      - sourceContractName: SpaceOwner
        sourceFacetAddress: 0x30c912d8ceb9793e4cd240862acfd0e6c4436c52
        targetContractAddresses:
          - 0x63bC35259Ac32DF43Fba3b890F0F74951451976A
          - 0xe7EB1313f0E7076616534225e16E971B72b50C42
        selectorsDiff: []
        sourceBytecodeHash: 0x461b53ab37fd24283ecd63eb0d4e71bd554a266036c73caf6d2ac39c435e7732
        targetBytecodeHashes:
          - 0x86d20161a13671a6138b80551e94dd8c1638bc5151807ff2194aa1e50cdb3cac
          - 0xff0a94e93a4f4f6ee0ecd0d0e469e55ca40f1ab6c10e6af9da5b2b597f32b178
        sourceVerified: true
        targetVerified: true
      - sourceContractName: ""
        sourceFacetAddress: 0xdba2ce6125cc6b7f93c63d181a0780d5b421940b
        selectorsDiff:
          - "0x0d653654"
          - "0x466a18de"
        sourceBytecodeHash: 0x583c2852056f90c96ed1cab935489f644b8ef564e0a7f11564925d07cf3bc593
        sourceVerified: false
        targetVerified: false

```

### Run keccak256 hash generation on deployed contracts

```bash
GOWORK=off go run main.go add-hashes gamma deployed-diffs/facet_diff_090624_1.yaml

# output to new yaml file suffixed with _hashed.yaml including bytecodeHash for each contract in deployments section
➜  bytecode-diff git:(jt/net-62-upgrade-script-2) ✗ yq e '.deployments' deployed-diffs/facet_diff_090624_1_hashed.yaml
Architect:
  address: 0xa18a3df4f63cdcae943d9c76730adf2812388de4
  baseScanLink: https://sepolia.basescan.org/tx/0x4280ef1300fe001e7d85e7495eba13fc99be53ee7a7060e753d466f8bebf1622
  bytecodeHash: 0x20d0a86e9ea31a39663285aacfe88705983520a4482a7bac5ada891c9adfe090
  deploymentDate: 2024-09-06 19:04
  transactionHash: 0x4280ef1300fe001e7d85e7495eba13fc99be53ee7a7060e753d466f8bebf1622
Banning:
  address: 0x4d88d1fbba6ce6bcdb4381549ee0b7c0d2b56919
  baseScanLink: https://sepolia.basescan.org/tx/0x4ccbaf9750bcd0971975e73a24b05f1c51d4703cf72a406356c79eb54de9c33c
  bytecodeHash: 0xa2ce3e77ba060ff1d59ed384e1c6c5788f308ad8bbbef612eb3e5de4e1d79de8
  deploymentDate: 2024-09-06 19:05
  transactionHash: 0x4ccbaf9750bcd0971975e73a24b05f1c51d4703cf72a406356c79eb54de9c33c
...
```

### Flags

```bash
➜  bytecode-diff ✗ GOWORK=off go run ./main.go --help
A tool to retrieve and display contract bytecode diff for Base

Usage:
  bytecode-diff [source_environment] [target_environment] [flags]

Flags:
  -b, --base-rpc string           Base RPC provider URL
      --base-sepolia-rpc string   Base Sepolia RPC provider URL
      --compiled-facets string    Path to compiled facets
      --deployments string        Path to deployments directory (default "../../contracts/deployments")
      --facets string             Path to facet source files
  -h, --help                      help for bytecode-diff
      --log-level string          Set the logging level (debug, info, warn, error) (default "info")
      --report-out-dir string     Path to report output directory (default "deployed-diffs")
      --source-diff-log string    Path to diff log file (default "source-diffs")
  -s, --source-diff-only          Run source code diff
  -v, --verbose                   Enable verbose output
```

### Environment Variables

You can also set the following environment variables instead of using flags:

- `BASE_RPC_URL`: Base RPC provider URL
- `BASE_SEPOLIA_RPC_URL`: Base Sepolia RPC provider URL
- `FACET_SOURCE_PATH`: Path to facet source files
- `BASESCAN_API_KEY`: Your API key for BaseScan.
- `COMPILED_FACETS_PATH`: (Optional) Path to compiled facets
- `DEPLOYMENTS_PATH`: (Optional) Path to deployed contracts
- `REPORT_OUT_DIR`: (Optional) Path to report output directory
- `SOURCE_DIFF_DIR`: (Optional) Path to source diff reports

## Examples

1. Run source code diff with all parameters specified via flags:

```
./bytecode-diff --source-diff-only \
  --source-diff-dir /path/to/source-diff-reports \
  --facets /path/to/facet/sources \
  --compiled-facets /path/to/compiled/facets \
  --report-out-dir /path/to/report/output \
  --verbose
```

2. Run source code diff using environment variables:

```bash
export SOURCE_DIFF_DIR=/path/to/source_diff.log
export FACET_SOURCE_PATH=/path/to/facet/sources
export COMPILED_FACETS_PATH=/path/to/compiled/facets
export REPORT_OUT_DIR=/path/to/report/output

./bytecode-diff -s --verbose
```

3. Run source code diff with r/w to remote s3 bucket:

```bash
export AWS_ACCESS_KEY_ID=<your-access-key-id>
export AWS_SECRET_ACCESS_KEY=<your-secret-access-key>
export SOURCE_DIFF_DIR=s3://bucket/path
./bytecode-diff -s --verbose
```

## Notes

- If a `.env` file is present in the same directory as the script, it will be loaded automatically.
- When running source code diff, all required paths must be provided either via flags or environment variables.
- Use the `--verbose` flag for more detailed output during execution.
