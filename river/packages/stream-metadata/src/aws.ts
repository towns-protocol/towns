import { CloudFront } from '@aws-sdk/client-cloudfront'
import { FastifyBaseLogger } from 'fastify'

import { config } from './environment'

export const createCloudfrontInvalidation = async (params: {
	path: string
	logger: FastifyBaseLogger
}) => {
	if (!config.aws?.CLOUDFRONT_DISTRIBUTION_ID) {
		params.logger.warn(
			{
				path: params.path,
			},
			'CloudFront distribution ID not set, skipping cache invalidation',
		)
		return
	}

	const cloudFront = new CloudFront({
		serviceId: 'stream-metadata',
		logger: params.logger,
	})

	await cloudFront?.createInvalidation({
		DistributionId: config.aws?.CLOUDFRONT_DISTRIBUTION_ID,
		InvalidationBatch: {
			CallerReference: `${new Date().toISOString()}-${params.path.substring(0, 5)}`,
			Paths: {
				Quantity: 1,
				Items: [params.path],
			},
		},
	})

	params.logger.info({ path: params.path }, 'CloudFront cache invalidation created')
}
