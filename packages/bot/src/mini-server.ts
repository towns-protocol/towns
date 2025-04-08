/* eslint-disable import/no-extraneous-dependencies */
import { Hono } from 'hono'
import { createConnectTransport } from '@connectrpc/connect-web'
import {
    Client,
    makeAppRegistryRpcClient,
    makeRiverConfig,
    makeRiverRpcClient,
    makeSignerContext,
    MockEntitlementsDelegate,
    RiverDbManager,
    userIdFromAddress,
} from '@towns-protocol/sdk'
import { ethers } from 'ethers'

const APP_REGISTRY_URL = 'http://localhost:8546'
const ENV = 'local_multi_ne'

// TODO: env and jwt should be env vars
const bot = async (mnemonic: string, env: string, jwt: string) => {
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

    // const AppRegistry = makeAppRegistryRpcClient(APP_REGISTRY_URL, jwt) // ?

    server.get('/webhook', (c) => c.json(c.req.query))
    return { server }
}

await bot('I LOVE MY WIFE', ENV, 'def-not-a-jwt-token')
// run hono server
