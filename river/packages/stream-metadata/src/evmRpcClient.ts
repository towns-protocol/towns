import { RiverRegistry } from '@river-build/web3'
import { ethers } from 'ethers'

import { config } from './environment'

let riverRegistry: ReturnType<typeof createRiverRegistry> | undefined

function createRiverRegistry() {
	const provider = new ethers.providers.StaticJsonRpcProvider(config.riverChainRpcUrl)
	return new RiverRegistry(config.web3Config.river, provider)
}

export function getRiverRegistry() {
	if (!riverRegistry) {
		riverRegistry = createRiverRegistry()
	}
	return riverRegistry
}
