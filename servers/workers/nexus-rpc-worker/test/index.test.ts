import { worker } from '../src/index'

const blockNumberMockResponse = {
	jsonrpc: '2.0',
	id: 1,
	result: '0x4b7', // 1207
}

describe('rpc worker tests', () => {
	const NEXUS_GLOBAL_ACCESS_KEY = 'my-dev-key'
	const NEXUS_ALCHEMY_KEY = 'my-alchemy-key'
	const BASE_SEPOLIA_ENDPOINT = `https://falcon.com/base/sepolia?key=${NEXUS_GLOBAL_ACCESS_KEY}`
	const BASE_GOERLI_ENDPOINT = `https://falcon.com/base/goerli?key=${NEXUS_GLOBAL_ACCESS_KEY}`

	beforeEach(() => {
		const fetchMock = getMiniflareFetchMock()
		fetchMock.disableNetConnect()

		const goerliOrigin = fetchMock.get('https://base-goerli.g.alchemy.com')
		goerliOrigin
			.intercept({ method: 'POST', path: () => true })
			.reply(200, blockNumberMockResponse)

		const sepoliaOrigin = fetchMock.get('https://base-sepolia.g.alchemy.com')
		sepoliaOrigin
			.intercept({ method: 'POST', path: () => true })
			.reply(200, blockNumberMockResponse)
	})

	describe('alchemy is up', () => {
		it('GET /base/sepolia', async () => {
			const request = new Request(BASE_SEPOLIA_ENDPOINT, {
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
					chainId: 84532,
					networkName: 'base',
					chainName: 'sepolia',
				},
			})
		})

		it('GET /base/goerli', async () => {
			const request = new Request(BASE_GOERLI_ENDPOINT, {
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
					chainId: 84531,
					networkName: 'base',
					chainName: 'goerli',
				},
			})
		})

		it('POST /base/sepolia', async () => {
			const request = new Request(BASE_SEPOLIA_ENDPOINT, {
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

		it('POST /base/goerli', async () => {
			const request = new Request(BASE_GOERLI_ENDPOINT, {
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
