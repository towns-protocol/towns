import {
	withCorsHeaders,
	AuthEnv,
	isAuthedRequest,
	isOptionsRequest,
	getOptionsResponse,
} from '../../common'

const GOERLI_RPC_URL = 'https://eth-goerli.g.alchemy.com/v2/'
const LOCALHOST_RPC_URL = 'http://localhost:8545'

const providerMap = new Map<string, string>([
	['development', LOCALHOST_RPC_URL],
	['staging', GOERLI_RPC_URL],
	['production', GOERLI_RPC_URL],
])

// These initial Types are based on bindings that don't exist in the project yet,
// you can follow the links to learn how to implement them.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Env extends AuthEnv {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket
	ALCHEMY_API_KEY: string
	ENVIRONMENT: string
	VERIFY: string
}

// have to use module syntax to gain access to env which contains secret variables for local dev
export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		return worker.fetch(request, env)
	},
}

export const worker = {
	async fetch(request: FetchEvent['request'], env: Env): Promise<Response> {
		// Do not move this import to global scope
		// See CPU startup time issues
		// https://github.com/cloudflare/wrangler2/issues/2519
		// https://github.com/cloudflare/wrangler2/issues/2152
		const { ethers } = require('ethers')
		const { verifySiweMessage } = require('./siwe/handler')
		if (isOptionsRequest(request)) {
			return getOptionsResponse(request)
		}

		if (!isAuthedRequest(request, env)) {
			return new Response('Unauthorised', { status: 401, headers: withCorsHeaders(request) })
		}

		if (request.method !== 'POST') {
			return new Response('Method not allowed', {
				status: 405,
				headers: withCorsHeaders(request),
			})
		}

		try {
			// Need to setup provider with skipFetchSetup flag
			// See issue: https://github.com/ethers-io/ethers.js/issues/1886
			const provider = new ethers.providers.StaticJsonRpcProvider({
				url:
					env.ENVIRONMENT == 'development'
						? providerMap.get(env.ENVIRONMENT)
						: providerMap.get(env.ENVIRONMENT) + env.ALCHEMY_API_KEY,
				skipFetchSetup: true,
			})
			const response = await verifySiweMessage(request, provider, env.VERIFY === 'true')
			return response
		} catch (e) {
			console.log(`error: `, e)
			return new Response('Unauthorized', {
				status: 401,
				headers: {
					'content-type': 'application/json;charset=UTF-8',
					...withCorsHeaders(request),
				},
			})
		}
	},
}
