import { worker } from '../src/index'

const ALCHEMY_URL = 'https://eth-mainnet.g.alchemy.com'
const IS_HOLDER_OF_COLLECTION_PATH =
    '/nft/v2/fake_key/isHolderOfCollection?wallet=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&contractAddress=0xe785E82358879F061BC3dcAC6f0444462D4b5330'

// 4.4.23 - isHolderOfCollection() not being used
test.skip('isHolderOfCollection()', async () => {
    const fetchMock = getMiniflareFetchMock()

    fetchMock.disableNetConnect()

    const origin = fetchMock.get(ALCHEMY_URL)

    origin
        .intercept({
            method: 'GET',
            path: IS_HOLDER_OF_COLLECTION_PATH,
        })
        .reply(200, { isHolderOfCollection: false })

    const result = await worker.fetch(
        new Request(
            'https://fake.com/api/isHolderOfCollection/eth-mainnet?wallet=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&contractAddress=0xe785E82358879F061BC3dcAC6f0444462D4b5330',
        ),
        {
            ALCHEMY_API_KEY: 'fake_key',
            AUTH_SECRET: 'fake_secret',
            INFURA_API_KEY: 'fake_key',
            INFURA_API_SECRET: 'fake_secret',
            ENVIRONMENT: 'test',
        },
    )

    expect(result.status).toBe(200)
    expect(await result.json()).toEqual({ isHolderOfCollection: false })
})
