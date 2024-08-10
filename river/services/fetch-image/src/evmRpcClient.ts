import { config } from './environment'
import { createPublicClient, http } from 'viem'
import { riverChainDevnet, riverChainLocalhost, riverChainProduction } from './evmChainConfig'

const publicClient: Record<number, ReturnType<typeof createPublicClientFromChainId>> = {}

function createPublicClientFromChainId(chainId: number) {
	let riverChainUrl: string

	switch (chainId) {
		case 550:
			riverChainUrl = riverChainProduction.rpcUrls.default.http[0]
			return createPublicClient({
				chain: riverChainProduction,
				transport: http(riverChainUrl),
			})
		case 6524490:
			riverChainUrl = riverChainDevnet.rpcUrls.default.http[0]
			return createPublicClient({
				chain: riverChainDevnet,
				transport: http(riverChainUrl),
			})
		case 31338:
			riverChainUrl = riverChainLocalhost.rpcUrls.default.http[0]
			return createPublicClient({
				chain: riverChainLocalhost,
				transport: http(riverChainUrl),
			})
		default:
			console.error(`Unsupported chain ID: ${chainId}`)
			throw new Error(`Unsupported chain ${chainId}`)
	}
}

export function getPublicClient() {
	const chainId = config.chainId
	if (!chainId) {
		throw new Error('cannot create evm rpc client because no chainId was configured')
	}
	if (!publicClient[chainId]) {
		publicClient[chainId] = createPublicClientFromChainId(chainId)
	}
	return publicClient[chainId]
}
