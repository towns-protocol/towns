import { defineChain } from 'viem'

export type ChainType = ReturnType<typeof defineChain>

export const riverChainProduction: ChainType = defineChain({
	id: 550,
	name: 'river ',
	network: 'river',
	nativeCurrency: {
		decimals: 18,
		name: 'River Ether',
		symbol: 'ETH',
	},
	rpcUrls: {
		default: { http: ['https://mainnet.rpc.river.build/http'] },
	},
	testnet: true,
})

export const riverChainDevnet: ChainType = defineChain({
	id: 6524490,
	name: 'river_devnet',
	network: 'river_devnet',
	nativeCurrency: {
		decimals: 18,
		name: 'River Devnet Ether',
		symbol: 'ETH',
	},
	rpcUrls: {
		default: { http: ['https://devnet.rpc.river.build'] },
	},
	testnet: true,
})

export const riverChainLocalhost: ChainType = defineChain({
	id: 31338,
	name: 'river_localhost',
	network: 'river_localhost',
	nativeCurrency: {
		decimals: 18,
		name: 'River Localhost Ether',
		symbol: 'ETH',
	},
	rpcUrls: {
		default: { http: ['http://127.0.0.1:8546'] },
	},
	testnet: true,
})
