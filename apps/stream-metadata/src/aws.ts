import { CloudFront, GetInvalidationCommandOutput } from '@aws-sdk/client-cloudfront'
import { FastifyBaseLogger } from 'fastify'

import { config as envConfig } from './environment'

export class CloudfrontManager {
	private readonly cloudFront: CloudFront

	constructor(
		private readonly logger: FastifyBaseLogger,
		private readonly config: {
			distributionId: string
			invalidationConfirmationMaxAttempts: number
			invalidationConfirmationWait: number
		},
	) {
		this.cloudFront = new CloudFront({
			serviceId: 'stream-metadata',
			logger: this.logger,
		})
	}

	private async invalidate(params: { paths: string[]; waitUntilFinished?: boolean }) {
		const invalidationCommand = await this.cloudFront.createInvalidation({
			DistributionId: this.config.distributionId,
			InvalidationBatch: {
				CallerReference: `${new Date().toISOString()}-${params.paths
					.map((path) => path.substring(0, 5))
					.join('-')}`,
				Paths: {
					Quantity: params.paths.length,
					Items: params.paths,
				},
			},
		})

		this.logger.info({ path: params.paths }, 'CloudFront cache invalidation created')

		if (params.waitUntilFinished) {
			await this.waitForInvalidation(invalidationCommand, params.paths)
		}
		return invalidationCommand
	}

	private async waitForInvalidation(
		invalidationCommand: GetInvalidationCommandOutput,
		paths: string[],
	) {
		let attempts = 0
		let currentInvalidationCommand = invalidationCommand
		while (currentInvalidationCommand.Invalidation?.Status !== 'Completed') {
			attempts += 1
			if (attempts >= this.config.invalidationConfirmationMaxAttempts) {
				this.logger.error(
					{
						invalidation: currentInvalidationCommand,
						paths,
					},
					'CloudFront cache invalidation did not complete in time',
				)
				throw new Error('CloudFront cache invalidation did not complete in time')
			}
			this.logger.info(
				{
					invalidation: currentInvalidationCommand,
					paths,
				},
				'Waiting for CloudFront cache invalidation to complete...',
			)
			if (!currentInvalidationCommand.Invalidation) {
				throw new Error('Invalidation not found')
			}
			await new Promise((resolve) =>
				setTimeout(resolve, this.config.invalidationConfirmationWait),
			)
			currentInvalidationCommand = await this.cloudFront.getInvalidation({
				DistributionId: this.config.distributionId,
				Id: currentInvalidationCommand.Invalidation.Id,
			})
		}
		this.logger.info(
			{
				invalidation: currentInvalidationCommand,
				paths,
			},
			'CloudFront cache invalidation completed',
		)
	}

	static async getInvalidation(params: { logger: FastifyBaseLogger; invalidationId: string }) {
		const { invalidationId, logger } = params
		if (!envConfig.cloudfront) {
			logger.warn(
				{ invalidationId },
				'CloudFront distribution ID not set, skipping getInvalidation',
			)
			return
		}
		const cloudfrontManager = new CloudfrontManager(logger, envConfig.cloudfront)
		return cloudfrontManager.cloudFront.getInvalidation({
			DistributionId: envConfig.cloudfront.distributionId,
			Id: invalidationId,
		})
	}

	static async waitForInvalidation(params: {
		invalidationId: string
		logger: FastifyBaseLogger
	}) {
		const { invalidationId, logger } = params
		if (!envConfig.cloudfront) {
			logger.warn(
				{ invalidationId },
				'CloudFront distribution ID not set, skipping wait for invalidation',
			)
			return
		}

		const manager = new CloudfrontManager(logger, envConfig.cloudfront)
		const invalidationCommand = await manager.cloudFront.getInvalidation({
			DistributionId: envConfig?.cloudfront?.distributionId,
			Id: invalidationId,
		})
		return manager.waitForInvalidation(
			invalidationCommand,
			invalidationCommand.Invalidation?.InvalidationBatch?.Paths?.Items ?? [],
		)
	}

	static async createCloudfrontInvalidation(params: {
		paths: string[]
		logger: FastifyBaseLogger
		waitUntilFinished?: boolean
	}) {
		if (!envConfig.cloudfront) {
			params.logger.warn(
				{
					paths: params.paths,
				},
				'CloudFront distribution ID not set, skipping cache invalidation',
			)
			return
		}

		const cloudfrontManager = new CloudfrontManager(params.logger, envConfig.cloudfront)

		return cloudfrontManager.invalidate(params)
	}
}
