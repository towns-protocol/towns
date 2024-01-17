import { TestSpaceDapp } from '@river/web3/tests/TestSpaceDapp'
import { TestWeb3Provider } from '@river/web3/tests/TestWeb3Provider'
import { Permission, CreateSpaceParams, ISpaceDapp } from '@river/web3'
import { paymasterProxyMiddleware } from '../paymasterProxyMiddleware'
import { ethers } from 'ethers'
import { nanoid } from 'nanoid'
import { TestUserOps } from './TestUserOps'

// FOR NOW these tests only work against stackup bundler/paymaster
describe('UserOpSpaceDapp tests', () => {
    test('can send createTown user op', async () => {
        const bob = await TestWeb3Provider.init()

        // ANVIL
        // also mint the mock nft in case there's gating on creating a space
        if (!process.env.VITE_AA_PAYMASTER_PROXY_URL) {
            await bob.fundWallet()
        }

        const spaceDapp = new TestSpaceDapp({
            chainId: bob.network.chainId,
            provider: bob,
        }) as unknown as ISpaceDapp

        const userOps = new TestUserOps({
            provider: spaceDapp.provider,
            spaceDapp,
            bundlerUrl: process.env.VITE_AA_BUNDLER_URL,
            paymasterProxyUrl: process.env.VITE_AA_PAYMASTER_PROXY_URL,
            aaRpcUrl: process.env.VITE_AA_RPC_URL!,
            entryPointAddress: process.env.VITE_AA_ENTRY_POINT_ADDRESS,
            factoryAddress: process.env.VITE_AA_FACTORY_ADDRESS,
            paymasterMiddleware: paymasterProxyMiddleware({
                paymasterProxyAuthSecret: process.env.VITE_AA_PAYMASTER_PROXY_AUTH_SECRET!,
            }),
        })

        const abstractAccount = await userOps.getAbstractAccountAddress({
            signer: bob.wallet,
        })

        // ANVIL
        // must fund the AA wallet to pass gas verification checks b/c no paymaster
        // also mint the mock nft in case there's gating on creating a space
        if (!process.env.VITE_AA_PAYMASTER_PROXY_URL) {
            await bob.fundWallet(abstractAccount)
        }

        const townInfo = createSpaceParams({ feeRecipient: bob.wallet.address })

        const op = await userOps.sendCreateSpaceOp([townInfo, bob.wallet])

        const opReceipt = await op.wait()
        expect(opReceipt?.transactionHash).toBeDefined()
        const txReceipt = await bob.waitForTransaction(opReceipt!.transactionHash)
        // FOR anvil: the tx was a success
        expect(txReceipt?.status).toBe(1)
        // BUT the op failed
        expect(opReceipt?.args.success).toBe(true)
        let town
        try {
            town = await (await spaceDapp.getTown(townInfo.spaceId))?.getTownInfo()
        } catch (error) {
            throw new Error("can't fetch town data: " + JSON.stringify(error))
        }
        // this fails for local anvil tests
        expect(town?.networkId).toBe(townInfo.spaceId)
    })
})

function createSpaceParams({ feeRecipient }: { feeRecipient: string }): CreateSpaceParams {
    const spaceId: string = `SPCE-${nanoid()}`
    const channelId: string = `CHAN-${nanoid()}`
    const name = `${spaceId}__${new Date().getTime()}`
    const channelName = `${channelId}__${new Date().getTime()}`

    return {
        spaceId,
        spaceName: name,
        spaceMetadata: name,
        channelId,
        channelName,
        membership: {
            settings: {
                name: 'Everyone',
                symbol: 'MEMBER',
                price: 0,
                maxSupply: 100,
                duration: 0,
                currency: ethers.constants.AddressZero,
                feeRecipient,
                freeAllocation: 0,
                pricingModule: ethers.constants.AddressZero,
            },
            permissions: [Permission.Read, Permission.Write],
            requirements: {
                everyone: true,
                tokens: [],
                users: [],
                rule: ethers.constants.AddressZero,
            },
        },
    }
}
