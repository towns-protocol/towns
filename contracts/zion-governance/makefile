# include .env file and export its env vars
# (-include to ignore error if it does not exist)
-include .env


# all: clean remove install update solc build

# # Install proper solc version.
# solc:; nix-env -f https://github.com/dapphub/dapptools/archive/master.tar.gz -iA solc-static-versions.solc_0_8_10

# # Clean the repo
# clean  :; forge clean

# # Remove modules
# remove :; rm -rf .gitmodules && rm -rf .git/modules/* && rm -rf lib && touch .gitmodules && git add . && git commit -m "modules"


# # Install the Modules
# install :;
# 	forge install dapphub/ds-test
# 	forge install OpenZeppelin/openzeppelin-contracts
# 	forge install transmissions11/solmate
# 	forge install foundry-rs/forge-std

# # Update Dependencies
# update:; forge update

# # Builds
# build  :; forge clean && forge build --optimize --optimize-runs 1000000

# setup-yarn:
# 	yarn

# # Run unit tests
# cleantest: clean remove build install
# 	forge test

# # Starts a localnode
# localnode:
# 	anvil

deployLocalSpaceManager:
	forge script scripts/foundry/deploy-space-manager.s.sol --rpc-url ${LOCAL_RPC_URL} --private-key ${LOCAL_PRIVATE_KEY} --broadcast -vvvv

deployLocalCouncilNFT:
	forge script scripts/foundry/deploy-council-nft.s.sol --rpc-url ${LOCAL_RPC_URL} --private-key ${LOCAL_PRIVATE_KEY} --broadcast -vvvv

mintLocalCouncilNFT:
	forge script scripts/foundry/mint-council-nft.s.sol --rpc-url ${LOCAL_RPC_URL} --private-key ${LOCAL_PRIVATE_KEY} --broadcast -vvvv
