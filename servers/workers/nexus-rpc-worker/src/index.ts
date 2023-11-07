import { Config, RpcProxyResponseHandler } from '@whatsgood/nexus'

export const worker = {
	async fetch(request: Request, env: Record<string, string>): Promise<Response> {
		const config = new Config({
			env,
		})
		const responseHandler = new RpcProxyResponseHandler({
			config,
		})
		return responseHandler.handle(request)
	},
}

export default worker
