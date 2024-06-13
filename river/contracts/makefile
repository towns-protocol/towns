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

clear-anvil-deployments :; rm -rf deployments/base_anvil deployments/river_anvil

# ===========================
# 				Base Anvil
# ===========================
deploy-base-anvil:;
	@echo "Deploying $(contract)..."
	@SAVE_DEPLOYMENTS=1 forge script scripts/deployments/$(if $(findstring facet,$(type)),facets/)${contract}.s.sol:${contract} --ffi --rpc-url base_anvil --private-key ${LOCAL_PRIVATE_KEY} --broadcast

interact-base-anvil :;
	@SAVE_DEPLOYMENTS=1 forge script scripts/interactions/${contract}.s.sol:${contract} --ffi --rpc-url base_anvil --private-key ${LOCAL_PRIVATE_KEY} --broadcast

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

# ================================== TESTNETS ==================================

# ===========================
# 			River Testnet
# ===========================
deploy-river-testnet :;
	@echo "Deploying $(contract)..."
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script scripts/deployments/$(if $(findstring facet,$(type)),facets/)${contract}.s.sol:${contract} --ffi --rpc-url river_devnet --private-key ${RIVER_PRIVATE_KEY} --verifier blockscout --verifier-url ${RIVERSCAN_DEVNET_URL} --broadcast --verify

interact-river-testnet :;
	@echo "Interacting through $(contract)..."
	@forge script scripts/interactions/${contract}.s.sol:${contract} --ffi --rpc-url river_devnet --private-key ${RIVER_PRIVATE_KEY} --broadcast

test-river-testnet :;
	@forge build
	@forge script scripts/interactions/${contract}.s.sol:${contract} --ffi --fork-url river_devnet --private-key ${TESTNET_PRIVATE_KEY}

verify-river-testnet :;
	@echo "Verifying $(address)..."
	@forge verify-contract ${address} ${contract} --chain river_devnet

# ===========================
# 				 Base Sepolia
# ===========================
deploy-base-sepolia :;
	@echo "Deploying $(contract)..."
	@SAVE_DEPLOYMENTS=1 forge script scripts/deployments/$(if $(findstring facet,$(type)),facets/)${contract}.s.sol:${contract} --ffi --rpc-url base_sepolia --private-key ${TESTNET_PRIVATE_KEY} --broadcast --verify --verifier blockscout --verifier-url ${BLOCKSCOUT_SEPOLIA_URL}

deploy-ledger-base-sepolia :;
	@echo "Deploying $(contract)..."
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script scripts/deployments/$(if $(findstring facet,$(type)),facets/)${contract}.s.sol:${contract} --ledger --hd-paths "m/44'/60'/1'/0/0" --sender ${PRODUCTION_ADDRESS} --ffi --rpc-url base_sepolia --broadcast --verify --verifier blockscout --verifier-url ${BLOCKSCOUT_SEPOLIA_URL}

interact-base-sepolia :;
	@echo "Interacting through $(contract)..."
	@SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script scripts/interactions/${contract}.s.sol:${contract} --ffi --rpc-url base_sepolia --private-key ${TESTNET_PRIVATE_KEY} --broadcast --verify --verifier-url ${BASESCAN_SEPOLIA_URL} --etherscan-api-key ${BASESCAN_API_KEY}

test-base-sepolia :;
	@echo "Testing $(contract)..."
	@forge script scripts/interactions/${contract}.s.sol:${contract} --ffi --fork-url base_sepolia --private-key ${TESTNET_PRIVATE_KEY}

verify-basescan-base-sepolia :;
	@forge verify-contract ${address} ${contract} --chain-id 84532 --verifier-url ${BASESCAN_SEPOLIA_URL} --etherscan-api-key ${BASESCAN_API_KEY}

verify-blockscout-base-sepolia :;
	@forge verify-contract ${address} ${contract} --chain-id 84532 --verifier blockscout --verifier-url ${BLOCKSCOUT_SEPOLIA_URL}

