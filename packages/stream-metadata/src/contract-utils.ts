import { ethers } from 'ethers'
import { ChainId, createReadApp, SpaceDapp } from '@towns-protocol/web3'

import { config } from './environment'

const readApp = createReadApp({
	chainId: config.web3Config.base.chainId as ChainId,
	url: config.baseChainRpcUrl,
	spaceFactoryAddress: config.web3Config.base.addresses.spaceFactory,
})

export const spaceDapp = new SpaceDapp(
	config.web3Config.base,
	new ethers.providers.StaticJsonRpcProvider(config.baseChainRpcUrl),
	readApp,
)
