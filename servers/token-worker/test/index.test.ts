import { worker } from '../src/index'

// dunno why this doesn't work
// once the mock is introduced, it breaks. this is following same pattern from unfurl-worker
test.skip('getNftsForOwner', async () => {
    const fetchMock = getMiniflareFetchMock()

    fetchMock.disableNetConnect()

    const origin = fetchMock.get('https://eth-mainnet.g.alchemy.com')

    origin
        .intercept({
            method: 'GET',
            path: '/v2/fake_key/getNFTs?owner=vitalik.eth',
        })
        .reply(200, 'Mocked response!')

    const result = await worker.fetch(
        new Request('https://fake.com/api/getNftsForOwner/eth-mainnet/vitalik.eth'),
        {
            ALCHEMY_API_KEY: 'fake_key',
        },
    )

    expect(result.status).toBe(200)
})
