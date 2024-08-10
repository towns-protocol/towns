import { Address, StreamIdHex } from './types'
import { FastifyReply, FastifyRequest } from 'fastify'
import { StreamPrefix, StreamStateView, makeStreamId } from '@river-build/sdk'
import { getMediaStreamContent, getStream } from './riverStreamRpcClient'
import { isBytes32String, isValidEthereumAddress } from './validators'

import { deriveKeyAndIV } from '@river-build/sdk'

export async function handleImageRequest(request: FastifyRequest, reply: FastifyReply) {
	const { spaceAddress } = request.params as { spaceAddress?: string }

	if (!spaceAddress) {
		return reply
			.code(400)
			.send({ error: 'Bad Request', message: 'spaceAddress parameter is required' })
	}

	if (!isValidEthereumAddress(spaceAddress)) {
		return reply
			.code(400)
			.send({ error: 'Bad Request', message: 'Invalid spaceAddress format' })
	}

	let stream: StreamStateView | undefined
	try {
		const streamId = makeStreamId(StreamPrefix.Space, spaceAddress)
		stream = await getStream(streamId)
	} catch (e) {
		console.error(`Failed to get stream for space ${spaceAddress}: ${e}`)
		return reply.code(404).send('Stream not found')
	}

	if (!stream) {
		return reply.code(404).send('Stream not found')
	}

	// get the image metatdata from the stream
	const mediaStreamId = await getSpaceImageStreamId(stream)

	if (!mediaStreamId) {
		return reply.code(404).send('Image not found')
	}

	const fullStreamId: StreamIdHex = `0x${mediaStreamId}`
	if (!isBytes32String(fullStreamId)) {
		return reply.code(400).send('Invalid stream ID')
	}

	// derive the key and IV from the space address to decrypt the image
	// the spaceAddress must be all lowercase
	const context = spaceAddress.toLowerCase()
	const { key, iv } = await deriveKeyAndIV(context)

	const { data, mimeType } = await getMediaStreamContent(fullStreamId, key, iv)

	if (data && mimeType) {
		return reply.header('Content-Type', mimeType).send(Buffer.from(data))
	} else {
		return reply.code(404).send('No image')
	}
}

async function getSpaceImageStreamId(streamView: StreamStateView) {
	if (streamView.contentKind !== 'spaceContent') {
		return undefined
	}

	const spaceImage = await streamView.spaceContent.getSpaceImage()
	const streamId = spaceImage?.streamId
	return streamId
}
