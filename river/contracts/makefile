-include .env

.PHONY: all test clean deploy-base-anvil

all: clean install build

clean  :; forge clean

install:; forge install

update:; forge update

build:; forge build

test :; forge test --ffi

snapshot :; forge snapshot

format :; yarn prettier --write .

lint :; yarn solhint "{scripts,src,test/**/*.sol}"

anvil :; anvil -m 'test test test test test test test test test test test junk'

# ===========================
# 				Base Anvil
# ===========================
deploy-base-anvil:;
	@echo "Deploying $(contract)..."
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 \
	forge script scripts/deployments/$(if $(findstring facet,$(type)),facets/)${contract}.s.sol:${contract} \
	--ffi --rpc-url base_anvil --private-key ${LOCAL_PRIVATE_KEY} --broadcast

interact-base-anvil :;
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script scripts/interactions/${contract}.s.sol:${contract} --ffi --rpc-url base_anvil --private-key ${LOCAL_PRIVATE_KEY} --broadcast

# ===========================
# 				River Anvil
# ===========================
deploy-river-anvil:
	@echo "Deploying $(contract)..."
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 \
	forge script scripts/deployments/$(if $(findstring facet,$(type)),facets/)${contract}.s.sol:${contract} \
	--ffi --rpc-url river_anvil --private-key ${LOCAL_PRIVATE_KEY} --broadcast

interact-river-anvil :;
	@echo "Interacting through $(contract)..."
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script scripts/interactions/${contract}.s.sol:${contract} --ffi --rpc-url river_anvil --private-key ${LOCAL_PRIVATE_KEY} --broadcast

# ===========================
# 				River
# ===========================
deploy-river :;
	@echo "Deploying $(contract)..."
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script scripts/deployments/$(if $(findstring facet,$(type)),facets/)${contract}.s.sol:${contract} --ffi --rpc-url river --private-key ${RIVER_PRIVATE_KEY} --verifier blockscout --verifier-url ${RIVERSCAN_URL} --broadcast --verify

interact-river :;
	@echo "Interacting through $(contract)..."
	@forge script scripts/interactions/${contract}.s.sol:${contract} --ffi --rpc-url river --private-key ${RIVER_PRIVATE_KEY} --broadcast

test-river :;
	@forge build
	@forge script scripts/interactions/${contract}.s.sol:${contract} --ffi --fork-url river --private-key ${BASE_PRIVATE_KEY}

verify-river :;
	@echo "Verifying $(address)..."
	@forge verify-contract ${address} ${contract} --chain river

# ===========================
# 				 Base Sepolia
# ===========================
deploy-base-sepolia :;
	@echo "Deploying $(contract)..."
	@SAVE_DEPLOYMENTS=1 forge script scripts/deployments/$(if $(findstring facet,$(type)),facets/)${contract}.s.sol:${contract} --ffi --rpc-url base_sepolia --private-key ${BASE_PRIVATE_KEY} --broadcast --verify --verifier blockscout --verifier-url ${BLOCKSCOUT_SEPOLIA_URL}

interact-base-sepolia :;
	@echo "Interacting through $(contract)..."
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script scripts/interactions/${contract}.s.sol:${contract} --ffi --rpc-url base_sepolia --private-key ${BASE_PRIVATE_KEY} --broadcast --verify --verifier-url ${BASESCAN_SEPOLIA_URL} --etherscan-api-key ${BASESCAN_API_KEY}

test-base-sepolia :;
	@echo "Testing $(contract)..."
	@forge script scripts/interactions/${contract}.s.sol:${contract} --ffi --fork-url base_sepolia --private-key ${BASE_PRIVATE_KEY}

verify-basescan-base-sepolia :;
	@forge verify-contract ${address} ${contract} --chain-id 84532 --verifier-url ${BASESCAN_SEPOLIA_URL} --etherscan-api-key ${BASESCAN_API_KEY}

verify-blockscout-base-sepolia :;
	@forge verify-contract ${address} ${contract} --chain-id 84532 --verifier blockscout --verifier-url ${BLOCKSCOUT_SEPOLIA_URL}

# ===========================
# 				 		Base
# ===========================

deploy-base :;
	@echo "Deploying $(contract)..."
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script scripts/deployments/$(if $(findstring facet,$(type)),facets/)${contract}.s.sol:${contract} --ffi --rpc-url base --private-key ${BASE_PRIVATE_KEY} --verifier-url ${BASESCAN_URL} --etherscan-api-key ${BASESCAN_API_KEY} --broadcast --verify -vvvv

interact-base :;
	@echo "Interacting through $(contract)..."
	@forge script scripts/interactions/${contract}.s.sol:${contract} --ffi --rpc-url base --private-key ${BASE_PRIVATE_KEY} --broadcast

verify-base :;
	@forge verify-contract ${address} ${contract} --verifier-url ${BASESCAN_URL} -e ${BASESCAN_API_KEY}

# ===========================
# 				Sepolia
# ===========================

deploy-sepolia :;
	@echo "Deploying $(contract)..."
	@SAVE_DEPLOYMENTS=1 forge script scripts/deployments/$(if $(findstring facet,$(type)),facets/)${contract}.s.sol:${contract} --ffi --rpc-url sepolia --private-key ${BASE_PRIVATE_KEY} --broadcast --verify -vvvv

verify-sepolia :;
	@forge verify-contract ${address} ${contract} --chain sepolia

interact-sepolia :;
	@echo "Interacting through $(contract)..."
	@forge script scripts/interactions/${contract}.s.sol:${contract} --ffi --rpc-url sepolia --private-key ${BASE_PRIVATE_KEY} --broadcast

# ===========================
# 				Mainnet
# ===========================

deploy-mainnet :;
	@SAVE_DEPLOYMENTS=1 forge script scripts/deployments/$(if $(findstring facet,$(type)),facets/)${contract}.s.sol:${contract} --ffi --rpc-url mainnet --private-key ${BASE_PRIVATE_KEY} --broadcast --verify -vvvv

verify-mainnet :;
	@forge verify-contract ${address} ${contract} --chain mainnet
