import { SiweMessage } from 'siwe'
import { ethers } from 'ethers'
import { AuthEnv, Environment } from '..'
import { Permission } from 'use-zion-client/src/client/web3/ContractTypes'

export interface Env extends AuthEnv {
    // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
    // MY_KV_NAMESPACE: KVNamespace
    //
    // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
    // MY_DURABLE_OBJECT: DurableObjectNamespace
    //
    // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
    // MY_BUCKET: R2Bucket
    INFURA_API_KEY: string
    ENVIRONMENT: Environment
    VERIFY: string
}

const GOERLI_RPC_URL = 'https://goerli.infura.io/v3/'
const LOCALHOST_RPC_URL = 'http://127.0.0.1:8545' // not localhost
const SEPOLIA_RPC_URL = 'https://sepolia.infura.io/v3/'

const providerMap = new Map<string, string>([
    ['development', LOCALHOST_RPC_URL],
    ['test', GOERLI_RPC_URL],
    ['production', SEPOLIA_RPC_URL],
])

const GOERLI = 5

const PERMISSION = Permission.ModifySpaceSettings

export async function verifySiweMessage(
    request: Request,
    env: Env,
    verifyUser = false,
): Promise<Response> {
    const { message, signature, spaceId, userId } = (await request.json()) as {
        message: string
        signature: string
        spaceId?: string
        userId?: string
    }

    const siweMessage = new SiweMessage(message)
    await siweMessage.verify({ signature: signature })
    if (!verifyUser) {
        // Need to setup provider with skipFetchSetup flag
        // See issue: https://github.com/ethers-io/ethers.js/issues/1886
        // TODO: consider moving `providerMap` to env vars
        const network = ethers.providers.getNetwork(siweMessage.chainId)
        const provider = new ethers.providers.StaticJsonRpcProvider(
            {
                url:
                    env.ENVIRONMENT == 'development'
                        ? `${providerMap.get(env.ENVIRONMENT)}`
                        : `${providerMap.get(env.ENVIRONMENT)}${env.INFURA_API_KEY}`,
                skipFetchSetup: true,
            },
            network,
        )
        const isSpaceOwner = await verifySpaceOwner(
            spaceId as string,
            siweMessage.address,
            siweMessage.chainId,
            provider,
        )
        if (isSpaceOwner) {
            return new Response(`OK`)
        }
    } else {
        // verify user matches address implied by signature
        if (siweMessage.address === userId) {
            return new Response(`OK`)
        }
    }
    return new Response(`Unauthorized`, { status: 401 })
}

export async function verifySpaceOwner(
    spaceId: string,
    address: string,
    chainId: number = GOERLI,
    provider: ethers.providers.StaticJsonRpcProvider,
): Promise<boolean> {
    // Using CommonJs import syntax to workaround a bug in importing this module.
    // https://linear.app/hnt-labs/issue/HNT-2243/bug-in-import-of-istaticcontractsinfo-to-workers
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require('use-zion-client/src/client/web3/SpaceDappFactory')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const createSpaceDapp = module.createSpaceDapp
    console.log('siweVerification verifySpaceOwner() params', {
        chainId,
        spaceId: decodeURIComponent(spaceId),
        address,
    })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const spaceDapp = createSpaceDapp(chainId, provider)
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const hasPermission: boolean = await spaceDapp.isEntitledToSpace(
            decodeURIComponent(spaceId),
            address,
            PERMISSION,
        )
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return hasPermission
    } catch (error) {
        console.error('spaceDapp.isEntitled error', (error as Error).message)
        return false
    }
}
