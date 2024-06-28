# ERC-4337 Devnet

A simple Docker setup to deploy ERC-4337 infrastructure on your local dev environment.

> **🚀 Need access to Smart Account infrastructure for your production environment? Check out [stackup.sh](https://www.stackup.sh/)!**

## Usage

The following command will deploy a local devnet with all the required ERC-4337 infrastructure components ready to go.

```bash
docker-compose up
```

You can run the following command to check if the devnet is ready. This signals that the relevant contracts have been deployed to the devnet and all infra components are up and running.

```bash
make wait
```

You can point you local applications to any of these RPC URLs:

- `http://localhost:8545` for access to all node and bundler RPC methods.
- `http://localhost:8546` for node RPC methods only.
- `http://localhost:43370` for bundler RPC methods only.
- `http://localhost:43371` for paymaster RPC methods only.

## Useful commands

Fund any address on the devnet:

```bash
# ADDRESS and ETH can be set to any value.
make fund-address ADDRESS=0x... ETH=1
```

## Relevant entities

The ERC-4337 devnet uses the following mnemonic and derived entities. **These should be strictly used for development and testing only and never in production.**

### Mnemonic

This is used to derive all EOAs, particularly the Bundler account and Paymaster signer.

```
test test test test test test test test test test test junk
```

### Primary EOA

This is the first EOA account derived from the mnemonic above. It uses the default path `m/44'/60'/0'/0/0`.

```
Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### V0.6 Stackup paymaster contract

This is the [Stackup verifying paymaster](https://github.com/stackup-wallet/contracts) contract for `v0.6`. The signer for this contract is the primary EOA above.

```
Address: 0x42051Fa8F6c012102899c902aA214f1e97bD8aDb
```

## Components

The ERC-4337 devnet is composed of several pieces:

- `node`: go-ethereum running in dev mode. It runs the [ERC-4337 Execution Client](https://github.com/stackup-wallet/erc-4337-execution-clients) build to leverage native bundler tracers.
- `bundler`: stackup-bundler that depends on `node` for the underlying ethereum client.
- `proxy`: [OpenResty](https://openresty.org/en/) server used to proxy JSON-RPC methods to the `node` or `bundler`.
- `fund-account`: A one off command to fund the primary EOA on startup.
- `deploy-v0.6`: A one off command to deploy `v0.6` ERC-4337 contracts.
- `deploy-v0.6-stackup-paymaster`: A one off command to deploy a Stackup verifying paymaster for `v0.6`.
- `stake-v0.6-stackup-paymaster`: A one off command to stake the `v0.6` Stackup verifying paymaster.
- `deposit-v0.6-stackup-paymaster`: A one off command to deposit funds to the `v0.6` Stackup verifying paymaster.
- `get-v0.6-stackup-paymaster`: A one off command to get the deposit info for the `v0.6` Stackup verifying paymaster.
- `deploy-v0.7`: A one off command to deploy `v0.7` ERC-4337 contracts.
- `paymaster`: stackup-paymaster that depends on `node` for the underlying ethereum client and contract from `deploy-v0.6-stackup-paymaster`.
