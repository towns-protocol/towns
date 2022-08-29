-include .env

anvil :; anvil -m 'test test test test test test test test test test test junk'

# Contract deployment scripts
deploy-anvil :; @forge script scripts/foundry/${contract}.s.sol:Deploy${contract} --rpc-url http://localhost:8545 --private-key ${PRIVATE_KEY} --broadcast

deploy-goerli :; @forge script scripts/foundry/${contract}.s.sol:Deploy${contract} --rpc-url ${RINKEBY_RPC_URL} --private-key ${RINKEBY_PRIVATE_KEY} --broadcast

# --------------- OLD Deployment scripts ----------------
deployLocalSpaceManager :; make deploy-anvil contract=ZionSpaceManager

deployLocalCouncilNFT :; make deploy-anvil contract=CouncilNFT
