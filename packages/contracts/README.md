<h2>River Contracts</h2>

<h3>Requirements</h3>

Install [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)

```shell
npm install --global yarn
```

Download [Foundry](https://github.com/foundry-rs/foundry)

```shell
curl -L https://foundry.paradigm.xyz | bash
```

Then after reloading PATH, to install it run:

```shell
./scripts/foundry-up.sh
```

If you see a warning about libusb, install it by running:

```shell
brew install libusb
```

<h3>Project setup</h3>

Clone the repo, then:

```shell
yarn
```

<b>To compile the smart contracts located in `./contracts`:</b>

```shell
forge build
```

Compiled contracts will be output to the `./out` folder

<b>To run the solidity unit tests:</b>

```shell
forge test
```

You can add verbosity to the tests by adding `-vvvv` (1-4 levels) to the command

<b>To start a local Ethereum blockchain:</b>

```shell
anvil
```

It will generate a set of 10 public/private keys with 10k ether each. Save one of these private keys for deployment
below.\
It starts listening on `http://127.0.0.1:8545`\
If you want to interact with anvil via a front end, you will need to add the local network to Metamask
with `ChainID=1337`

<b>To start a local base blockchain and river blockchain run</b>

```shell
./scripts/bc-all-start.sh
```

<b>To deploy our contracts to your local base and river instances</b>

1. duplicate `.env.localhost` file in the [contracts](.) folder of the project and rename it to `.env` (this is excluded
   from git via .gitignore)
2. run `export RIVER_ENV="local_multi"` from your terminal
3. you will then run `./scripts/deploy-contracts.sh` to deploy the entire suite of contracts to your local base-anvil
   and river-anvil chains.

<b>To deploy a single diamond base contract to your local anvil instance</b>\
from within the `contracts/` folder you can run `make deploy-base-anvil contract=Deploy[Contract] type=diamonds` you will replace
the `[Contract]` part with the contract you want to deploy, you can see all the contracts available for deployment
in [this](./scripts/deployments/diamonds) part of the project.

<b>To deploy a facet contract to your local anvil instance</b>\
The project supports two methods for deploying facets:

1. Using custom deployment scripts: `make deploy-base-anvil contract=Deploy[Facet] type=facets`

   - Replace `[Facet]` with the name of your facet deployment script found in [./scripts/deployments/facets](./scripts/deployments/facets)
   - This approach uses scripts that inherit from `Deployer` and implement `versionName()` and `__deploy()` functions

2. Using the standardized `DeployFacet` script: `make deploy-facet-local rpc=base_anvil contract=[FacetName]`
   - Replace `[FacetName]` with the actual facet contract name (without "Deploy" prefix)
   - This approach uses the common `DeployFacet.s.sol` script with the `CONTRACT_NAME` environment variable
   - It leverages deterministic CREATE2 addresses and supports batch deployments
   - For more details, see the [DeployFacet documentation](./node_modules/@towns-protocol/diamond/scripts/README.md)

<b>To deploy facets to a live network</b>\
from within the `contracts/` folder you can run:

```shell
# For custom deployment scripts:
make deploy-base-sepolia contract=Deploy[Contract] type=facets context=[context]

# For standardized DeployFacet script:
make deploy-facet rpc=base_sepolia contract=[FacetName] context=[context]
```

For example, to deploy the WalletLink facet to Base Sepolia with a deployment context of "gamma":

```shell
# Using custom deployment script:
make deploy-base-sepolia contract=DeployWalletLink type=facets context=gamma

# Using standardized DeployFacet script:
make deploy-facet rpc=base_sepolia contract=WalletLink context=gamma
```

For hardware wallet deployments, use the corresponding ledger commands:

```shell
# Using custom deployment script:
make deploy-ledger-base-sepolia contract=DeployWalletLink type=facets context=gamma

# Using standardized DeployFacet script:
make deploy-facet-ledger rpc=base_sepolia contract=WalletLink context=gamma
```

You can see all the contracts available for deployment in the [deployments](./scripts/deployments) directory.
