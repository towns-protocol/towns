import tokenDefaultExport, { worker } from '../src/index'
import { getNftsContractMetaMock, getNftsMock, getNftsMockPage2 } from './mocks'

const ALCHEMY_URL = 'https://eth-mainnet.g.alchemy.com'
const GET_NFTS_PATH = '/v2/fake_key/getNFTs?owner=vitalik.eth&pageKey=&filters[]=SPAM'
const GET_NFTS_PAGE_2 = '/v2/fake_key/getNFTs?owner=vitalik.eth&pageKey=b&filters[]=SPAM'

// 4.4.23 - getNftsForOwner() not being used
describe.skip('getNftsForOwner()', () => {
    test('Returns unauthorized if not authorized request', async () => {
        const bindings = getMiniflareBindings()
        const response = await tokenDefaultExport.fetch(
            new Request(
                'https://fake.com/api/getNftsForOwner/eth-mainnet/vitalik.eth?contractMetadata',
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer wrongkey`,
                    },
                },
            ),
            bindings,
        )
        expect(response.status).toBe(401)
    })

    test('getNftsForOwner', async () => {
        const fetchMock = getMiniflareFetchMock()

        fetchMock.disableNetConnect()

        const origin = fetchMock.get(ALCHEMY_URL)

        origin
            .intercept({
                method: 'GET',
                path: GET_NFTS_PATH,
            })
            .reply(200, getNftsMock)

        const result = await worker.fetch(
            new Request('https://fake.com/api/getNftsForOwner/eth-mainnet/vitalik.eth'),
            {
                ALCHEMY_API_KEY: 'fake_key',
                AUTH_SECRET: 'fake_secret',
                INFURA_API_KEY: 'fake_key',
                INFURA_API_SECRET: 'fake_secret',
                ENVIRONMENT: 'test',
            },
        )

        expect(result.status).toBe(200)
        expect(await result.json()).toEqual(getNftsMock)
    })

    test('getNftsForOwner with "contractMetadata" query parameter', async () => {
        const fetchMock = getMiniflareFetchMock()

        fetchMock.disableNetConnect()

        const origin = fetchMock.get(ALCHEMY_URL)

        origin
            .intercept({
                method: 'GET',
                path: GET_NFTS_PATH,
            })
            .reply(200, getNftsMock)

        const result = await worker.fetch(
            new Request(
                'https://fake.com/api/getNftsForOwner/eth-mainnet/vitalik.eth?contractMetadata',
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
        expect(await result.json()).toEqual(getNftsContractMetaMock)
    })

    test('getNftsForOwner with "all" query parameter', async () => {
        const fetchMock = getMiniflareFetchMock()

        fetchMock.disableNetConnect()

        const origin = fetchMock.get(ALCHEMY_URL)

        origin
            .intercept({
                method: 'GET',
                path: GET_NFTS_PATH,
            })
            .reply(200, getNftsMock)

        origin
            .intercept({
                method: 'GET',
                path: GET_NFTS_PAGE_2,
            })
            .reply(200, getNftsMockPage2)

        const result = await worker.fetch(
            new Request('https://fake.com/api/getNftsForOwner/eth-mainnet/vitalik.eth?all'),
            {
                ALCHEMY_API_KEY: 'fake_key',
                AUTH_SECRET: 'fake_secret',
                INFURA_API_KEY: 'fake_key',
                INFURA_API_SECRET: 'fake_secret',
                ENVIRONMENT: 'test',
            },
        )

        expect(result.status).toBe(200)

        const expected = {
            ...getNftsMockPage2,
            ownedNfts: [...getNftsMock.ownedNfts, ...getNftsMockPage2.ownedNfts],
        }
        expect(await result.json()).toEqual(expected)
    })
})
