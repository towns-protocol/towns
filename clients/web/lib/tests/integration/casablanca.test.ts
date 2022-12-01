import { Client as CasablancaClient, makeZionRpcClient } from '@zion/client'
import { publicKeyToBuffer, SignerContext } from '@zion/core'
import { ethers } from 'ethers'

describe('casablanca', () => {
    jest.setTimeout(30 * 1000)
    test('test instantiating a casablanca client', async () => {
        const primaryWallet = ethers.Wallet.createRandom()
        const zionWallet = ethers.Wallet.createRandom()
        const delegateSig = await primaryWallet.signMessage(publicKeyToBuffer(zionWallet.publicKey))
        const context: SignerContext = {
            wallet: zionWallet,
            creatorAddress: primaryWallet.address,
            delegateSig: delegateSig,
        }
        console.log('new CasablancaClient', process.env.CASABLANCA_SERVER_URL)
        const rpcClient = makeZionRpcClient(process.env.CASABLANCA_SERVER_URL)
        const client = new CasablancaClient(context, rpcClient)
        await client.createNewUser()
        console.log('Finished', client)
    })
})
