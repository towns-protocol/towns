import {
	ParsedStreamResponse,
	StreamStateView,
	UnpackEnvelopeOpts,
	decryptAESGCM,
	retryInterceptor,
	streamIdAsBytes,
	streamIdAsString,
	unpackStream,
} from '@river-build/sdk'
import { PromiseClient, createPromiseClient } from '@connectrpc/connect'
import { ConnectTransportOptions, createConnectTransport } from '@connectrpc/connect-node'
import { StreamService } from '@river-build/proto'
import { filetypemime } from 'magic-bytes.js'
import { FastifyBaseLogger } from 'fastify'

import { MediaContent, StreamIdHex } from './types'
import { getNodeForStream } from './streamRegistry'

const STREAM_METADATA_SERVICE_DEFAULT_UNPACK_OPTS: UnpackEnvelopeOpts = {
	disableHashValidation: true,
	disableSignatureValidation: true,
}

const clients = new Map<string, StreamRpcClient>()

export type StreamRpcClient = PromiseClient<typeof StreamService> & { url?: string }

function makeStreamRpcClient(logger: FastifyBaseLogger, url: string): StreamRpcClient {
	logger.info({ url }, 'Connecting')

	const options: ConnectTransportOptions = {
		httpVersion: '2',
		baseUrl: url,
		interceptors: [
			retryInterceptor({ maxAttempts: 3, initialRetryDelay: 2000, maxRetryDelay: 6000 }),
		],
	}

	const transport = createConnectTransport(options)
	const client: StreamRpcClient = createPromiseClient(StreamService, transport)
	client.url = url
	return client
}

async function getStreamClient(logger: FastifyBaseLogger, streamId: `0x${string}`) {
	const node = await getNodeForStream(logger, streamId)
	const client = clients.get(node.url) || makeStreamRpcClient(logger, node.url)
	clients.set(node.url, client)

	logger.info({ url: node.url }, 'client connected to node')

	return { client, lastMiniblockNum: node.lastMiniblockNum }
}

function removeClient(logger: FastifyBaseLogger, clientToRemove: StreamRpcClient) {
	logger.info({ url: clientToRemove.url }, 'removeClient')
	if (clientToRemove.url) {
		clients.delete(clientToRemove.url)
	}
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
	logger: FastifyBaseLogger,
	streamView: StreamStateView,
	secret: Uint8Array,
	iv: Uint8Array,
): Promise<MediaContent> {
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
		'decrypting media content in stream',
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
			mediaStreamId: streamView.mediaContent.streamId,
			mimeType,
		},
		'decrypted media content in stream',
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
	logger: FastifyBaseLogger,
	streamId: string,
	opts: UnpackEnvelopeOpts = STREAM_METADATA_SERVICE_DEFAULT_UNPACK_OPTS,
): Promise<StreamStateView> {
	const { client, lastMiniblockNum } = await getStreamClient(logger, `0x${streamId}`)
	logger.info(
		{
			nodeUrl: client.url,
			streamId,
			lastMiniblockNum: lastMiniblockNum.toString(),
		},
		'getStream',
	)

	try {
		const start = Date.now()

		const response = await client.getStream({
			streamId: streamIdAsBytes(streamId),
		})

		const duration_ms = Date.now() - start
		logger.info(
			{
				duration_ms,
			},
			'getStream finished',
		)

		const unpackedResponse = await unpackStream(response.stream, opts)
		return streamViewFromUnpackedResponse(streamId, unpackedResponse)
	} catch (e) {
		logger.error(
			{ url: client.url, streamId, err: e },
			'getStream failed, removing client from cache',
		)
		removeClient(logger, client)
		throw e
	}
}

export async function getMediaStreamContent(
	logger: FastifyBaseLogger,
	fullStreamId: StreamIdHex,
	secret: Uint8Array,
	iv: Uint8Array,
): Promise<MediaContent> {
	const streamId = stripHexPrefix(fullStreamId)
	const sv = await getStream(logger, streamId)
	const result = await mediaContentFromStreamView(logger, sv, secret, iv)
	return result
}
