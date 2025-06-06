import { ethers } from 'ethers'
import { SpaceDapp } from '@towns-protocol/web3'

import { config } from './environment'

export const spaceDapp = new SpaceDapp(
	config.web3Config.base,
	new ethers.providers.StaticJsonRpcProvider(config.baseChainRpcUrl),
)
