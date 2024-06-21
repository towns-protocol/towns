import { worker } from '../src/index'
import { getCollectionMetadataAlchemyMock, getContractMetadataMock } from './mocks'

const ALCHEMY_URL = 'https://eth-mainnet.g.alchemy.com'
const ALCHEMY_GET_CONTRACT_METADATA_PATH =
    '/nft/v3/fake_key/getContractMetadata?contractAddress=0x1234'

describe('getCollectionMetadata()', () => {
    test('alchemy: getCollectionMetadata()', async () => {
        const fetchMock = getMiniflareFetchMock()

        fetchMock.disableNetConnect()

        const origin = fetchMock.get(ALCHEMY_URL)

        origin
            .intercept({
                method: 'GET',
                path: ALCHEMY_GET_CONTRACT_METADATA_PATH,
            })
            .reply(200, getCollectionMetadataAlchemyMock)

        const result = await worker.fetch(
            new Request(
                'https://fake-cloudflare-worker-url.com/api/getCollectionMetadata/alchemy/1?contractAddress=0x1234&supportedChainIds=1,84532',
            ),
            {
                ALCHEMY_API_KEY: 'fake_key',
                AUTH_SECRET: 'fake_secret',
                SIMPLEHASH_API_KEY: 'fake_key',
                ENVIRONMENT: 'test',
            },
        )

        expect(result.status).toBe(200)
        expect(await result.json()).toEqual(getContractMetadataMock)
    })
})
