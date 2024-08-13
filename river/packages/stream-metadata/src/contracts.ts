import { Address } from './types'
import NodeRegistryAbi from '@river-build/generated/dev/abis/NodeRegistry.abi'
import StreamRegistryAbi from '@river-build/generated/dev/abis/StreamRegistry.abi'
import { config } from './environment'

export function getNodeRegistryAbi() {
	return NodeRegistryAbi
}

export function getStreamRegistryAbi() {
	return StreamRegistryAbi
}

export function getAddress(): Address {
	if (!config.river.addresses.riverRegistry) {
		throw new Error(`no riverRegistry address`)
	}
	return config.river.addresses.riverRegistry as Address
}
