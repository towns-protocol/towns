import { LocalhostWeb3Provider, SpaceDapp, getWeb3Deployment } from '@river-build/web3'
import { Permission, CreateSpaceParams } from '@river-build/web3'
import { paymasterProxyMiddleware } from '../src/paymasterProxyMiddleware'
import { ethers } from 'ethers'
import { nanoid } from 'nanoid'
import { TestUserOps } from './TestUserOps'
import { NoopRuleData } from '@river-build/web3/src'

// FOR NOW these tests only work against stackup bundler/paymaster
describe.skip('UserOpSpaceDapp tests', () => {
    test('can send createTown user op', async () => {
        const bob = new LocalhostWeb3Provider(process.env.RPC_URL as string)
        await bob.ready
        const baseConfig = getWeb3Deployment(process.env.RIVER_ENV as string).base // see util.test.ts for loading from env

        // ANVIL
        // also mint the mock nft in case there's gating on creating a space
        if (!process.env.VITE_AA_PAYMASTER_PROXY_URL) {
            await bob.fundWallet()
        }

        const spaceDapp = new SpaceDapp(baseConfig, bob)

        const userOps = new TestUserOps({
            provider: spaceDapp.provider,
            config: spaceDapp.config,
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
            rootKeyAddress: bob.wallet.address as `0x${string}`,
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
        const spaceAddress = spaceDapp.getSpaceAddress(txReceipt)
        expect(spaceAddress).toBeDefined()
        const spaceId = '10' + spaceAddress!.slice(2) + '0'.repeat(64 - spaceAddress!.length)

        let town
        try {
            town = await (await spaceDapp.getSpace(spaceId))?.getSpaceInfo()
        } catch (error) {
            throw new Error("can't fetch town data: " + JSON.stringify(error))
        }
        // this fails for local anvil tests
        expect(town?.networkId).toBe(spaceId)
    })
})

function createSpaceParams({ feeRecipient }: { feeRecipient: string }): CreateSpaceParams {
    const spaceId: string = `SPCE-${nanoid()}`
    const channelId: string = `CHAN-${nanoid()}`
    const name = `${spaceId}__${new Date().getTime()}`
    const channelName = `${channelId}__${new Date().getTime()}`

    return {
        spaceName: name,
        spaceMetadata: name,
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
                users: [],
                ruleData: NoopRuleData,
            },
        },
    }
}
