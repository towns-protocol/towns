import { ConnectTransportOptions, createConnectTransport } from '@connectrpc/connect-web'
import {
	ParsedStreamResponse,
	StreamStateView,
	decryptAESGCM,
	streamIdAsBytes,
	streamIdAsString,
	unpackStream,
} from '@river-build/sdk'
import { PromiseClient, createPromiseClient } from '@connectrpc/connect'
import { StreamService } from '@river-build/proto'
import { filetypemime } from 'magic-bytes.js'
import { FastifyBaseLogger } from 'fastify'

import { MediaContent, StreamIdHex } from './types'
import { getNodeForStream } from './streamRegistry'
import { getFunctionLogger } from './logger'

const clients = new Map<string, StreamRpcClient>()

const contentCache: Record<string, MediaContent | undefined> = {}

export type StreamRpcClient = PromiseClient<typeof StreamService> & { url?: string }

function makeStreamRpcClient(log: FastifyBaseLogger, url: string): StreamRpcClient {
	const logger = getFunctionLogger(log, 'makeStreamRpcClient')
	logger.info({ url }, 'Connecting')

	const options: ConnectTransportOptions = {
		baseUrl: url,
	}

	const transport = createConnectTransport(options)
	const client: StreamRpcClient = createPromiseClient(StreamService, transport)
	client.url = url
	return client
}

async function getStreamClient(log: FastifyBaseLogger, streamId: `0x${string}`) {
	const logger = getFunctionLogger(log, 'getStreamClient')
	const node = await getNodeForStream(logger, streamId)
	let url = node?.url
	if (!clients.has(url)) {
		const client = makeStreamRpcClient(logger, url)
		clients.set(client.url!, client)
		url = client.url!
	}
	logger.info({ url }, 'client connected to node')

	const client = clients.get(url)
	if (!client) {
		throw new Error(`Failed to get client for url ${url}`)
	}

	return { client, lastMiniblockNum: node.lastMiniblockNum }
}

function streamViewFromUnpackedResponse(
	streamId: string | Uint8Array,
	unpackedResponse: ParsedStreamResponse,
): StreamStateView {
	const streamView = new StreamStateView('userId', streamIdAsString(streamId))
	streamView.initialize(
		unpackedResponse.streamAndCookie.nextSyncCookie,
		unpackedResponse.streamAndCookie.events,
		unpackedResponse.snapshot,
		unpackedResponse.streamAndCookie.miniblocks,
		[],
		unpackedResponse.prevSnapshotMiniblockNum,
		undefined,
		[],
		undefined,
	)
	return streamView
}

async function mediaContentFromStreamView(
	log: FastifyBaseLogger,
	streamView: StreamStateView,
	secret: Uint8Array,
	iv: Uint8Array,
): Promise<MediaContent> {
	const logger = getFunctionLogger(log, 'mediaContentFromStreamView')
	const mediaInfo = streamView.mediaContent.info
	if (!mediaInfo) {
		logger.error(
			{
				spaceId: streamView.streamId,
				mediaStreamId: streamView.mediaContent.streamId,
			},
			'No media information found',
		)
		throw new Error('No media information found')
	}

	logger.info(
		{
			spaceId: mediaInfo.spaceId,
			mediaStreamId: streamView.mediaContent.streamId,
		},
		'mediaContentFromStreamView',
	)

	// Aggregate data chunks into a single Uint8Array
	const data = new Uint8Array(
		mediaInfo.chunks.reduce((totalLength, chunk) => totalLength + chunk.length, 0),
	)
	let offset = 0
	mediaInfo.chunks.forEach((chunk) => {
		data.set(chunk, offset)
		offset += chunk.length
	})

	// Decrypt the data
	const decrypted = await decryptAESGCM(data, secret, iv)

	// Determine the MIME type
	const mimeType = filetypemime(decrypted)

	if (mimeType?.length === 0) {
		logger.error(
			{
				spaceId: mediaInfo.spaceId,
				mimeType: mimeType?.length > 0 ? mimeType : 'no mimeType',
			},
			'No media information found',
		)
		throw new Error('No media information found')
	}

	logger.info(
		{
			spaceId: mediaInfo.spaceId,
			mimeType,
		},
		'mediaContentFromStreamView decrypted content',
	)

	// Return decrypted data and MIME type
	return {
		data: decrypted,
		mimeType: mimeType[0] ?? 'application/octet-stream',
	}
}

function stripHexPrefix(hexString: string): string {
	if (hexString.startsWith('0x')) {
		return hexString.slice(2)
	}
	return hexString
}

export async function getStream(
	log: FastifyBaseLogger,
	streamId: string,
): Promise<StreamStateView> {
	const logger = getFunctionLogger(log, 'getStream')
	const result = await getStreamClient(logger, `0x${streamId}`)
	const client = result.client
	const lastMiniblockNum = result.lastMiniblockNum

	if (!client) {
		logger.error({ streamId }, 'Failed to get client for stream')
		throw new Error(`Failed to get client for stream ${streamId}`)
	}

	logger.info(
		{
			nodeUrl: client.url,
			streamId,
			lastMiniblockNum: lastMiniblockNum.toString(),
		},
		'getStream',
	)

	const start = Date.now()

	const response = await client.getStream({
		streamId: streamIdAsBytes(streamId),
	})

	logger.info(
		{
			duration_ms: Date.now() - start,
		},
		'getStream finished',
	)

	const unpackedResponse = await unpackStream(response.stream)
	return streamViewFromUnpackedResponse(streamId, unpackedResponse)
}

export async function getMediaStreamContent(
	log: FastifyBaseLogger,
	fullStreamId: StreamIdHex,
	secret: Uint8Array,
	iv: Uint8Array,
): Promise<MediaContent | { data: null; mimeType: null }> {
	const logger = getFunctionLogger(log, 'getMediaStreamContent')
	const toHexString = (byteArray: Uint8Array) => {
		return Array.from(byteArray, (byte) => byte.toString(16).padStart(2, '0')).join('')
	}

	const secretHex = toHexString(secret)
	const ivHex = toHexString(iv)

	/*
	if (contentCache[concatenatedString]) {
		return contentCache[concatenatedString];
	}
	*/

	const streamId = stripHexPrefix(fullStreamId)
	const sv = await getStream(logger, streamId)

	if (!sv) {
		logger.error({ streamId }, 'Failed to get stream')
		throw new Error(`Failed to get stream ${streamId}`)
	}

	const result = await mediaContentFromStreamView(logger, sv, secret, iv)

	// Cache the result
	const concatenatedString = `${fullStreamId}${secretHex}${ivHex}`
	contentCache[concatenatedString] = result

	return result
}
