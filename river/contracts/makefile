-include .env

.PHONY: all test clean deploy-base-anvil

all: clean install build

clean  :; forge clean

install:; forge install

update:; forge update

build:
	@forge build

test :; forge test --ffi

snapshot :; forge snapshot

format :; yarn prettier --write .

lint :; yarn solhint "{scripts,src,test/**/*.sol}"

anvil :; anvil -m 'test test test test test test test test test test test junk'

# Contract deployment scripts

# ===========================
# 				   Anvil
# ===========================
deploy-base-anvil-nb:
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script scripts/deployments/${contract}.s.sol:${contract} --ffi --rpc-url base_anvil --private-key ${LOCAL_PRIVATE_KEY} --broadcast --slow

deploy-base-anvil-facet:
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script scripts/deployments/facets/${contract}.s.sol:${contract} --ffi --rpc-url base_anvil --private-key ${LOCAL_PRIVATE_KEY} --broadcast --slow

deploy-base-anvil: build deploy-base-anvil-nb

interact-base-anvil :;
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script scripts/interactions/${contract}.s.sol:${contract} --ffi --rpc-url base_anvil --private-key ${LOCAL_PRIVATE_KEY} --broadcast

# EXAMPLE
deploy-anvil-staging :;
	@forge build
	@SAVE_DEPLOYMENTS=1 DEPLOYMENT_CONTEXT=staging forge script scripts/deployments/${contract}.s.sol:${contract} --ffi --rpc-url base_anvil --private-key ${LOCAL_PRIVATE_KEY} --broadcast

migrate-anvil:;
	@forge build
	@SAVE_DEPLOYMENTS=1 forge script scripts/migrations/${contract}.s.sol:${contract} --ffi --rpc-url base_anvil --private-key ${LOCAL_PRIVATE_KEY} --broadcast

# ===========================
# 				 River
# ===========================
deploy-river-anvil-nb:
	@SAVE_DEPLOYMENTS=1 \
		forge script scripts/deployments/${contract}.s.sol:${contract} \
		--ffi \
		--rpc-url river_anvil \
		--chain-id 31338 \
		--private-key ${LOCAL_PRIVATE_KEY} \
		--broadcast \


deploy-river-anvil-explicit:
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 \
		forge script scripts/deployments/${contract}.s.sol:${contract} \
		--ffi \
		--rpc-url river_anvil \
		--chain-id 31338 \
		--private-key ${LOCAL_PRIVATE_KEY} \
		--broadcast

deploy-river-anvil: build deploy-river-anvil-nb

deploy-river :;
	@forge build
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script scripts/deployments/${contract}.s.sol:${contract} --ffi --rpc-url river --private-key ${RIVER_PRIVATE_KEY} --verifier blockscout --verifier-url ${RIVERSCAN_URL} --broadcast --verify

verify-river :;
	@forge build
	@forge verify-contract ${address} ${contract} --chain river

interact-river :;
	@forge build
	@forge script scripts/interactions/${contract}.s.sol:${contract} --ffi --rpc-url river --private-key ${RIVER_PRIVATE_KEY} --broadcast

# ===========================
# 				 Base Sepolia
# ===========================
deploy-base-sepolia :;
	@forge build
	@SAVE_DEPLOYMENTS=1 forge script scripts/deployments/${contract}.s.sol:${contract} --ffi --rpc-url base_sepolia --private-key ${BASE_PRIVATE_KEY} --broadcast --verify --verifier blockscout --verifier-url ${BLOCKSCOUT_SEPOLIA_URL}

migrate-base-sepolia:;
	@forge build
	@SAVE_DEPLOYMENTS=1 forge script scripts/migrations/${contract}.s.sol:${contract} --ffi --rpc-url base_sepolia --private-key ${BASE_PRIVATE_KEY} --broadcast --verify --verifier blockscout --verifier-url ${BLOCKSCOUT_SEPOLIA_URL}

interact-base-sepolia :;
	@forge build
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script scripts/interactions/${contract}.s.sol:${contract} --ffi --rpc-url base_sepolia --private-key ${BASE_PRIVATE_KEY} --broadcast  --verify --verifier blockscout --verifier-url ${BLOCKSCOUT_SEPOLIA_URL}

