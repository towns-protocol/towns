import { worker } from '../src/index'
import { TokenType } from '../src/types'
import { getContractMetadataMock } from './mocks'

const TOKEN_ADDRESS = '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d'

test('/tokenBalance', async () => {
    const fetchMock = getMiniflareFetchMock()

    fetchMock.disableNetConnect()

    // not sure how to mock rpc calls from viem to networks
    // so this test assumes all rpc calls are failures, resulting in a balance of 0

    // mock every rpc url
    // const interceptables = nftNetworkMap.map((network) => {
    //     const url = new URL(`https://eth-mainnet.g.alchemy.com/v2/fake_key`)
    //     return fetchMock.get(url.origin)
    // })

    const result = await worker.fetch(
        new Request(
            'https://fake-cloudflare-worker-url.com/api/tokenBalance?supportedChainIds=1,84532',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: {
                        address: TOKEN_ADDRESS,
                        tokenIds: [],
                        chainId: 1,
                        quantity: 1,
                        type: TokenType.ERC721,
                    },
                    wallets: ['0xf94b788Df43f79D8C0E12fFE715a79ed23202971'],
                    alchemyApiKey: 'fake_key',
                }),
            },
        ),
        {
            ALCHEMY_API_KEY: 'fake_key',
            AUTH_SECRET: 'fake_secret',
            SIMPLEHASH_API_KEY: 'fake_key',
            ENVIRONMENT: 'test',
        },
    )

    expect(result.status).toBe(200)
    expect(await result.json()).toEqual({
        data: {
            balance: 0,
            tokenAddress: TOKEN_ADDRESS,
        },
    })
})
