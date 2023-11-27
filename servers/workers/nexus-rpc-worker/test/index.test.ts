import { worker } from '../src/index'

const blockNumberMockResponse = {
	jsonrpc: '2.0',
	id: 1,
	result: '0x4b7', // 1207
}

describe('rpc worker tests', () => {
	const NEXUS_GLOBAL_ACCESS_KEY = 'my-dev-key'
	const NEXUS_ALCHEMY_KEY = 'my-alchemy-key'
	const ETH_MAINNET_ENDPOINT = `https://falcon.com/eth/mainnet?key=${NEXUS_GLOBAL_ACCESS_KEY}`

	beforeEach(() => {
		const fetchMock = getMiniflareFetchMock()
		fetchMock.disableNetConnect()

		const origin = fetchMock.get('https://eth-mainnet.alchemyapi.io')
		origin.intercept({ method: 'POST', path: () => true }).reply(200, blockNumberMockResponse)
	})

	describe('alchemy is up', () => {
		it('GET /eth/mainnet', async () => {
			const request = new Request(ETH_MAINNET_ENDPOINT, {
				method: 'GET',
			})
			const result = await worker.fetch(request, {
				NEXUS_GLOBAL_ACCESS_KEY,
				NEXUS_ALCHEMY_KEY,
			})

			const data = await result.json()

			expect(result.status).toBe(200)
			expect(data).toMatchObject({
				success: true,
				message: 'Provider is up and running.',
				access: 'authorized',
				code: 200,
				chain: {
					chainId: 1,
					networkName: 'ethereum',
					chainName: 'mainnet',
				},
			})
		})

		it('POST /eth/mainnet', async () => {
			const request = new Request(ETH_MAINNET_ENDPOINT, {
				method: 'POST',
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					method: 'eth_getBlockByNumber',
					params: ['latest', false],
				}),
			})
			const result = await worker.fetch(request, {
				NEXUS_GLOBAL_ACCESS_KEY,
				NEXUS_ALCHEMY_KEY,
			})

			const data = await result.json()

			expect(result.status).toBe(200)

			expect(data).toMatchObject(blockNumberMockResponse)
		})
	})
})