# ===========================
# 				Sepolia
# ===========================

deploy-sepolia :;
	@echo "Deploying $(contract)..."
	@SAVE_DEPLOYMENTS=1 forge script scripts/deployments/$(if $(findstring facet,$(type)),facets/)${contract}.s.sol:${contract} --ffi --rpc-url sepolia --private-key ${TESTNET_PRIVATE_KEY} --broadcast --verify --legacy -vvvv

verify-etherscan-sepolia :;
	@forge verify-contract ${address} ${contract} --chain sepolia --verifier-url ${ETHERSCAN_SEPOLIA_URL} --etherscan-api-key ${ETHERSCAN_API_KEY}

verify-sepolia :;
	@forge verify-contract ${address} ${contract} --chain sepolia

interact-sepolia :;
	@echo "Interacting through $(contract)..."
	@forge script scripts/interactions/${contract}.s.sol:${contract} --ffi --rpc-url sepolia --private-key ${TESTNET_PRIVATE_KEY} --broadcast --legacy

# ================================== PRODUCTION ==================================

# ===========================
# 				 	River
# ===========================
deploy-river :;
	@echo "Deploying $(contract)..."
	@SAVE_DEPLOYMENTS=1 forge script scripts/deployments/$(if $(findstring facet,$(type)),facets/)${contract}.s.sol:${contract} --ledger --hd-paths "m/44'/60'/1'/0/0" --sender ${PRODUCTION_ADDRESS} --ffi --rpc-url river --verifier blockscout --verifier-url ${RIVERSCAN_URL} --broadcast --verify -vvvv

interact-river :;
	@echo "Interacting through $(contract)..."
	@forge script scripts/interactions/${contract}.s.sol:${contract} --ledger --hd-paths "m/44'/60'/1'/0/0" --sender ${PRODUCTION_ADDRESS} --ffi --rpc-url river --broadcast

# ===========================
# 				 		Base
# ===========================

deploy-base :;
	@echo "Deploying $(contract)..."
	@SAVE_DEPLOYMENTS=1 forge script scripts/deployments/$(if $(findstring facet,$(type)),facets/)${contract}.s.sol:${contract} --ledger --hd-paths "m/44'/60'/1'/0/0" --sender ${PRODUCTION_ADDRESS} --ffi --rpc-url base --verifier-url ${BASESCAN_URL} --etherscan-api-key ${BASESCAN_API_KEY} --broadcast --verify -vvvv

test-base :;
	@forge test --fork-url base --mc ${contract} -vvvv

interact-base :;
	@echo "Interacting through $(contract)..."
	@forge script scripts/interactions/${contract}.s.sol:${contract} --ledger --hd-paths "m/44'/60'/1'/0/0" --sender ${PRODUCTION_ADDRESS} --ffi --rpc-url base --broadcast

verify-base :;
	@forge verify-contract ${address} ${contract} --chain-id base --verifier-url ${BASESCAN_URL} -e ${BASESCAN_API_KEY}

verify-blockscout-base :;
	@forge verify-contract ${address} ${contract} --chain-id base --verifier blockscout --verifier-url ${BLOCKSCOUT_BASE_URL}

# ===========================
# 				Mainnet
# ===========================

deploy-mainnet :;
	@SAVE_DEPLOYMENTS=1 forge script scripts/deployments/$(if $(findstring facet,$(type)),facets/)${contract}.s.sol:${contract} --ledger --hd-paths "m/44'/60'/1'/0/0" --sender ${PRODUCTION_ADDRESS} --ffi --rpc-url mainnet --broadcast --verify --legacy -vvvv

verify-mainnet :;
	@forge verify-contract ${address} ${contract} --chain mainnet

test-mainnet :;
	@forge test --fork-url mainnet --mc ${contract} -vvvv
