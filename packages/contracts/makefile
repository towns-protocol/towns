-include .env

.PHONY: all test clean deploy-base-anvil

all: clean build

clean :; forge clean

update :; forge update

build :; forge build

test :; forge test --ffi --nmc Fork --fuzz-runs 4096

fork-test :; forge test --ffi --mc Fork

snapshot :; forge snapshot --isolate

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
	@echo  'Network Targets'
	@echo  '  deploy-<network> - deploy to a specific network'
	@echo  '  interact-<network> - interact with a specific network'
	@echo  '  verify-<network> - verify on a specific network'
	@echo  ''

# ================================== GENERIC TARGETS ==================================

# === Local network targets ===
# The `--slow` flag solves race conditions caused by fluctuations in the local fee market.
deploy-any-local :;
	@echo "Running $(contract) on local chain"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/deployments/${type}/${contract}.s.sol:${contract} \
	--ffi --rpc-url ${rpc} --private-key ${LOCAL_PRIVATE_KEY} --broadcast --slow

deploy-facet-local :;
	@echo "Deploying $(contract) on local chain"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	CONTRACT_NAME=$(contract) \
	forge script scripts/common/DeployFacet.s.sol \
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

# === Remote network targets with private key ===
deploy-any :;
	@echo "Running $(contract) on remote network"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/deployments/${type}/${contract}.s.sol:${contract} \
	--ffi --rpc-url ${rpc} --broadcast --verify \
	$(if $(private_key),--private-key ${private_key},$(if $(account),--account ${account})) \
	$(if $(password),--password ${password},) \
	$(if $(sender),--sender ${sender},) \
	$(if $(verifier),--verifier $(verifier),) \
	$(if $(verifier-url),--verifier-url $(verifier-url),) \
	$(if $(etherscan),--etherscan-api-key $(etherscan),)

deploy-facet :;
	@echo "Deploying $(contract) on remote network"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	CONTRACT_NAME=$(contract) \
	forge script scripts/common/DeployFacet.s.sol \
	--ffi --rpc-url ${rpc} --broadcast --verify \
	$(if $(private_key),--private-key ${private_key},$(if $(account),--account ${account})) \
	$(if $(password),--password ${password},) \
	$(if $(sender),--sender ${sender},) \
	$(if $(verifier),--verifier $(verifier),) \
	$(if $(verifier-url),--verifier-url $(verifier-url),) \
	$(if $(etherscan),--etherscan-api-key $(etherscan),)

