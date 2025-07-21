import {
	ParsedStreamResponse,
	StreamRpcClient,
	StreamStateView,
	UnpackEnvelopeOpts,
	makeStreamRpcClient,
	streamIdAsBytes,
	streamIdAsString,
	unpackStream,
} from '@towns-protocol/sdk'
import { decryptAESGCM } from '@towns-protocol/sdk-crypto'
import { filetypemime } from 'magic-bytes.js'
import { FastifyBaseLogger } from 'fastify'
import { LRUCache } from 'lru-cache'
import { errors } from 'ethers'

import { MediaContent } from './types'
import { getNodeForStream } from './streamRegistry'

const STREAM_METADATA_SERVICE_DEFAULT_UNPACK_OPTS: UnpackEnvelopeOpts = {
	disableHashValidation: true,
	disableSignatureValidation: true,
}

const streamLocationCache = new LRUCache<string, string>({ max: 5000 })
const clients = new Map<string, StreamRpcClient>()
const streamClientRequests = new Map<string, Promise<StreamRpcClient>>()
const streamRequests = new Map<string, Promise<StreamStateView>>()
const mediaRequests = new Map<string, Promise<MediaContent | undefined>>()

async function _getStreamClient(logger: FastifyBaseLogger, streamId: string) {
	let url = streamLocationCache.get(streamId)
	if (!url) {
		const node = await getNodeForStream(logger, streamId)
		url = node.url
		streamLocationCache.set(streamId, url)
	}
	let client = clients.get(url)
	if (!client) {
		logger.info({ url }, 'Connecting')
		client = makeStreamRpcClient(url)
		clients.set(url, client)
	}
	return client
}

async function getStreamClient(
	logger: FastifyBaseLogger,
	streamId: string,
): Promise<StreamRpcClient> {
	const existing = streamClientRequests.get(streamId)
	if (existing) {
		return existing
	}
	try {
		const promise = _getStreamClient(logger, streamId)
		streamClientRequests.set(streamId, promise)
		return await promise
	} finally {
		streamClientRequests.delete(streamId)
	}
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
	const streamView = new StreamStateView('userId', streamIdAsString(streamId), undefined)
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
	iv?: Uint8Array,
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

	let decrypted: Uint8Array
	if (mediaInfo.perChunkEncryption) {
		// auth tag is 16 bytes
		decrypted = new Uint8Array(
			mediaInfo.chunks.reduce((totalLength, chunk) => totalLength + chunk.length - 16, 0),
		)
		let offset = 0
		for (let i = 0; i < mediaInfo.chunkCount; i++) {
			const chunk = mediaInfo.chunks[i]
			const chunkIv = mediaInfo.perChunkIVs[i]
			const decryptedChunk = await decryptAESGCM(chunk, secret, chunkIv)
			decrypted.set(decryptedChunk, offset)
			offset += decryptedChunk.length
		}
	} else {
		if (!iv) {
			throw new Error('IV is required for non-per-chunk-encrypted media')
		}

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
		decrypted = await decryptAESGCM(data, secret, iv)
	}
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

export async function _getStream(
	logger: FastifyBaseLogger,
	streamId: string,
	opts: UnpackEnvelopeOpts = STREAM_METADATA_SERVICE_DEFAULT_UNPACK_OPTS,
): Promise<StreamStateView> {
	const client = await getStreamClient(logger, streamId)
	logger.info(
		{
			nodeUrl: client.url,
			streamId,
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
		logger.warn(
			{ url: client.url, streamId, err: e },
			'getStream failed, removing client from cache',
		)
		removeClient(logger, client)
		throw e
	}
}

export async function getStream(
	logger: FastifyBaseLogger,
	streamId: string,
	opts: UnpackEnvelopeOpts = STREAM_METADATA_SERVICE_DEFAULT_UNPACK_OPTS,
): Promise<StreamStateView | undefined> {
	const existing = streamRequests.get(streamId)
	if (existing) {
		return existing
	}
	try {
		const promise = _getStream(logger, streamId, opts)
		streamRequests.set(streamId, promise)
		return await promise
	} catch (e) {
		// We don't want to immediately throw when the stream is not found,
		// because this is not always an unexpected error. When streams are
		// not found, the caller should handle this case and return a 404.
		if (
			e instanceof Error &&
			'code' in e &&
			e.code === `${errors.CALL_EXCEPTION}` &&
			'reason' in e &&
			e.reason === 'NOT_FOUND'
		) {
			return undefined
		}
	} finally {
		streamRequests.delete(streamId)
	}
}

export async function _getMediaStreamContent(
	logger: FastifyBaseLogger,
	streamId: string,
	secret: Uint8Array,
	iv?: Uint8Array,
): Promise<MediaContent | undefined> {
	const sv = await getStream(logger, streamId)
	if (!sv) {
		return undefined
	}
	const result = await mediaContentFromStreamView(logger, sv, secret, iv)
	return result
}

export async function getMediaStreamContent(
	logger: FastifyBaseLogger,
	streamId: string,
	secret: Uint8Array,
	iv: Uint8Array | undefined,
): Promise<MediaContent | undefined> {
	const existing = mediaRequests.get(streamId)
	if (existing) {
		return existing
	}
	try {
		const promise = _getMediaStreamContent(logger, streamId, secret, iv)
		mediaRequests.set(streamId, promise)
		return await promise
	} finally {
		mediaRequests.delete(streamId)
	}
}