test-base-sepolia :;
	@forge build
	@forge script scripts/migrations/${contract}.s.sol:${contract} --ffi --fork-url base_sepolia --private-key ${BASE_PRIVATE_KEY}

verify-base-sepolia :;
	@forge build
	@forge verify-contract ${address} ${contract} --chain-id 84532

# ===========================
# 				 Base Goerli
# ===========================
deploy-base-goerli :;
	@forge build
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script scripts/deployments/${contract}.s.sol:${contract} --ffi --rpc-url base_goerli --private-key ${BASE_PRIVATE_KEY} --broadcast --verify --watch

interact-base-goerli :;
	@forge build
	@forge script scripts/interactions/${contract}.s.sol:${contract} --ffi --rpc-url base_goerli --private-key ${BASE_PRIVATE_KEY} --broadcast --watch

test-base-goerli :;
	@forge build
	@forge script scripts/migrations/${contract}.s.sol:${contract} --ffi --fork-url base_goerli --private-key ${BASE_PRIVATE_KEY}

verify-base-goerli :;
	@forge build
	@forge verify-contract ${address} ${contract} --chain base-goerli

migrate-base-goerli:;
	@forge build
	@SAVE_DEPLOYMENTS=1 forge script scripts/migrations/${contract}.s.sol:${contract} --ffi --rpc-url base_goerli --private-key ${BASE_PRIVATE_KEY} --broadcast --verify --watch -vvvv

# ===========================
# 				 		Base
# ===========================

deploy-base :;
	@forge build
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script scripts/deployments/${contract}.s.sol:${contract} --ffi --rpc-url base --private-key ${BASE_PRIVATE_KEY} --verifier-url ${BASESCAN_URL} --etherscan-api-key ${BASESCAN_API_KEY} --broadcast --verify -vvvv

interact-base :;
	@forge build
	@forge script scripts/interactions/${contract}.s.sol:${contract} --ffi --rpc-url base --private-key ${BASE_PRIVATE_KEY} --broadcast --watch

verify-base :;
	@forge build
	@forge verify-contract ${address} ${contract} --verifier-url ${BASESCAN_URL} -e ${BASESCAN_API_KEY}

migrate-base:;
	@forge build
	@SAVE_DEPLOYMENTS=1 forge script scripts/migrations/${contract}.s.sol:${contract} --ffi --rpc-url base --private-key ${BASE_PRIVATE_KEY} --broadcast --verify --watch -vvvv

# ===========================
# 				  Sepolia
# ===========================

deploy-sepolia :;
	@forge build
	@SAVE_DEPLOYMENTS=1 forge script scripts/deployments/${contract}.s.sol:${contract} --ffi --rpc-url sepolia --private-key ${BASE_PRIVATE_KEY} --broadcast --verify --watch -vvvv

upgrade-sepolia:;
	@forge build
	@forge script scripts/upgrades/${contract}.s.sol:${contract} --ffi --rpc-url sepolia --private-key ${BASE_PRIVATE_KEY} --broadcast --verify --watch -vvvv

verify-sepolia :;
	@forge build
	@forge verify-contract ${address} ${contract} --chain sepolia

# Council NFT interaction scripts
read-anvil :; @cast call ${contractAddress} "${functionName}" --rpc-url http://localhost:8545 --private-key ${LOCAL_PRIVATE_KEY}

write-anvil :; @cast send ${contractAddress} "${functionName}" --rpc-url http://localhost:8545 --private-key ${LOCAL_PRIVATE_KEY}

startLocalWaitlist :; make write-anvil contractAddress=${contractAddress} functionName="startWaitlistMint()"

# ===========================
# 				  Mainnet
# ===========================

deploy-mainnet :;
	@forge build
	@SAVE_DEPLOYMENTS=1 forge script scripts/deployments/${contract}.s.sol:${contract} --ffi --rpc-url mainnet --private-key ${BASE_PRIVATE_KEY} --broadcast --verify -vvvv

verify-mainnet :;
	@forge verify-contract ${address} ${contract} --chain mainnet
