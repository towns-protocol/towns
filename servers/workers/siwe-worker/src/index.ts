import {
	verifySiweMessage,
	isAuthedRequest,
	isOptionsRequest,
	getOptionsResponse,
	Environment,
	AuthEnv,
	withCorsHeaders,
} from '../../worker-common/src'

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
	INFURA_API_KEY: string
	ENVIRONMENT: Environment
	VERIFY: string
	SMART_CONTRACT_VERSION: string
}

// have to use module syntax to gain access to env which contains secret variables for local dev
export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		return worker.fetch(request, env)
	},
}

export const worker = {
	async fetch(request: FetchEvent['request'], env: Env): Promise<Response> {
		if (isOptionsRequest(request)) {
			return getOptionsResponse(request, env.ENVIRONMENT)
		}

		if (!isAuthedRequest(request, env)) {
			return new Response('Unauthorised', {
				status: 401,
				headers: withCorsHeaders(request, env.ENVIRONMENT),
			})
		}

		if (request.method !== 'POST') {
			return new Response('Method not allowed', {
				status: 405,
				headers: withCorsHeaders(request, env.ENVIRONMENT),
			})
		}

		try {
			const newRequest = new Request(request.clone())
			const { spaceId, userId } = (await newRequest.json()) as {
				spaceId?: string
				userId?: string
			}
			console.log(`spaceId: ${spaceId ?? ''}, userId: ${userId ?? ''}`)
			if (!!spaceId && !!userId) {
				return new Response('Can only provide one of spaceId or userId', { status: 400 })
			} else if (spaceId !== undefined) {
				return await verifySiweMessage(request, env)
			} else if (userId !== undefined) {
				return await verifySiweMessage(request, env, true)
			} else {
				return new Response('Must provide spaceId or userId', { status: 400 })
			}
		} catch (e) {
			console.log(`error: `, e)
			return new Response('Unauthorized', {
				status: 401,
				headers: {
					'content-type': 'application/json;charset=UTF-8',
					...withCorsHeaders(request, env.ENVIRONMENT),
				},
			})
		}
	},
}
