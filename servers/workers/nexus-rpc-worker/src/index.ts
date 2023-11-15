import { Nexus } from '@whatsgood/nexus'

// Leaving this here for now, so that we can
// disable any provider we don't want to use,
// even if their keys are in the env.
const server = Nexus.createServer({
	providers: {
		// alchemy: {
		// 	disabled: true,
		// },
		infura: {
			disabled: true,
		},
		ankr: {
			disabled: true,
		},
		base: {
			disabled: true,
		},
	},
})

export const worker = {
	async fetch(request: Request, env: Record<string, string>): Promise<Response> {
		return server.fetch(request, env)
	},
}

export default worker
