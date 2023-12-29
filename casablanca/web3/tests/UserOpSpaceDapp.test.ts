import { UserOpSpaceDapp } from '../src/v3/UserOpSpaceDapp'
import { TestWeb3Provider } from './TestWeb3Provider'
import { Permission } from '../src/ContractTypes'
import { CreateSpaceParams } from '../src/ISpaceDapp'
import { ethers } from 'ethers'
import { nanoid } from 'nanoid'

describe.skip('UserOpSpaceDapp user op tests', () => {
    test('can send createTown user op', async () => {
        const provider = await TestWeb3Provider.init()
        // await provider.mintMockNFT()
        expect(process.env.PAYMASTER_URL).toBeDefined()

        const spaceDapp = await UserOpSpaceDapp.init({
            chainId: provider.network.chainId,
            provider,
            bundlerUrl: process.env.BUNDLER_URL,
            rpcUrl: process.env.RPC_URL!,
            entryPointAddress: process.env.ENTRY_POINT_ADDRESS,
            factoryAddress: process.env.FACTORY_ADDRESS,
        })

        try {
            const op = await spaceDapp.sendCreateSpaceOp(
                [createSpaceParams({ feeRecipient: provider.wallet.address }), provider.wallet],
                {
                    url: process.env.PAYMASTER_URL!,
                },
            )
            const receipt = await op.wait()
            expect(receipt?.transactionHash).toBeDefined()
        } catch (error: any) {
            throw new Error("can't send createTown user op")
        }
    })

    test('can send joinTown user op', async () => {
        const bob = await TestWeb3Provider.init()
        const alice = await TestWeb3Provider.init()
        // await provider.mintMockNFT()

        const bobSpaceDapp = await UserOpSpaceDapp.init({
            chainId: bob.network.chainId,
            provider: bob,
            bundlerUrl: process.env.BUNDLER_URL,
            rpcUrl: process.env.RPC_URL!,
            entryPointAddress: process.env.ENTRY_POINT_ADDRESS,
            factoryAddress: process.env.FACTORY_ADDRESS,
        })
        const alicSpaceDapp = await UserOpSpaceDapp.init({
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
                url: process.env.PAYMASTER_URL!,
            })
            await spaceOp.wait()
            const op = await alicSpaceDapp.sendJoinTownOp(
                [spaceParams.spaceId, alice.wallet.address, alice.wallet],
                {
                    url: process.env.PAYMASTER_URL!,
                },
            )
            const receipt = await op.wait()
            expect(receipt?.transactionHash).toBeDefined()
        } catch (error: any) {
            throw new Error('Failed joinTown user op')
        }
    })
})

function createSpaceParams({ feeRecipient }: { feeRecipient: string }): CreateSpaceParams<'v3'> {
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
