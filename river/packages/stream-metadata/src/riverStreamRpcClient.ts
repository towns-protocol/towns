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
import { BigNumber } from 'ethers'
import { StreamService } from '@river-build/proto'
import { filetypemime } from 'magic-bytes.js'

import { MediaContent, StreamIdHex } from './types'
import { getNodeForStream } from './streamRegistry'
import { getLogger } from './logger'

const logger = getLogger('riverStreamRpcClient')

const clients = new Map<string, StreamRpcClient>()

const contentCache: Record<string, MediaContent | undefined> = {}

export type StreamRpcClient = PromiseClient<typeof StreamService> & { url?: string }

function makeStreamRpcClient(url: string): StreamRpcClient {
	logger.info({ url }, 'makeStreamRpcClient: Connecting')

	const options: ConnectTransportOptions = {
		baseUrl: url,
	}

	const transport = createConnectTransport(options)
	const client: StreamRpcClient = createPromiseClient(StreamService, transport)
	client.url = url
	return client
}

async function getStreamClient(streamId: `0x${string}`) {
	const node = await getNodeForStream(streamId)
	let url = node?.url
	if (!clients.has(url)) {
		const client = makeStreamRpcClient(url)
		clients.set(client.url!, client)
		url = client.url!
	}
	logger.info({ url }, 'getStreamClient: client url')

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
	streamView: StreamStateView,
	secret: Uint8Array,
	iv: Uint8Array,
): Promise<MediaContent> {
	const mediaInfo = streamView.mediaContent.info
	if (mediaInfo) {
		logger.info(
			{
				spaceId: mediaInfo.spaceId,
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
		if (mimeType?.length > 0) {
			logger.info({ mimeType }, 'mediaContentFromStreamView')

			// Return decrypted data and MIME type
			return {
				data: decrypted,
				mimeType: mimeType[0] ?? 'application/octet-stream',
			}
		}
	}

	throw new Error('No media information found')
}

function stripHexPrefix(hexString: string): string {
	if (hexString.startsWith('0x')) {
		return hexString.slice(2)
	}
	return hexString
}

export async function getStream(streamId: string): Promise<StreamStateView | undefined> {
	let client: StreamRpcClient | undefined
	let lastMiniblockNum: BigNumber | undefined

	try {
		const result = await getStreamClient(`0x${streamId}`)
		client = result.client
		lastMiniblockNum = result.lastMiniblockNum
	} catch (error) {
		logger.error(
			{
				error,
				streamId,
			},
			'Failed to get client for stream',
		)
		return undefined
	}

	if (!client) {
		logger.error({ streamId }, 'Failed to get client for stream')
		return undefined
	}

	logger.info(
		{
			clientUrl: client.url,
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
			duration: Date.now() - start,
		},
		'getStream finished',
	)

	const unpackedResponse = await unpackStream(response.stream)
	return streamViewFromUnpackedResponse(streamId, unpackedResponse)
}

export async function getMediaStreamContent(
	fullStreamId: StreamIdHex,
	secret: Uint8Array,
	iv: Uint8Array,
): Promise<MediaContent | { data: null; mimeType: null }> {
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
	const sv = await getStream(streamId)

	if (!sv) {
		return { data: null, mimeType: null }
	}

	let result: MediaContent | undefined
	try {
		result = await mediaContentFromStreamView(sv, secret, iv)
	} catch (error) {
		logger.error(
			{
				error,
				streamId: fullStreamId,
			},
			'Failed to get media content for stream',
		)
		return { data: null, mimeType: null }
	}

	// Cache the result
	const concatenatedString = `${fullStreamId}${secretHex}${ivHex}`
	contentCache[concatenatedString] = result

	return result
}
