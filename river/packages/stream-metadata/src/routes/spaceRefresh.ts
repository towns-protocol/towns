import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { isValidEthereumAddress } from '../validators'
import { CloudfrontManager } from '../aws'
import { refreshOpenSea } from '../opensea'

const paramsSchema = z.object({
	spaceAddress: z
		.string()
		.min(1, 'spaceAddress parameter is required')
		.refine(isValidEthereumAddress, {
			message: 'Invalid spaceAddress format',
		}),
})

// This route handler validates the refresh request and quickly returns a 200 response.
export async function spaceRefresh(request: FastifyRequest, reply: FastifyReply) {
	const logger = request.log.child({ name: spaceRefresh.name })

	const parseResult = paramsSchema.safeParse(request.params)

	if (!parseResult.success) {
		const errorMessage = parseResult.error.errors[0]?.message || 'Invalid parameters'
		logger.info(errorMessage)
		return reply.code(400).send({ error: 'Bad Request', message: errorMessage })
	}

	return reply.code(200).send({ ok: true })
}

// This onResponse hook does the actual heavy lifting of invalidating the CloudFront cache and refreshing OpenSea.
export async function spaceRefreshOnResponse(
	request: FastifyRequest,
	reply: FastifyReply,
	done: () => void,
) {
	const logger = request.log.child({ name: spaceRefreshOnResponse.name })

	const { spaceAddress } = paramsSchema.parse(request.params)

	logger.info({ spaceAddress }, 'Refreshing space')

	try {
		await CloudfrontManager.createCloudfrontInvalidation({
			paths: [`/space/${spaceAddress}/image*`],
			logger,
			waitUntilFinished: true,
		})
		await refreshOpenSea({ spaceAddress, logger })
	} catch (error) {
		logger.error(
			{
				err: error,
				spaceAddress,
			},
			'Failed to refresh space',
		)
	}

	done()
}
