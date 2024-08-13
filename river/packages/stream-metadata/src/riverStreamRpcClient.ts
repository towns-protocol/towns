import { ConnectTransportOptions, createConnectTransport } from '@connectrpc/connect-web'
import { Config, MediaContent, StreamIdHex } from './types'
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
import { getNodeForStream } from './streamRegistry'

const clients = new Map<string, StreamRpcClient>()

const contentCache: Record<string, MediaContent | undefined> = {}

export type StreamRpcClient = PromiseClient<typeof StreamService> & { url?: string }

function makeStreamRpcClient(url: string): StreamRpcClient {
	console.log(`makeStreamRpcClient: Connecting to url=${url}`)

	const options: ConnectTransportOptions = {
		baseUrl: url,
	}

	const transport = createConnectTransport(options)
	const client: StreamRpcClient = createPromiseClient(StreamService, transport)
	client.url = url
	return client
}

async function getStreamClient(config: Config, streamId: `0x${string}`) {
	const node = await getNodeForStream(config, streamId)
	let url = node?.url
	if (!clients.has(url)) {
		const client = makeStreamRpcClient(url)
		clients.set(client.url!, client)
		url = client.url!
	}
	console.log(`getStreamClient: url=${url}`)

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
		console.log(`mediaContentFromStreamView: mediaInfo.spaceId=${mediaInfo.spaceId}`)

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
			console.log(`mediaContentFromStreamView: type=${JSON.stringify(mimeType[0])}`)

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

export async function getStream(
	config: Config,
	streamId: string,
): Promise<StreamStateView | undefined> {
	let client: StreamRpcClient | undefined
	let lastMiniblockNum: BigNumber | undefined

	try {
		const result = await getStreamClient(config, `0x${streamId}`)
		client = result.client
		lastMiniblockNum = result.lastMiniblockNum
	} catch (e) {
		console.error(`Failed to get client for stream ${streamId}: ${e}`)
		return undefined
	}

	if (!client) {
		console.error(`Failed to get client for stream ${streamId}`)
		return undefined
	}

	console.log(
		`getStream: client=${client.url}; streamId=${streamId}; lastMiniblockNum=${lastMiniblockNum}`,
	)

	const start = Date.now()

	const response = await client.getStream({
		streamId: streamIdAsBytes(streamId),
	})

	console.log(`getStream: getStream took ${Date.now() - start}ms`)

	const unpackedResponse = await unpackStream(response.stream)
	return streamViewFromUnpackedResponse(streamId, unpackedResponse)
}

export async function getMediaStreamContent(
	config: Config,
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
	const sv = await getStream(config, streamId)

	if (!sv) {
		return { data: null, mimeType: null }
	}

	let result: MediaContent | undefined
	try {
		result = await mediaContentFromStreamView(sv, secret, iv)
	} catch (e) {
		console.error(`Failed to get media content for stream ${fullStreamId}: ${e}`)
		return { data: null, mimeType: null }
	}

	// Cache the result
	const concatenatedString = `${fullStreamId}${secretHex}${ivHex}`
	contentCache[concatenatedString] = result

	return result
}
