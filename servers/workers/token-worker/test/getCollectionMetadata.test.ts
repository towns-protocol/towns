import { worker } from '../src/index'
import {
    getCollectionMetadataAlchemyMock,
    getCollectionMetadataInfuraMock,
    getContractMetadataMock,
} from './mocks'

const ALCHEMY_URL = 'https://eth-mainnet.g.alchemy.com'
const ALCHEMY_GET_CONTRACT_METADATA_PATH =
    '/nft/v2/fake_key/getContractMetadata?contractAddress=0x1234'

const INFURA_URL = 'https://nft.api.infura.io'
const INFURA_GET_CONTRACT_METADATA_PATH = '/networks/1/nfts/0x1234'

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
                'https://fake-cloudflare-worker-url.com/api/getCollectionMetadata/al/eth-mainnet?contractAddress=0x1234',
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
        expect(await result.json()).toEqual(getContractMetadataMock)
    })
    test('infura: getCollectionMetadata()', async () => {
        const fetchMock = getMiniflareFetchMock()

        fetchMock.disableNetConnect()

        const origin = fetchMock.get(INFURA_URL)

        origin
            .intercept({
                method: 'GET',
                path: INFURA_GET_CONTRACT_METADATA_PATH,
            })
            .reply(200, getCollectionMetadataInfuraMock)

        const result = await worker.fetch(
            new Request(
                'https://fake-cloudflare-worker-url.com/api/getCollectionMetadata/in/eth-mainnet?contractAddress=0x1234',
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
        // infura has no image, so we need to remove it from the mock
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { imageUrl: _, ...mockWithoutImage } = getContractMetadataMock
        expect(await result.json()).toEqual(mockWithoutImage)
    })
})
