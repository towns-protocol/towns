-include .env

.PHONY: all test clean deploy-base-anvil

all: clean install build

clean  :; forge clean

install:; forge install

update:; forge update

build:; forge build

test :; forge test --ffi --nmc Fork --fuzz-runs 4096

fork-test :; forge test --ffi --mc Fork

snapshot :; forge snapshot --isolate

format :; yarn prettier --write .

lint :; yarn solhint "{scripts,src,test}/**/*.sol"

anvil :; anvil -m 'test test test test test test test test test test test junk'

clear-anvil-deployments :;
	@rm -rf deployments/$(context)

# ================================== UTILITIES ==================================

help:
	@echo  'Local Deployments'
	@echo  '  deploy-any-local - deploys any contract to a local network using a local private key'
	@echo  '  interact-any-local - runs an interaction to a local network using a local private key'
	@echo  'Remote Deployments'
	@echo  '  deploy-any - deploys any contract to a remote network using a local private key'
	@echo  '  resume-any - resumes a transaction using a local private key'
	@echo  '  interact-any - runs an interaction to a remote network using a local private key'
	@echo  '  fork-any - runs an interaction to a forked remote network'
	@echo  '  verify-any - verifies a contract on a remote network'
	@echo  '  explicit-verify-any - explicitly verifies a contract on a remote network'
	@echo  'Remote Deployments with Ledger'
	@echo  '  deploy-any-ledger - deploys any contract to a remote network using a ledger wallet'
	@echo  '  resume-any-ledger - resumes a transaction using a ledger wallet'
	@echo  '  interact-any-ledger - runs an interaction to a remote network using a ledger wallet'
	@echo  ''

deploy-any-local :;
	@echo "Running $(contract) on local chain"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/deployments/${type}/${contract}.s.sol:${contract} \
	--ffi --rpc-url ${rpc} --private-key ${LOCAL_PRIVATE_KEY} --broadcast

interact-any-local :;
	@echo "Running $(contract) on local chain"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/interactions/${contract}.s.sol:${contract} \
	--ffi --rpc-url ${rpc} --private-key ${LOCAL_PRIVATE_KEY} --broadcast

