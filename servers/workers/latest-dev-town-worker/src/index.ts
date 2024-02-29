/**
 * This is a simple worker script that redirects all requests to the latest
 * Dev Town invite URL.
 */

export interface Env {
	LATEST_DEV_TOWN_INVITE_URL?: string
}

export const worker = {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (env.LATEST_DEV_TOWN_INVITE_URL === undefined) {
			return new Response(
				"LATEST_DEV_TOWN_INVITE_URL is not set. We're probably reseting, hang tight!",
				{
					status: 500,
				},
			)
		} else {
			// temporary redirect
			return Response.redirect(env.LATEST_DEV_TOWN_INVITE_URL, 302)
		}
	},
}

// have to use module syntax to gain access to env which contains secret variables for local dev
export default {
	fetch(request: Request, env: Env) {
		return worker.fetch(request, env)
	},
}
