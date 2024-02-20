import { worker } from '../src/index'
import { getCollectionMetadataAlchemyMock, getContractMetadataMock } from './mocks'

const ALCHEMY_URL = 'https://eth-mainnet.g.alchemy.com'
const ALCHEMY_GET_CONTRACT_METADATA_PATH =
    '/nft/v3/fake_key/getContractMetadata?contractAddress=0x1234'

describe('getCollectionMetadataAcrossNetworks()', () => {
    test('alchemy: getCollectionMetadataAcrossNetworks()', async () => {
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
                'https://fake-cloudflare-worker-url.com/api/getCollectionMetadataAcrossNetworks/alchemy?contractAddress=0x1234',
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

        const expected = [
            {
                chainId: 1,
                data: getContractMetadataMock,
            },
            {
                chainId: 42161,
                data: undefined,
            },
            {
                chainId: 10,
                data: undefined,
            },
            {
                chainId: 8453,
                data: undefined,
            },
            {
                chainId: 84532,
                data: undefined,
            },
        ]
        expect(await result.json()).toEqual(expected)
    })
})
