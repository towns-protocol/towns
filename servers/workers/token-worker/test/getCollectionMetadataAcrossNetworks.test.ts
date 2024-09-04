import { worker } from '../src/index'
import { ContractMetadata, TokenType } from '../src/types'
import {
    getCollectionMetadataAlchemyMock,
    getContractMetadataMock,
    getErc20MetadataAlchemyMock,
} from './mocks'
import { MockAgent } from 'undici'
import { Env } from '../src/types'

const ALCHEMY_URL = 'https://eth-mainnet.g.alchemy.com'
const ALCHEMY_GET_CONTRACT_METADATA_PATH =
    '/nft/v3/fake_key/getContractMetadata?contractAddress=0x1234'
const ALCHEMY_GET_ERC20_METADATA_PATH = '/v2/fake_key'

describe('getCollectionMetadataAcrossNetworks()', () => {
    let fetchMock: MockAgent
    let env: Env

    beforeEach(() => {
        fetchMock = getMiniflareFetchMock()
        fetchMock.disableNetConnect()

        env = {
            ALCHEMY_API_KEY: 'fake_key',
            AUTH_SECRET: 'fake_secret',
            SIMPLEHASH_API_KEY: 'fake_key',
            ENVIRONMENT: 'test' as const,
        }
    })

    test('alchemy: getCollectionMetadataAcrossNetworks() for NFT', async () => {
        const origin = fetchMock.get(ALCHEMY_URL)

        origin
            .intercept({
                method: 'GET',
                path: ALCHEMY_GET_CONTRACT_METADATA_PATH,
            })
            .reply(200, getCollectionMetadataAlchemyMock)

        const nftResult = await worker.fetch(
            new Request(
                'https://fake-cloudflare-worker-url.com/api/getCollectionMetadataAcrossNetworks/alchemy?contractAddress=0x1234&supportedChainIds=1,84532',
            ),
            env,
        )

        expect(nftResult.status).toBe(200)

        const nftResponseData = await nftResult.json()

        console.log('NFT Response data:', JSON.stringify(nftResponseData, null, 2))

        expect(nftResponseData).toHaveLength(2)
        const nftChainId1Data = nftResponseData.find((item: any) => item.chainId === 1)
        expect(nftChainId1Data).toBeDefined()
        expect(nftChainId1Data.data as ContractMetadata).toMatchObject(getContractMetadataMock)

        const nftChainId84532Data = nftResponseData.find((item: any) => item.chainId === 84532)
        expect(nftChainId84532Data.data as ContractMetadata).toMatchObject({
            tokenType: TokenType.NOT_A_CONTRACT,
        })
    })

    test('alchemy: getCollectionMetadataAcrossNetworks() for NFT with specific chainId', async () => {
        const origin = fetchMock.get(ALCHEMY_URL)

        origin
            .intercept({
                method: 'GET',
                path: ALCHEMY_GET_CONTRACT_METADATA_PATH,
            })
            .reply(200, getCollectionMetadataAlchemyMock)

        const nftResult = await worker.fetch(
            new Request(
                'https://fake-cloudflare-worker-url.com/api/getCollectionMetadataAcrossNetworks/alchemy?contractAddress=0x1234&supportedChainIds=1,84532&chainId=1',
            ),
            env,
        )

        expect(nftResult.status).toBe(200)

        const nftResponseData = await nftResult.json()

        console.log(
            'NFT Response data with specific chainId:',
            JSON.stringify(nftResponseData, null, 2),
        )

        expect(nftResponseData).toHaveLength(1)
        const nftChainId1Data = nftResponseData[0]
        expect(nftChainId1Data.chainId).toBe(1)
        expect(nftChainId1Data.data as ContractMetadata).toMatchObject(getContractMetadataMock)

        const nftChainId84532Data = nftResponseData.find((item: any) => item.chainId === 84532)
        expect(nftChainId84532Data).toBeUndefined()
    })

    test('alchemy: getCollectionMetadataAcrossNetworks() for ERC20', async () => {
        const origin = fetchMock.get(ALCHEMY_URL)

        // only intercept for mainnet, base-sepolia will fail
        origin
            .intercept({
                method: 'POST',
                path: ALCHEMY_GET_ERC20_METADATA_PATH,
            })
            .reply(200, getErc20MetadataAlchemyMock)

        const erc20Result = await worker.fetch(
            new Request(
                'https://fake-cloudflare-worker-url.com/api/getCollectionMetadataAcrossNetworks/alchemy?contractAddress=0x5678&supportedChainIds=1,84532',
            ),
            env,
        )

        const erc20ResponseData = await erc20Result.json()

        console.log('ERC20 Response data:', JSON.stringify(erc20ResponseData, null, 2))

        expect(erc20ResponseData).toHaveLength(2)
        expect(erc20ResponseData).toBeDefined()
        expect(erc20ResponseData).toMatchObject([
            {
                chainId: 1,
                data: {
                    address: '0x5678',
                    decimals: 18,
                    imageUrl: 'https://static.alchemyapi.io/images/assets/3408.png',
                    name: 'USDC',
                    symbol: 'USDC',
                    tokenType: 'ERC20',
                },
            },
            {
                chainId: 84532,
                data: {
                    tokenType: TokenType.NOT_A_CONTRACT,
                },
            },
        ])
    })
})
