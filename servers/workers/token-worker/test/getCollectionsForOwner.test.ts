import tokenDefaultExport, { worker } from '../src/index'
import {
    alchmeyGetCollectionsMock,
    alchmeyGetCollectionsMockPage2,
    infuraGetCollectionMock,
    infuraGetCollectionMockPage2,
} from './mocks'

const ALCHEMY_URL = 'https://eth-mainnet.g.alchemy.com'
const GET_COLLECTIONS_PATH_ALCHEMY = '/nft/v3/fake_key/getContractsForOwner?owner=0x12345' // need to add back &includeFilters[]=SPAM if we add in handler
const GET_COLLECTIONS_PATH_ALCHEMY_PAGE_2 =
    '/nft/v3/fake_key/getContractsForOwner?owner=0x12345&pageKey=abcd' // need to add back &includeFilters[]=SPAM if we add in handler

const INFURA_URL = 'https://nft.api.infura.io'
const GET_COLLECTIONS_PATH_INFURA = `/networks/1/accounts/0x12345/assets/collections?cursor=`
const GET_COLLECTIONS_PATH_INFURA_PAGE_2 = `/networks/1/accounts/0x12345/assets/collections?cursor=abcd`

describe('getCollectionsForOwner()', () => {
    test('Returns unauthorized if not authorized request', async () => {
        const bindings = getMiniflareBindings()
        const response = await tokenDefaultExport.fetch(
            new Request('https://fake.com/api/getCollectionsForOwner/al/eth-mainnet/0x12345', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer wrongkey`,
                },
            }),
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
            .reply(200, alchmeyGetCollectionsMock)

        origin
            .intercept({
                method: 'GET',
                path: GET_COLLECTIONS_PATH_ALCHEMY_PAGE_2,
            })
            .reply(200, alchmeyGetCollectionsMockPage2)

        const result = await worker.fetch(
            new Request('https://fake.com/api/getCollectionsForOwner/al/eth-mainnet/0x12345'),
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
            totalCount: alchmeyGetCollectionsMockPage2.totalCount,
            collections: [
                ...alchmeyGetCollectionsMock.contracts,
                ...alchmeyGetCollectionsMockPage2.contracts,
            ],
        }
        expect(await result.json()).toEqual(expected)
    })

    test('getCollectionsForOwner for infura', async () => {
        const fetchMock = getMiniflareFetchMock()

        fetchMock.disableNetConnect()

        const origin = fetchMock.get(INFURA_URL)

        origin
            .intercept({
                method: 'GET',
                path: GET_COLLECTIONS_PATH_INFURA,
            })
            .reply(200, infuraGetCollectionMock)

        origin
            .intercept({
                method: 'GET',
                path: GET_COLLECTIONS_PATH_INFURA_PAGE_2,
            })
            .reply(200, infuraGetCollectionMockPage2)

        const result = await worker.fetch(
            new Request('https://fake.com/api/getCollectionsForOwner/in/eth-mainnet/0x12345'),
            {
                ALCHEMY_API_KEY: 'fake_key',
                AUTH_SECRET: 'fake_secret',
                INFURA_API_KEY: 'fake_key',
                INFURA_API_SECRET: 'fake_secret',
                ENVIRONMENT: 'test',
            },
        )

        expect(result.status).toBe(200)

        const mapToAddress = (
            collections: {
                contract: string
                name: string
                symbol: string
                tokenType: string
            }[],
        ) => {
            return collections.map((c) => {
                const { contract, ...rest } = c
                return {
                    address: contract,
                    ...rest,
                }
            })
        }

        const expected = {
            totalCount: infuraGetCollectionMockPage2.total,
            collections: [
                ...mapToAddress(infuraGetCollectionMock.collections),
                ...mapToAddress(infuraGetCollectionMockPage2.collections),
            ],
        }
        expect(await result.json()).toEqual(expected)
    })
})
