-include .env

anvil :; anvil -m 'test test test test test test test test test test test junk'

# Contract deployment scripts
deploy-anvil :; @forge script scripts/foundry/${contract}.s.sol:Deploy${contract} --rpc-url http://localhost:8545 --private-key ${LOCAL_PRIVATE_KEY} --broadcast

deploy-goerli :; @forge script scripts/foundry/${contract}.s.sol:Deploy${contract} --rpc-url ${RINKEBY_RPC_URL} --private-key ${RINKEBY_PRIVATE_KEY} --broadcast

# Council NFT interaction scripts
read-anvil :; @cast call ${contractAddress} "${functionName}" --rpc-url http://localhost:8545 --private-key ${LOCAL_PRIVATE_KEY}

write-anvil :; @cast send ${contractAddress} "${functionName}" --rpc-url http://localhost:8545 --private-key ${LOCAL_PRIVATE_KEY}

# --------------- OLD Deployment scripts ----------------
deployLocalSpaceManager :; make deploy-anvil contract=ZionSpaceManager

deployLocalCouncilNFT :; make deploy-anvil contract=CouncilNFT

startLocalWaitlist :; make write-anvil contractAddress=${contractAddress} functionName="startWaitlistMint()"
# make startLocalWaitlist contractAddress=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

