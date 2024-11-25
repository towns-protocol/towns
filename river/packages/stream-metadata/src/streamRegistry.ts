import { BigNumber } from 'ethers'
import { FastifyBaseLogger } from 'fastify'
import { streamIdAsBytes } from '@river-build/sdk'

import { getRiverRegistry } from './evmRpcClient'

type CachedStreamData = {
	url: string
	lastMiniblockNum: BigNumber
	expiration: number
}

const cache: Record<string, CachedStreamData> = {}

// TODO: remove this entire file
export async function getNodeForStream(
	logger: FastifyBaseLogger,
	streamId: string,
): Promise<{ url: string; lastMiniblockNum: BigNumber }> {
	logger.info({ streamId }, 'find node for stream')

	const now = Date.now()
	const cachedData = cache[streamId]

	// Check if the cached data is still valid
	if (cachedData && cachedData.expiration > now) {
		return { url: cachedData.url, lastMiniblockNum: cachedData.lastMiniblockNum }
	}

	const riverRegistry = getRiverRegistry()
	const streamData = await riverRegistry.getStream(streamIdAsBytes(streamId))

	if (streamData.nodes.length === 0) {
		const error = new Error(`No nodes found for stream ${streamId}`)
		logger.error(
			{
				streamId,
				err: error,
			},
			'No nodes found for stream',
		)

		throw error
	}

	const lastMiniblockNum = streamData.lastMiniblockNum

	const randomIndex = Math.floor(Math.random() * streamData.nodes.length)
	const node = await riverRegistry.nodeRegistry.read.getNode(streamData.nodes[randomIndex])

	logger.info(
		{
			streamId,
			nodeUrl: node.url,
			lastMiniblockNum,
		},
		'connected to node',
	)

	// Cache the result with a 15-minute expiration
	cache[streamId] = {
		url: node.url,
		lastMiniblockNum,
		expiration: now + 15 * 60 * 1000, // 15 minutes in milliseconds
	}

	return { url: node.url, lastMiniblockNum }
}
