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

lint :; yarn solhint "{scripts,src,test/**/*.sol}"

anvil :; anvil -m 'test test test test test test test test test test test junk'

# Contract deployment scripts

# ===========================
# 				   Anvil
# ===========================
deploy-anvil :;
	@forge build
	@SAVE_DEPLOYMENTS=1 forge script scripts/deployments/${contract}.s.sol:${contract} --ffi --rpc-url anvil --private-key ${LOCAL_PRIVATE_KEY} --broadcast --watch

upgrade-anvil:;
	@forge build
	@SAVE_DEPLOYMENTS=1 forge script scripts/upgrades/${contract}.s.sol:${contract} --ffi --rpc-url anvil --private-key ${LOCAL_PRIVATE_KEY} --broadcast --watch

# ===========================
# 				 Base Goerli
# ===========================
deploy-base-goerli :;
	@forge build
	@forge script script/${contract}.s.sol:${contract} --ffi --rpc-url base_goerli --private-key ${PRIVATE_KEY} --broadcast --verify --watch

# ===========================
# 				 		Base
# ===========================

deploy-base :;
	@forge build
	@forge script script/${contract}.s.sol:${contract} --ffi --rpc-url base --private-key ${PRIVATE_KEY} --broadcast --verify --watch

# ===========================
# 				  Goerli
# ===========================

deploy-goerli :;
	@forge build
	@SAVE_DEPLOYMENTS=1 forge script scripts/deployments/${contract}.s.sol:${contract} --ffi --rpc-url goerli --private-key ${PRIVATE_KEY} --broadcast --verify --watch -vvvv

verify-goerli :;
	@forge build
	@forge verify-contract ${address} ${contract} --chain goerli

upgrade-goerli:;
	@forge build
	@SAVE_DEPLOYMENTS=1 forge script scripts/upgrades/${contract}.s.sol:${contract} --ffi --rpc-url goerli --private-key ${PRIVATE_KEY} --broadcast --verify --watch -vvvv

# ===========================
# 				  Sepolia
# ===========================

deploy-sepolia :;
	@forge build
	@forge script scripts/deployments/${contract}.s.sol:${contract} --ffi --rpc-url sepolia --private-key ${PRIVATE_KEY} --broadcast --verify --watch -vvvv

# Council NFT interaction scripts
read-anvil :; @cast call ${contractAddress} "${functionName}" --rpc-url http://localhost:8545 --private-key ${LOCAL_PRIVATE_KEY}

write-anvil :; @cast send ${contractAddress} "${functionName}" --rpc-url http://localhost:8545 --private-key ${LOCAL_PRIVATE_KEY}

startLocalWaitlist :; make write-anvil contractAddress=${contractAddress} functionName="startWaitlistMint()"

