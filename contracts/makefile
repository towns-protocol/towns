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
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script scripts/deployments/${contract}.s.sol:${contract} --ffi --rpc-url anvil --private-key ${LOCAL_PRIVATE_KEY} --broadcast --watch

# EXAMPLE
deploy-anvil-staging :;
	@forge build
	@SAVE_DEPLOYMENTS=1 DEPLOYMENT_CONTEXT=staging forge script scripts/deployments/${contract}.s.sol:${contract} --ffi --rpc-url anvil --private-key ${LOCAL_PRIVATE_KEY} --broadcast --watch

migrate-anvil:;
	@forge build
	@SAVE_DEPLOYMENTS=1 forge script scripts/migrations/${contract}.s.sol:${contract} --ffi --rpc-url anvil --private-key ${LOCAL_PRIVATE_KEY} --broadcast --watch

# ===========================
# 				 River
# ===========================
deploy-river :;
	@forge build
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script scripts/deployments/${contract}.s.sol:${contract} --ffi --rpc-url river --private-key ${PRIVATE_KEY} --verifier blockscout --verifier-url ${RIVERSCAN_URL} --broadcast --verify

verify-river :;
	@forge build
	@forge verify-contract ${address} ${contract} --chain river

# ===========================
# 				 Base Goerli
# ===========================
deploy-base-goerli :;
	@forge build
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script scripts/deployments/${contract}.s.sol:${contract} --ffi --rpc-url base_goerli --private-key ${PRIVATE_KEY} --broadcast --verify --watch

interact-base-goerli :;
	@forge build
	@forge script scripts/interactions/${contract}.s.sol:${contract} --ffi --rpc-url base_goerli --private-key ${PRIVATE_KEY} --broadcast --watch

verify-base-goerli :;
	@forge build
	@forge verify-contract ${address} ${contract} --chain base-goerli

migrate-base-goerli:;
	@forge build
	@SAVE_DEPLOYMENTS=1 forge script scripts/migrations/${contract}.s.sol:${contract} --ffi --rpc-url base_goerli --private-key ${PRIVATE_KEY} --broadcast --verify --watch -vvvv

# ===========================
# 				 		Base
# ===========================

deploy-base :;
	@forge build
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script scripts/deployments/${contract}.s.sol:${contract} --ffi --rpc-url base --private-key ${PRIVATE_KEY} --verifier-url ${BASESCAN_URL} --etherscan-api-key ${BASESCAN_API_KEY} --broadcast --verify -vvvv

interact-base :;
	@forge build
	@forge script scripts/interactions/${contract}.s.sol:${contract} --ffi --rpc-url base --private-key ${PRIVATE_KEY} --broadcast --watch

verify-base :;
	@forge build
	@forge verify-contract ${address} ${contract} --verifier-url ${BASESCAN_URL} -e ${BASESCAN_API_KEY}

migrate-base:;
	@forge build
	@SAVE_DEPLOYMENTS=1 forge script scripts/migrations/${contract}.s.sol:${contract} --ffi --rpc-url base --private-key ${PRIVATE_KEY} --broadcast --verify --watch -vvvv

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
	@forge script scripts/upgrades/${contract}.s.sol:${contract} --ffi --rpc-url goerli --private-key ${PRIVATE_KEY} --broadcast --verify --watch -vvvv

migrate-goerli:;
	@forge build
	@forge script scripts/migrations/${contract}.s.sol:${contract} --ffi --rpc-url goerli --private-key ${PRIVATE_KEY} --broadcast --verify --watch -vvvv

# ===========================
# 				  Sepolia
# ===========================

deploy-sepolia :;
	@forge build
	@SAVE_DEPLOYMENTS=1 forge script scripts/deployments/${contract}.s.sol:${contract} --ffi --rpc-url sepolia --private-key ${PRIVATE_KEY} --broadcast --verify --watch -vvvv

upgrade-sepolia:;
	@forge build
	@forge script scripts/upgrades/${contract}.s.sol:${contract} --ffi --rpc-url sepolia --private-key ${PRIVATE_KEY} --broadcast --verify --watch -vvvv

verify-sepolia :;
	@forge build
	@forge verify-contract ${address} ${contract} --chain sepolia

# Council NFT interaction scripts
read-anvil :; @cast call ${contractAddress} "${functionName}" --rpc-url http://localhost:8545 --private-key ${LOCAL_PRIVATE_KEY}

write-anvil :; @cast send ${contractAddress} "${functionName}" --rpc-url http://localhost:8545 --private-key ${LOCAL_PRIVATE_KEY}

startLocalWaitlist :; make write-anvil contractAddress=${contractAddress} functionName="startWaitlistMint()"