fork-any-local :;
	@echo "Running $(contract) on a forked local network"
	@$(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/interactions/${contract}.s.sol:${contract} \
	--ffi --fork-url ${rpc} --private-key ${LOCAL_PRIVATE_KEY}

deploy-any :;
	@echo "Running $(contract) on remote network"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/deployments/${type}/${contract}.s.sol:${contract} \
	--ffi --rpc-url ${rpc} $(if $(private_key),--private-key ${private_key},$(if $(account),--account ${account})) \
	--broadcast --verify

deploy-any-blockscout :;
	@echo "Running $(contract) on remote network"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/deployments/${type}/${contract}.s.sol:${contract} \
	--ffi --rpc-url ${rpc} $(if $(private_key),--private-key ${private_key},$(if $(account),--account ${account})) \
	--broadcast --verify --verifier=blockscout --verifier-url=${verifier}

deploy-any-explicit :;
	@echo "Running $(contract) on remote network"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/deployments/${type}/${contract}.s.sol:${contract} \
	--ffi --rpc-url ${rpc} --private-key ${private_key} --broadcast --verify --verifier-url ${verifier} --etherscan-api-key ${api_key}

resume-any :;
	@$(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/deployments/${type}/${contract}.s.sol:${contract} \
	--ffi --rpc-url ${rpc} --private-key ${private_key} --verifier-url ${verifier} --etherscan-api-key ${etherscan} --verify --resume

interact-any :;
	@echo "Running $(contract) on remote network"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/interactions/${contract}.s.sol:${contract} \
	--ffi --rpc-url ${rpc} --private-key ${private_key} --broadcast --verify

interact-any-explicit :;
	@echo "Running $(contract) on remote network"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/interactions/${contract}.s.sol:${contract} \
	--ffi --rpc-url ${rpc} --private-key ${private_key} --broadcast --verifier-url ${verifier} --etherscan-api-key ${etherscan} --verify

interact-any-explicit-blockscout :;
	@echo "Running $(contract) on remote network"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/interactions/${contract}.s.sol:${contract} \
	--ffi --rpc-url ${rpc} --private-key ${private_key} --broadcast --verifier-url ${verifier} --verifier=blockscout --verify

interact-resume-any-explicit :;
	@echo "Running $(contract) on remote network"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/interactions/${contract}.s.sol:${contract} \
	--ffi --rpc-url ${rpc} --private-key ${private_key} --broadcast --verifier-url ${verifier} --etherscan-api-key ${etherscan} --verify --resume

fork-any :;
	@echo "Running $(contract) on a forked remote network"
	@$(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/interactions/${contract}.s.sol:${contract} \
	--ffi --fork-url ${rpc} --private-key ${private_key} -vvvv

verify-any :;
	@echo "Verifying $(contract) on a remote network"
	@forge verify-contract ${address} ${contract}	--rpc-url ${rpc}

explicit-verify-any :;
	@echo "Verifying $(contract) on a remote network"
	@forge verify-contract ${address} ${contract} --verifier-url ${verifier} --etherscan-api-key ${etherscan}

deploy-any-local-ledger :;
	@echo "Running $(contract) on local chain"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/deployments/${type}/${contract}.s.sol:${contract} \
	--ledger --hd-paths ${hd_path} --sender ${sender} \
	--ffi --rpc-url ${rpc} --broadcast

deploy-any-ledger :;
	@echo "Running $(contract) on remote network"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/deployments/${type}/${contract}.s.sol:${contract} \
	--ledger --hd-paths ${hd_path} --sender ${sender} \
	--ffi --rpc-url ${rpc} --broadcast --verify --verifier=blockscout --verifier-url=${verifier} --etherscan-api-key ${etherscan}

resume-any-ledger :;
	@forge script scripts/deployments/${type}/${contract}.s.sol:${contract} \
	--ledger --hd-paths ${hd_path} \
	--ffi --rpc-url ${rpc} --broadcast --verifier-url ${verifier} --etherscan-api-key ${etherscan} --verify --resume

interact-any-ledger :;
	@echo "Running $(contract) on remote network"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/interactions/${contract}.s.sol:${contract} \
	--ledger --hd-paths ${hd_path} --sender ${sender} \
	--ffi --rpc-url ${rpc} --broadcast



# ================================== LOCAL ==================================

# ===========================
# 				Base Anvil
# ===========================
deploy-base-anvil :;
	@$(MAKE) deploy-any-local context=local_multi rpc=base_anvil

# THIS IS FOR TESTING ONLY
deploy-base-anvil-ledger :;
	@$(MAKE) deploy-any-local-ledger context=local_multi rpc=base_anvil hd_path=${HD_PATH} sender=${SENDER_ADDRESS}

interact-base-anvil :;
	@$(MAKE) interact-any-local context=local_multi rpc=base_anvil

fork-base-anvil :;
	@$(MAKE) fork-any-local context=local_multi rpc=base_anvil

# ===========================
# 				River Anvil
# ===========================
deploy-river-anvil:
	@$(MAKE) deploy-any-local rpc=river_anvil

interact-river-anvil :;
	@$(MAKE) interact-any-local rpc=river_anvil

# ================================== TESTNETS ==================================

# ===========================
# 			River Testnet
# ===========================
deploy-river-testnet :;
	@$(MAKE) deploy-any rpc=river_devnet private_key=${TESTNET_PRIVATE_KEY} verifier=${RIVERSCAN_DEVNET_URL}

interact-river-testnet :;
	@$(MAKE) interact-any rpc=river_devnet private_key=${TESTNET_PRIVATE_KEY}

fork-river-testnet :;
	@$(MAKE) fork-any rpc=river_devnet private_key=${TESTNET_PRIVATE_KEY}

verify-river-testnet :;
	@$(MAKE) verify-any rpc=river_devnet

# ===========================
# 				 Base Sepolia
# ===========================
deploy-ledger-base-sepolia :;
	@$(MAKE) deploy-any-ledger rpc=base_sepolia hd_path=${HD_PATH} sender=${SENDER_ADDRESS} verifier=${BLOCKSCOUT_SEPOLIA_URL} etherscan=${BLOCKSCOUT_SEPOLIA_API_KEY}
	@$(MAKE) resume-any-ledger rpc=base_sepolia hd_path=${HD_PATH} sender=${SENDER_ADDRESS} verifier=${BASESCAN_SEPOLIA_URL} etherscan=${BASESCAN_API_KEY}

deploy-base-sepolia :;
	@$(MAKE) deploy-any-blockscout rpc=base_sepolia private_key=${TESTNET_PRIVATE_KEY} verifier=${BLOCKSCOUT_SEPOLIA_URL}
	@$(MAKE) resume-any rpc=base_sepolia private_key=${TESTNET_PRIVATE_KEY} verifier=${BASESCAN_SEPOLIA_URL} etherscan=${BASESCAN_API_KEY}

interact-base-sepolia :;
	@$(MAKE) interact-any rpc=base_sepolia private_key=${TESTNET_PRIVATE_KEY}

fork-base-sepolia :;
	@$(MAKE) fork-any rpc=base_sepolia private_key=${TESTNET_PRIVATE_KEY}

verify-base-sepolia :;
	@$(MAKE) verify-any rpc=base_sepolia
	@$(MAKE) explicit-verify-any rpc=base_sepolia verifier=${BASESCAN_SEPOLIA_URL} etherscan=${BASESCAN_API_KEY}

# ===========================
# 				Sepolia
# ===========================

deploy-sepolia :;
	@$(MAKE) deploy-any rpc=sepolia private_key=${TESTNET_PRIVATE_KEY}

interact-sepolia :;
	@$(MAKE) interact-any rpc=sepolia private_key=${TESTNET_PRIVATE_KEY}

fork-sepolia :;
	@$(MAKE) fork-any rpc=sepolia private_key=${TESTNET_PRIVATE_KEY}

verify-sepolia :;
	@$(MAKE) verify-any rpc=sepolia

# ================================== PRODUCTION ==================================


# ===========================
# 				 	River
# ===========================
deploy-river :;
	@$(MAKE) deploy-any-ledger rpc=river hd_path=${HD_PATH} sender=${SENDER_ADDRESS} verifier=${RIVERSCAN_URL} etherscan=${RIVERSCAN_API_KEY}

interact-river :;
	@$(MAKE) interact-any-ledger rpc=river hd_path=${HD_PATH} sender=${SENDER_ADDRESS}

# ===========================
# 				 		Base
# ===========================
deploy-base :;
	@$(MAKE) deploy-any-ledger rpc=base hd_path=${HD_PATH} sender=${SENDER_ADDRESS} verifier=${BLOCKSCOUT_BASE_URL}
	@$(MAKE) resume-any-ledger rpc=base hd_path=${HD_PATH} sender=${SENDER_ADDRESS} verifier=${BASESCAN_URL} etherscan=${BASESCAN_API_KEY}

interact-base :;
	@$(MAKE) interact-any-ledger rpc=base hd_path=${HD_PATH} sender=${SENDER_ADDRESS}

fork-base :;
	@$(MAKE) fork-any rpc=base private_key=${TESTNET_PRIVATE_KEY}

verify-base :;
	@$(MAKE) verify-any rpc=base
	@$(MAKE) explicit-verify-any rpc=base verifier=${BLOCKSCOUT_BASE_URL} etherscan=${BLOCKSCOUT_BASE_API_KEY}

# ===========================
# 				Mainnet
# ===========================
deploy-mainnet :;
	@$(MAKE) deploy-any-ledger rpc=mainnet hd_path=${HD_PATH} sender=${SENDER_ADDRESS}

interact-mainnet :;
	@$(MAKE) interact-any-ledger rpc=mainnet hd_path=${HD_PATH} sender=${SENDER_ADDRESS}

fork-mainnet :;
	@$(MAKE) fork-any rpc=mainnet private_key=${TESTNET_PRIVATE_KEY}

verify-mainnet :;
	@$(MAKE) verify-any rpc=mainnet
	@$(MAKE) explicit-verify-any rpc=mainnet verifier=${BASESCAN_URL} etherscan=${BASESCAN_API_KEY}


# ================================== ENVIRONMENTS ==================================

# ===========================
# 				ALPHA
# ===========================

deploy-alpha-base-anvil:;
	@$(MAKE) deploy-any-local context=alpha rpc=base_anvil

deploy-alpha-sepolia :;
	@$(MAKE) deploy-any context=alpha rpc=sepolia private_key=${TESTNET_PRIVATE_KEY}

deploy-alpha-base-sepolia :;
	@$(MAKE) deploy-any-blockscout context=alpha rpc=base_sepolia private_key=${TESTNET_PRIVATE_KEY} verifier=${BLOCKSCOUT_SEPOLIA_URL} etherscan=${BLOCKSCOUT_SEPOLIA_API_KEY}
	@$(MAKE) resume-any rpc=base_sepolia private_key=${TESTNET_PRIVATE_KEY} verifier=${BASESCAN_SEPOLIA_URL} etherscan=${BASESCAN_API_KEY}

interact-alpha-base-sepolia :;
	@$(MAKE) interact-any context=alpha rpc=base_sepolia private_key=${TESTNET_PRIVATE_KEY}

deploy-alpha-river-testnet :;
	@$(MAKE) deploy-any context=alpha rpc=river_devnet private_key=${TESTNET_PRIVATE_KEY}

fork-alpha-base-sepolia :;
	@$(MAKE) fork-any context=alpha rpc=base_sepolia private_key=${TESTNET_PRIVATE_KEY}

# ===========================
# 				OMEGA
# ===========================

deploy-omega-base :;
	@$(MAKE) deploy-any-ledger context=omega rpc=base hd_path=${HD_PATH} sender=${SENDER_ADDRESS}
	@$(MAKE) resume-any-ledger context=omega rpc=base hd_path=${HD_PATH} sender=${SENDER_ADDRESS} verifier=${BASESCAN_URL} etherscan=${BASESCAN_API_KEY}

deploy-omega-mainnet :;
	@$(MAKE) deploy-any-ledger context=omega rpc=mainnet hd_path=${HD_PATH} sender=${SENDER_ADDRESS} verifier=${ETHERSCAN_URL} etherscan=${ETHERSCAN_API_KEY}
