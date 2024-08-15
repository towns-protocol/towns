import { FastifyRequest, FastifyReply } from 'fastify'

import { isValidEthereumAddress } from './validators'

export function handleMetadataRequest(
	request: FastifyRequest,
	reply: FastifyReply,
	baseUrl: string,
) {
	const { spaceAddress } = request.params as { spaceAddress?: string }

	if (!spaceAddress) {
		return reply
			.code(400)
			.send({ error: 'Bad Request', message: 'spaceAddress parameter is required' })
	}

	// Validate spaceAddress format using the helper function
	if (!isValidEthereumAddress(spaceAddress)) {
		return reply
			.code(400)
			.send({ error: 'Bad Request', message: 'Invalid spaceAddress format' })
	}

	const dummyJson = {
		name: '....',
		description: '....',
		members: 99999,
		fees: '0.001 eth',
		image: `${baseUrl}/space/${spaceAddress}/image`,
	}

	return reply.header('Content-Type', 'application/json').send(dummyJson)
}
