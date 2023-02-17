import { worker } from '../src/index'
import { getContractMetadataAlchemyMock, getContractMetadataMock } from './mocks'

const ALCHEMY_URL = 'https://eth-mainnet.g.alchemy.com'
const GET_CONTRACT_METADATA_PATH =
    '/v2/fake_key/getContractMetadata?contractAddress=0xe785E82358879F061BC3dcAC6f0444462D4b5330'

test('getContractMetadata()', async () => {
    const fetchMock = getMiniflareFetchMock()

    fetchMock.disableNetConnect()

    const origin = fetchMock.get(ALCHEMY_URL)

    origin
        .intercept({
            method: 'GET',
            path: GET_CONTRACT_METADATA_PATH,
        })
        .reply(200, getContractMetadataAlchemyMock)

    const result = await worker.fetch(
        new Request(
            'https://fake.com/api/getContractMetadata/eth-mainnet?contractAddress=0xe785E82358879F061BC3dcAC6f0444462D4b5330',
        ),
        {
            ALCHEMY_API_KEY: 'fake_key',
            AUTH_SECRET: 'fake_secret',
        },
    )

    expect(result.status).toBe(200)
    expect(await result.json()).toEqual(getContractMetadataMock)
})