resume-any :;
	@$(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/deployments/${type}/${contract}.s.sol:${contract} \
	--ffi --rpc-url ${rpc} --resume --verify \
	$(if $(private_key),--private-key ${private_key},$(if $(account),--account ${account})) \
	$(if $(verifier),--verifier $(verifier),) \
	$(if $(verifier-url),--verifier-url $(verifier-url),) \
	$(if $(etherscan),--etherscan-api-key $(etherscan),) \
	$(if $(args),${args},)

resume-facet :;
	@$(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	CONTRACT_NAME=$(contract) \
	forge script scripts/common/DeployFacet.s.sol \
	--ffi --rpc-url ${rpc} --resume --verify \
	$(if $(private_key),--private-key ${private_key},$(if $(account),--account ${account})) \
	$(if $(verifier),--verifier $(verifier),) \
	$(if $(verifier-url),--verifier-url $(verifier-url),) \
	$(if $(etherscan),--etherscan-api-key $(etherscan),) \
	$(if $(args),${args},)

interact-any :;
	@echo "Running $(contract) on remote network"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/interactions/${contract}.s.sol:${contract} \
	--ffi --rpc-url ${rpc} --broadcast --verify \
	$(if $(private_key),--private-key ${private_key},$(if $(account),--account ${account})) \
	$(if $(password),--password ${password},) \
	$(if $(sender),--sender ${sender},) \
	$(if $(verifier),--verifier $(verifier),) \
	$(if $(verifier-url),--verifier-url $(verifier-url),) \
	$(if $(etherscan),--etherscan-api-key $(etherscan),) \
	$(if $(gas_limit),--gas-limit ${gas_limit},) \
	$(if $(args),${args},)

interact-any-explicit-blockscout :;
	@$(MAKE) interact-any verifier=blockscout

interact-resume-any-explicit :;
	@$(MAKE) interact-any args="--resume"

fork-any :;
	@echo "Running $(contract) on a forked remote network"
	@$(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/interactions/${contract}.s.sol:${contract} \
	--ffi --fork-url ${rpc} --private-key ${private_key} -vvvv

verify-any :;
	@echo "Verifying $(contract) on a remote network"
	@forge verify-contract ${address} ${contract} --rpc-url ${rpc}

explicit-verify-any :;
	@echo "Verifying $(contract) on a remote network"
	@forge verify-contract ${address} ${contract} --verifier ${verifier} --verifier-url ${verifier-url} ${args}

verify-on-blockscout :;
	@$(MAKE) explicit-verify-any verifier=blockscout verifier-url=$(blockscout_url) args="$(if $(blockscout_key),--etherscan-api-key $(blockscout_key),)"

verify-on-etherscan :;
	@$(MAKE) explicit-verify-any verifier=etherscan verifier-url=$(etherscan_url) args="--etherscan-api-key $(ETHERSCAN_API_KEY)"

# ===========================
# 					Ledger
# ===========================

# Helper function to ensure HD path has proper quoting when calling nested make commands
define format_hd_path
"$(subst ",,$(1))"
endef

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
	--ffi --rpc-url ${rpc} --broadcast --verify \
	$(if $(verifier),--verifier $(verifier),) \
	$(if $(verifier-url),--verifier-url $(verifier-url),) \
	$(if $(etherscan),--etherscan-api-key $(etherscan),)

deploy-facet-ledger :;
	@echo "Deploying $(contract) on remote network"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	CONTRACT_NAME=$(contract) \
	forge script scripts/common/DeployFacet.s.sol \
	--ledger --hd-paths ${hd_path} --sender ${sender} \
	--ffi --rpc-url ${rpc} --broadcast --verify \
	$(if $(verifier),--verifier $(verifier),) \
	$(if $(verifier-url),--verifier-url $(verifier-url),) \
	$(if $(etherscan),--etherscan-api-key $(etherscan),)

deploy-verify-both :;
	@$(MAKE) deploy-any rpc=$(rpc) private_key=$(private_key) \
	verifier=blockscout verifier-url=$(blockscout_url) etherscan=$(blockscout_key)
	@$(MAKE) resume-any rpc=$(rpc) private_key=$(private_key) \
	verifier-url=$(etherscan_url) etherscan=$(etherscan_key)

deploy-ledger-verify-both :;
	@$(MAKE) deploy-any-ledger rpc=$(rpc) hd_path=$(call format_hd_path,$(hd_path)) sender=$(sender) \
	verifier=blockscout verifier-url=$(blockscout_url) etherscan=$(blockscout_key)
	@$(MAKE) resume-any-ledger rpc=$(rpc) hd_path=$(call format_hd_path,$(hd_path)) sender=$(sender) \
	verifier=etherscan verifier-url=$(etherscan_url) etherscan=$(etherscan_key)

deploy-facet-ledger-verify-both :;
	@$(MAKE) deploy-facet-ledger rpc=$(rpc) hd_path=$(call format_hd_path,$(HD_PATH)) sender=$(SENDER_ADDRESS) \
	verifier=blockscout verifier-url=$(blockscout_url) etherscan=$(blockscout_key)
	@$(MAKE) resume-facet-ledger rpc=$(rpc) hd_path=$(call format_hd_path,$(HD_PATH)) sender=$(SENDER_ADDRESS) \
	verifier=etherscan verifier-url=$(etherscan_url) etherscan=$(etherscan_key)

resume-any-ledger :;
	@forge script scripts/deployments/${type}/${contract}.s.sol:${contract} \
	--ledger --hd-paths ${hd_path} --sender ${sender} \
	--ffi --rpc-url ${rpc} --broadcast --verify --resume \
	$(if $(verifier),--verifier $(verifier),) \
	$(if $(verifier-url),--verifier-url $(verifier-url),) \
	$(if $(etherscan),--etherscan-api-key $(etherscan),)

resume-facet-ledger :;
	@CONTRACT_NAME=$(contract) \
	forge script scripts/common/DeployFacet.s.sol \
	--ledger --hd-paths ${hd_path} --sender ${sender} \
	--ffi --rpc-url ${rpc} --broadcast --verify --resume \
	$(if $(verifier),--verifier $(verifier),) \
	$(if $(verifier-url),--verifier-url $(verifier-url),) \
	$(if $(etherscan),--etherscan-api-key $(etherscan),)

interact-any-ledger :;
	@echo "Running $(contract) on remote network"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/interactions/${contract}.s.sol:${contract} \
	--ledger --hd-paths ${hd_path} --sender ${sender} \
	--ffi --rpc-url ${rpc} --broadcast $(if $(verifier),--verifier $(verifier),) \
	$(if $(verifier-url),--verifier-url $(verifier-url),) $(if $(etherscan),--etherscan-api-key $(etherscan),) \
	$(if $(args),${args},)

# ================================== LOCAL ==================================

# ===========================
# 				Base Anvil
# ===========================
deploy-base-anvil :;
	@$(MAKE) deploy-any-local context=local_multi rpc=base_anvil

# THIS IS FOR TESTING ONLY
deploy-base-anvil-ledger :;
	@$(MAKE) deploy-any-local-ledger context=local_multi rpc=base_anvil hd_path=$(call format_hd_path,$(HD_PATH)) sender=${SENDER_ADDRESS}

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

deploy-ledger-river-testnet :;
	@$(MAKE) deploy-any-ledger rpc=river_devnet hd_path=$(call format_hd_path,$(HD_PATH)) sender=${SENDER_ADDRESS} verifier=blockscout verifier-url=${RIVERSCAN_DEVNET_URL}

deploy-river-testnet :;
	@$(MAKE) deploy-any rpc=river_devnet private_key=${TESTNET_PRIVATE_KEY} verifier=blockscout verifier-url=${RIVERSCAN_DEVNET_URL}

interact-river-testnet :;
	@$(MAKE) interact-any rpc=river_devnet private_key=${TESTNET_PRIVATE_KEY}

fork-river-testnet :;
	@$(MAKE) fork-any rpc=river_devnet private_key=${TESTNET_PRIVATE_KEY}

verify-river-testnet :;
	@$(MAKE) verify-on-blockscout rpc=river_devnet blockscout_url=${RIVERSCAN_DEVNET_URL}

# ===========================
# 				 Base Sepolia
# ===========================

deploy-ledger-base-sepolia :;
	@$(MAKE) deploy-ledger-verify-both rpc=base_sepolia hd_path=$(call format_hd_path,$(HD_PATH)) sender=${SENDER_ADDRESS} \
		blockscout_url=${BLOCKSCOUT_SEPOLIA_URL} blockscout_key=${BLOCKSCOUT_SEPOLIA_API_KEY} \
		etherscan_url=${BASESCAN_SEPOLIA_URL} etherscan_key=${ETHERSCAN_API_KEY}

deploy-base-sepolia :;
	@$(MAKE) deploy-verify-both rpc=base_sepolia private_key=${TESTNET_PRIVATE_KEY} \
		blockscout_url=${BLOCKSCOUT_SEPOLIA_URL} blockscout_key=${BLOCKSCOUT_SEPOLIA_API_KEY} \
		etherscan_url=${BASESCAN_SEPOLIA_URL} etherscan_key=${ETHERSCAN_API_KEY}

interact-base-sepolia :;
	@$(MAKE) interact-any rpc=base_sepolia private_key=${TESTNET_PRIVATE_KEY}

fork-base-sepolia :;
	@$(MAKE) fork-any rpc=base_sepolia private_key=${TESTNET_PRIVATE_KEY}

verify-base-sepolia :;
	@$(MAKE) verify-on-blockscout rpc=base_sepolia blockscout_url=${BLOCKSCOUT_SEPOLIA_URL} blockscout_key=${BLOCKSCOUT_SEPOLIA_API_KEY}
	@$(MAKE) verify-on-etherscan rpc=base_sepolia etherscan_url=${BASESCAN_SEPOLIA_URL}

# ===========================
# 				Sepolia
# ===========================

deploy-sepolia :;
	@$(MAKE) deploy-any rpc=sepolia private_key=${TESTNET_PRIVATE_KEY}

deploy-sepolia-ledger :;
	@$(MAKE) deploy-any-ledger rpc=sepolia hd_path=$(call format_hd_path,$(HD_PATH)) sender=${SENDER_ADDRESS}

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
	@$(MAKE) deploy-any-ledger rpc=river hd_path=$(call format_hd_path,$(HD_PATH)) sender=${SENDER_ADDRESS} verifier=blockscout verifier-url=${RIVERSCAN_URL}

interact-river :;
	@$(MAKE) interact-any-ledger rpc=river hd_path=$(call format_hd_path,$(HD_PATH)) sender=${SENDER_ADDRESS}

# ===========================
# 				 		Base
# ===========================
deploy-base :;
	@$(MAKE) deploy-ledger-verify-both rpc=base hd_path=$(call format_hd_path,$(HD_PATH)) sender=${SENDER_ADDRESS} \
		blockscout_url=${BLOCKSCOUT_BASE_URL} blockscout_key=${BLOCKSCOUT_BASE_API_KEY} \
		etherscan_url=${BASESCAN_URL} etherscan_key=${ETHERSCAN_API_KEY}

interact-base :;
	@$(MAKE) interact-any-ledger rpc=base hd_path=$(call format_hd_path,$(HD_PATH)) sender=${SENDER_ADDRESS}

fork-base :;
	@$(MAKE) fork-any rpc=base private_key=${TESTNET_PRIVATE_KEY}

verify-base :;
	@$(MAKE) verify-on-blockscout rpc=base blockscout_url=${BLOCKSCOUT_BASE_URL} blockscout_key=${BLOCKSCOUT_BASE_API_KEY}
	@$(MAKE) verify-on-etherscan rpc=base etherscan_url=${BASESCAN_URL}

# ===========================
# 				Mainnet
# ===========================
deploy-mainnet :;
	@$(MAKE) deploy-any-ledger rpc=mainnet hd_path=$(call format_hd_path,$(HD_PATH)) sender=${SENDER_ADDRESS}

interact-mainnet :;
	@$(MAKE) interact-any-ledger rpc=mainnet hd_path=$(call format_hd_path,$(HD_PATH)) sender=${SENDER_ADDRESS}

fork-mainnet :;
	@$(MAKE) fork-any rpc=mainnet private_key=${TESTNET_PRIVATE_KEY}

verify-mainnet :;
	@$(MAKE) verify-any rpc=mainnet
	@$(MAKE) verify-on-etherscan rpc=mainnet etherscan_url=${ETHERSCAN_URL}


# ================================== ENVIRONMENTS ==================================

# ===========================
# 				ALPHA
# ===========================

deploy-alpha-base-anvil:;
	@$(MAKE) deploy-any-local context=alpha rpc=base_anvil

deploy-alpha-sepolia :;
	@$(MAKE) deploy-sepolia context=alpha

deploy-alpha-base-sepolia :;
	@$(MAKE) deploy-base-sepolia context=alpha

interact-alpha-base-sepolia :;
	@$(MAKE) interact-base-sepolia context=alpha

deploy-alpha-river-testnet :;
	@$(MAKE) deploy-river-testnet context=alpha

fork-alpha-base-sepolia :;
	@$(MAKE) fork-base-sepolia context=alpha

# ===========================
# 				OMEGA
# ===========================

deploy-omega-base :;
	@$(MAKE) deploy-base context=omega

deploy-omega-mainnet :;
	@$(MAKE) deploy-mainnet context=omega verifier=etherscan verifier-url=${ETHERSCAN_URL} etherscan=${ETHERSCAN_API_KEY}

#*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
#*                      DEPLOYMENTS V2                        */
#*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

deploy-any-wallet :;
	@echo "Running $(contract) on remote network"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/deployments/${type}/${contract}.s.sol:${contract} --ffi \
	--ledger --hd-paths ${hd_path} --sender ${sender} \
	--rpc-url ${rpc} --broadcast --verify --verifier-url ${verifier-url} --verifier ${verifier} ${args}

deploy-any-account :;
	@echo "Running $(contract) on remote network"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/deployments/${type}/${contract}.s.sol:${contract} --ffi \
	--account ${account} --password ${password} --sender ${sender} \
	--rpc-url ${rpc} --broadcast --verify --verifier-url ${verifier-url} --verifier ${verifier} ${args}

fork-any-account :;
	@echo "Running $(contract) on a forked remote network"
	@$(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/interactions/${contract}.s.sol:${contract} \
	--ffi --fork-url ${rpc} --account ${account} --password ${password} --sender ${sender} -vvvv

interact-any-account :;
	@echo "Running $(contract) on remote network"
	@SAVE_DEPLOYMENTS=1 $(if $(context),DEPLOYMENT_CONTEXT=$(context)) \
	forge script scripts/interactions/${contract}.s.sol:${contract} --ffi \
	--account ${account} --password ${password} --sender ${sender} \
	--rpc-url ${rpc} --broadcast --verify --verifier-url ${verifier-url} --verifier ${verifier} ${args}

deploy-base-sepolia-with-account :;
	@$(MAKE) deploy-any-account rpc=base_sepolia verifier=etherscan verifier-url=${BASESCAN_SEPOLIA_URL} args="--etherscan-api-key ${ETHERSCAN_API_KEY}"
	@$(MAKE) deploy-any-account rpc=base_sepolia verifier=blockscout verifier-url=${BLOCKSCOUT_SEPOLIA_URL} args="--resume"
