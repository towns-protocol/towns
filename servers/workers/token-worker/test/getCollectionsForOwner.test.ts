import tokenDefaultExport, { worker } from '../src/index'
import { alchemyGetCollectionsMock, alchemyGetCollectionsMockPage2 } from './mocks'

const ALCHEMY_URL = 'https://eth-mainnet.g.alchemy.com'
const GET_COLLECTIONS_PATH_ALCHEMY =
    '/nft/v3/fake_key/getContractsForOwner?owner=0x12345&withMetadata=true' // need to add back &includeFilters[]=SPAM if we add in handler
const GET_COLLECTIONS_PATH_ALCHEMY_PAGE_2 =
    '/nft/v3/fake_key/getContractsForOwner?owner=0x12345&withMetadata=true&pageKey=abcd' // need to add back &includeFilters[]=SPAM if we add in handler

describe('getCollectionsForOwner()', () => {
    test('Returns unauthorized if not authorized request', async () => {
        const bindings = getMiniflareBindings()
        const response = await tokenDefaultExport.fetch(
            new Request(
                'https://fake.com/api/getCollectionsForOwner/alchemy/eth-mainnet/0x12345?supportedChainIds=1,84532',
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

    test('getCollectionsForOwner for alchemy', async () => {
        const fetchMock = getMiniflareFetchMock()

        fetchMock.disableNetConnect()

        const origin = fetchMock.get(ALCHEMY_URL)

        origin
            .intercept({
                method: 'GET',
                path: GET_COLLECTIONS_PATH_ALCHEMY,
            })
            .reply(200, alchemyGetCollectionsMock)

        origin
            .intercept({
                method: 'GET',
                path: GET_COLLECTIONS_PATH_ALCHEMY_PAGE_2,
            })
            .reply(200, alchemyGetCollectionsMockPage2)

        const result = await worker.fetch(
            new Request(
                'https://fake.com/api/getCollectionsForOwner/alchemy/1/0x12345?supportedChainIds=1,84532',
            ),
            {
                ALCHEMY_API_KEY: 'fake_key',
                AUTH_SECRET: 'fake_secret',
                SIMPLEHASH_API_KEY: 'fake_key',
                ENVIRONMENT: 'test',
            },
        )

        expect(result.status).toBe(200)

        const expected = {
            totalCount: alchemyGetCollectionsMockPage2.totalCount,
            collections: [
                ...alchemyGetCollectionsMock.contracts,
                ...alchemyGetCollectionsMockPage2.contracts,
            ],
        }
        expect(await result.json()).toEqual(expected)
    })
})
