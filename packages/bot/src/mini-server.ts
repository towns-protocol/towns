/* eslint-disable import/no-extraneous-dependencies */
import { Hono } from 'hono'
import {
    Client,
    makeRiverConfig,
    makeRiverRpcClient,
    makeSignerContext,
    MockEntitlementsDelegate,
    RiverDbManager,
    userIdFromAddress,
} from '@towns-protocol/sdk'
import { ethers } from 'ethers'

// const APP_REGISTRY_URL = 'http://localhost:5180'
const ENV = 'local_multi_ne'

// TODO: env and jwt should be env vars
const bot = async (mnemonic: string, env: string, jwt: string) => {
    if (!jwt) {
        throw new Error('JWT is required')
    }
    const server = new Hono()
    const wallet = ethers.Wallet.fromMnemonic(mnemonic)
    const delegateWallet = ethers.Wallet.createRandom()
    const signerContext = await makeSignerContext(wallet, delegateWallet)
    const config = makeRiverConfig(env)
    const riverProvider = new ethers.providers.StaticJsonRpcProvider(config.river.rpcUrl)
    const rpcClient = await makeRiverRpcClient(riverProvider, config.river.chainConfig)

    const userId = userIdFromAddress(signerContext.creatorAddress)
    const cryptoStore = RiverDbManager.getCryptoDb(userId)

    const client = new Client(
        signerContext,
        rpcClient,
        cryptoStore,
        new MockEntitlementsDelegate(), // argh is it okay?
    )

    // const AppRegistry = makeAppRegistryRpcClient(APP_REGISTRY_URL, sessionToken) // ?

    server.post('/webhook', (c) => {
        if (c.req.header('Authorization')?.replace('Bearer ', '') !== jwt) {
            return c.json({ error: 'Unauthorized' }, 401)
        }
        // get envelope from body?
        // process envelope using the client
        // return 200
        return c.json({ message: 'Hello, world!' })
    })
    return { server }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
;(async () => {
    await bot('I LOVE MY WIFE', ENV, 'def-not-a-jwt-token')
    // run hono server
})()
