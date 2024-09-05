import { CloudFront } from '@aws-sdk/client-cloudfront'

import { config } from './environment'

export const cloudFront = config.aws
	? new CloudFront({
			region: config.aws.AWS_REGION,
			credentials: {
				accessKeyId: config.aws.AWS_ACCESS_KEY_ID,
				secretAccessKey: config.aws.AWS_SECRET_ACCESS_KEY,
			},
	  })
	: undefined
