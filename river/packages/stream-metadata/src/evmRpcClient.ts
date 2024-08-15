import { RiverRegistry } from '@river-build/web3'
import { ethers } from 'ethers'

import { Config } from './environment'

let riverRegistry: ReturnType<typeof createRiverRegistry> | undefined

function createRiverRegistry(config: Config) {
	const provider = new ethers.providers.JsonRpcProvider(config.riverChainRpcUrl)
	const rvrRegistry = new RiverRegistry(config.web3Config.river, provider)

	if (!rvrRegistry) {
		throw new Error('Failed to create river registry')
	}

	return rvrRegistry
}

export function getRiverRegistry(config: Config) {
	if (!riverRegistry) {
		riverRegistry = createRiverRegistry(config)
	}
	return riverRegistry
}
