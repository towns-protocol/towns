import { getAddress, getNodeRegistryAbi, getStreamRegistryAbi } from './contracts'

import { StreamIdHex } from './types'
import { getContract } from 'viem'
import { getPublicClient } from './evmRpcClient'

type CachedStreamData = {
	url: string
	lastMiniblockNum: bigint
	expiration: number
}

const cache: Record<string, CachedStreamData> = {}

export async function getNodeForStream(
	streamId: StreamIdHex,
): Promise<{ url: string; lastMiniblockNum: bigint }> {
	console.log('getNodeForStream', streamId)

	const now = Date.now()
	const cachedData = cache[streamId]

	// Check if the cached data is still valid
	if (cachedData && cachedData.expiration > now) {
		return { url: cachedData.url, lastMiniblockNum: cachedData.lastMiniblockNum }
	}

	const riverRegistry = getAddress()
	if (!riverRegistry) {
		console.error('Registry address not found')
		throw new Error(`Registry address not found`)
	}

	console.log('streamId', streamId, 'riverRegistryAddress', riverRegistry)

	const streamRegistry = getContract({
		address: riverRegistry,
		abi: getStreamRegistryAbi(),
		publicClient: getPublicClient(),
	})

	const nodeRegistry = getContract({
		address: riverRegistry,
		abi: getNodeRegistryAbi(),
		publicClient: getPublicClient(),
	})

	const streamData = await streamRegistry.read.getStream([streamId])

	if (streamData.nodes.length === 0) {
		console.error(`No nodes found for stream ${streamId}`)
		throw new Error(`No nodes found for stream ${streamId}`)
	}

	const lastMiniblockNum = streamData.lastMiniblockNum

	const randomIndex = Math.floor(Math.random() * streamData.nodes.length)
	const node = await nodeRegistry.read.getNode([streamData.nodes[randomIndex]])

	console.log(`connected to node=${node.url}; lastMiniblockNum=${lastMiniblockNum}`)

	// Cache the result with a 15-minute expiration
	cache[streamId] = {
		url: node.url,
		lastMiniblockNum,
		expiration: now + 15 * 60 * 1000, // 15 minutes in milliseconds
	}

	return { url: node.url, lastMiniblockNum }
}
