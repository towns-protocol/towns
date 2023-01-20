import {
	withCorsHeaders,
	AuthEnv,
	isAuthedRequest,
	isOptionsRequest,
	getOptionsResponse,
} from '../../common'

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npx wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npx wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

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
}

// have to use module syntax to gain access to env which contains secret variables for local dev
export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		return worker.fetch(request, env)
	},
}

export const worker = {
	async fetch(request: FetchEvent['request'], env: Env): Promise<Response> {
		const { verifySiweMessage } = require('./siwe/handler')
		if (isOptionsRequest(request)) {
			return getOptionsResponse(request)
		}

		if (!isAuthedRequest(request, env)) {
			return new Response('Unauthorised', { status: 401, headers: withCorsHeaders(request) })
		}

		if (request.method !== 'PUT') {
			return new Response('Method not allowed', {
				status: 405,
				headers: withCorsHeaders(request),
			})
		}

		try {
			/* John: As of Jan 20223, this call is causing an error when publishing to
			Workers runtime
			  Error: Script startup exceeded CPU time limit.
			  [Code: 10021]
			   There's an issue to add CPU startup time to debug logs
			   https://github.com/cloudflare/wrangler2/issues/2519
			   and similar non-deterministic insances of this error
			   https://github.com/cloudflare/wrangler2/issues/2152
			   https://github.com/cloudflare/wrangler2/issues/2337
			. If we cannot increase CPU startup limits or otherwise lower
			startup time, we may need to move this call to a separate worker
			as a sub-request that is compiled to WASM.
			see: https://github.com/HereNotThere/ethsig-rs
			*/
			await verifySiweMessage(request)
		} catch (e) {
			return new Response('Unauthorized', {
				status: 401,
				headers: {
					'content-type': 'application/json;charset=UTF-8',
					...withCorsHeaders(request),
				},
			})
		}
		return new Response(`OK`)
	},
}
