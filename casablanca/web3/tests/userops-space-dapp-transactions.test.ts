import { UserOpSpaceDapp } from '../src/v3/UserOpSpaceDapp'
import { TestWeb3Provider } from './TestWeb3Provider'
import { Permission } from '../src/ContractTypes'
import { CreateSpaceParams } from '../src/ISpaceDapp'
import { ethers } from 'ethers'
import { nanoid } from 'nanoid'

// FOR NOW these tests only work against stackup bundler/paymaster
describe.skip('UserOpSpaceDapp tests', () => {
    test('can send createTown user op', async () => {
        const bob = await TestWeb3Provider.init()

        // ANVIL
        // also mint the mock nft in case there's gating on creating a space
        if (!process.env.PAYMASTER_PROXY_URL) {
            await bob.mintMockNFT()
        }

        const spaceDapp = new UserOpSpaceDapp({
            chainId: bob.network.chainId,
            provider: bob,
            bundlerUrl: process.env.BUNDLER_URL,
            paymasterProxyUrl: process.env.PAYMASTER_PROXY_URL,
            paymasterProxyAuthSecret: process.env.PAYMASTER_PROXY_AUTH_SECRET,
            rpcUrl: process.env.RPC_URL!,
            entryPointAddress: process.env.ENTRY_POINT_ADDRESS,
            factoryAddress: process.env.FACTORY_ADDRESS,
        })

        const abstractAccount = await spaceDapp.getAbstractAccountAddress({
            signer: bob.wallet,
        })

        // ANVIL
        // must fund the AA wallet to pass gas verification checks b/c no paymaster
        // also mint the mock nft in case there's gating on creating a space
        if (!process.env.PAYMASTER_PROXY_URL) {
            await bob.mintMockNFT(abstractAccount)
        }

        const townInfo = createSpaceParams({ feeRecipient: bob.wallet.address })

        const op = await spaceDapp.sendCreateSpaceOp([townInfo, bob.wallet], {
            url: process.env.PAYMASTER_PROXY_URL!,
        })
        op.userOpHash
        const opReceipt = await op.wait()
        expect(opReceipt?.transactionHash).toBeDefined()
        const txReceipt = await bob.waitForTransaction(opReceipt!.transactionHash)
        // FOR anvil: the tx was a success
        expect(txReceipt?.status).toBe(1)
        // BUT the op failed
        expect(opReceipt?.args.success).toBe(true)
        let town
        try {
            town = await (await spaceDapp.getTown(townInfo.spaceId)).getTownInfo()
        } catch (error) {
            throw new Error("can't fetch town data: " + JSON.stringify(error))
        }
        // this fails for local anvil tests
        expect(town?.networkId).toBe(townInfo.spaceId)
    })

    test('can send joinTown user op', async () => {
        const bob = await TestWeb3Provider.init()
        const alice = await TestWeb3Provider.init()

        const bobSpaceDapp = new UserOpSpaceDapp({
            chainId: bob.network.chainId,
            provider: bob,
            bundlerUrl: process.env.BUNDLER_URL,
            rpcUrl: process.env.RPC_URL!,
            entryPointAddress: process.env.ENTRY_POINT_ADDRESS,
            factoryAddress: process.env.FACTORY_ADDRESS,
        })
        const alicSpaceDapp = new UserOpSpaceDapp({
            chainId: alice.network.chainId,
            provider: alice,
            bundlerUrl: process.env.BUNDLER_URL,
            rpcUrl: process.env.RPC_URL!,
            entryPointAddress: process.env.ENTRY_POINT_ADDRESS,
            factoryAddress: process.env.FACTORY_ADDRESS,
        })
        try {
            const spaceParams = createSpaceParams({ feeRecipient: bob.wallet.address })
            const spaceOp = await bobSpaceDapp.sendCreateSpaceOp([spaceParams, bob.wallet], {
                url: process.env.PAYMASTER_PROXY_URL!,
            })
            await spaceOp.wait()
            const op = await alicSpaceDapp.sendJoinTownOp(
                [spaceParams.spaceId, alice.wallet.address, alice.wallet],
                {
                    url: process.env.PAYMASTER_PROXY_URL!,
                },
            )
            const receipt = await op.wait()
            expect(receipt?.transactionHash).toBeDefined()
            expect(receipt?.args.success).toBeDefined()
        } catch (error: any) {
            throw new Error('Failed joinTown user op')
        }
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
