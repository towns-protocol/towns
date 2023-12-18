import { Nexus } from '@whatsgood/nexus'

type Env = Record<string, string>

const server = Nexus.create<Env>({
	providers: (ctx) => [
		{
			name: 'alchemy',
			key: ctx.NEXUS_ALCHEMY_KEY,
		},
	],
	globalAccessKey: (ctx) => ctx.NEXUS_GLOBAL_ACCESS_KEY,
	chains: [84531, 84532],
	logger: console,
})

export const worker = { fetch: server.fetch }

export default worker
