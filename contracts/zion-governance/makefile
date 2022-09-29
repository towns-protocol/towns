-include .env

anvil :; anvil -m 'test test test test test test test test test test test junk'

# Contract deployment scripts
# Seperate build from script to avoid race inside forge where the linker wasn't fnisihing before the script started running
deploy-anvil :; 
	@forge build
	@forge script scripts/${contract}.s.sol:Deploy${contract} --rpc-url http://localhost:8545 --private-key ${LOCAL_PRIVATE_KEY} --broadcast

# Seperate build from script to avoid race inside forge where the linker wasn't fnisihing before the script started running
deploy-goerli :; 
	@forge build
	@forge script scripts/${contract}.s.sol:Deploy${contract} --rpc-url ${GOERLI_RPC_URL} --private-key ${GOERLI_PRIVATE_KEY} --broadcast --verify -vvvv

# Council NFT interaction scripts
read-anvil :; @cast call ${contractAddress} "${functionName}" --rpc-url http://localhost:8545 --private-key ${LOCAL_PRIVATE_KEY}

write-anvil :; @cast send ${contractAddress} "${functionName}" --rpc-url http://localhost:8545 --private-key ${LOCAL_PRIVATE_KEY}

# --------------- OLD Deployment scripts ----------------
deployLocalSpaceManager :; make deploy-anvil contract=ZionSpaceManager
deployLocalCouncilNFT :; make deploy-anvil contract=CouncilNFT

deployGoerliCouncilNFT :; make deploy-goerli contract=CouncilNFT
deployGoerliSpaceManager :; make deploy-goerli contract=ZionSpaceManager


startLocalWaitlist :; make write-anvil contractAddress=${contractAddress} functionName="startWaitlistMint()"

