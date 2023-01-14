-include .env

.PHONY: all test clean deploy-anvil

all: clean install build

clean  :; forge clean

install:; forge install

update:; forge update

build:; forge build

test :; forge test

snapshot :; forge snapshot

format :; yarn prettier --write .

lint :; yarn solhint src/**/*.sol

anvil :; anvil -m 'test test test test test test test test test test test junk'

# Contract deployment scripts
# Seperate build from script to avoid race inside forge where the linker wasn't fnisihing before the script started running
deploy-anvil :;
	@forge build
	@forge script scripts/${contract}.s.sol:${contract} --rpc-url http://localhost:8545 --private-key ${LOCAL_PRIVATE_KEY} --broadcast

# Seperate build from script to avoid race inside forge where the linker wasn't fnisihing before the script started running
deploy-goerli :;
	@forge build
	@forge script scripts/${contract}.s.sol:${contract} --rpc-url ${GOERLI_RPC_URL} --private-key ${GOERLI_PRIVATE_KEY} --broadcast --verify -vvvv

# Council NFT interaction scripts
read-anvil :; @cast call ${contractAddress} "${functionName}" --rpc-url http://localhost:8545 --private-key ${LOCAL_PRIVATE_KEY}

write-anvil :; @cast send ${contractAddress} "${functionName}" --rpc-url http://localhost:8545 --private-key ${LOCAL_PRIVATE_KEY}

startLocalWaitlist :; make write-anvil contractAddress=${contractAddress} functionName="startWaitlistMint()"

