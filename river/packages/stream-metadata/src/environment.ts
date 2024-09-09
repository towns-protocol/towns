import * as dotenv from 'dotenv'
import { getWeb3Deployment } from '@river-build/web3'
import { z } from 'zod'
import { v4 } from 'uuid'

dotenv.config({
	path: ['.env', '.env.local'],
})

const IntStringSchema = z.string().regex(/^[0-9]+$/)
const BoolStringSchema = z.string().regex(/^(true|false)$/)

const NumberFromIntStringSchema = IntStringSchema.transform((str) => parseInt(str, 10))
const BoolFromStringSchema = BoolStringSchema.transform((str) => str === 'true')

const envMainSchema = z.object({
	RIVER_ENV: z.string(),
	RIVER_CHAIN_RPC_URL: z.string().url(),
	BASE_CHAIN_RPC_URL: z.string().url(),
	RIVER_STREAM_METADATA_BASE_URL: z.string().url(),
	PORT: NumberFromIntStringSchema,
	HOST: z.string().optional().default('127.0.0.1'),
	LOG_LEVEL: z.string().optional().default('info'),
	LOG_PRETTY: BoolFromStringSchema.optional().default('true'),
	OPENSEA_API_KEY: z.string().optional(),
})

const envAwsSchema = z
	.object({
		CLOUDFRONT_DISTRIBUTION_ID: z.string().min(1),
	})
	.optional()

function makeConfig() {
	// eslint-disable-next-line no-process-env -- this is the only line where we're allowed to use process.env

	const envMain = envMainSchema.parse(process.env)
	const envAws = envAwsSchema.safeParse(process.env)
	const web3Config = getWeb3Deployment(envMain.RIVER_ENV)
	const baseUrl = new URL(envMain.RIVER_STREAM_METADATA_BASE_URL)

	return {
		web3Config,
		riverEnv: envMain.RIVER_ENV,
		baseChainRpcUrl: envMain.BASE_CHAIN_RPC_URL,
		riverChainRpcUrl: envMain.RIVER_CHAIN_RPC_URL,
		streamMetadataBaseUrl: baseUrl.origin,
		host: envMain.HOST,
		port: envMain.PORT,
		openSeaApiKey: envMain.OPENSEA_API_KEY,
		log: {
			level: envMain.LOG_LEVEL,
			pretty: envMain.LOG_PRETTY,
		},
		aws: envAws?.success ? envAws.data : undefined,
		instance: {
			id: v4(),
			deployedAt: new Date().toISOString(),
		},
	}
}

export const config = makeConfig()
