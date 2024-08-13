import { RiverRegistry } from '@river-build/web3'
import { ethers } from 'ethers'
import { Config } from './types'

let riverRegistry: ReturnType<typeof createRiverRegistry> | undefined

function createRiverRegistry(config: Config) {
	const provider = new ethers.providers.JsonRpcProvider(config.riverChainRpcUrl)
	const riverRegistry = new RiverRegistry(config.river, provider)

	if (!riverRegistry) {
		throw new Error('Failed to create river registry')
	}

	return riverRegistry
}

export function getRiverRegistry(config: Config) {
	if (!riverRegistry) {
		riverRegistry = createRiverRegistry(config)
	}
	return riverRegistry
}
