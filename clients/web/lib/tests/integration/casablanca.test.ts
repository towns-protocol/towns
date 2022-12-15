/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { waitFor } from '@testing-library/dom'
import { Client as CasablancaClient, makeZionRpcClient } from '@zion/client'
import { publicKeyToBuffer, SignerContext } from '@zion/core'
import { ethers } from 'ethers'
import { Permission } from '../../src/client/web3/ZionContractTypes'
import { SpaceProtocol } from '../../src/client/ZionClientTypes'
import { RoomVisibility } from '../../src/types/matrix-types'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    registerAndStartClients,
} from './helpers/TestUtils'

describe('casablanca', () => {
    test('test instantiating a casablanca client', async () => {
        const primaryWallet = ethers.Wallet.createRandom()
        const delegateWallet = ethers.Wallet.createRandom()
        const delegateSig = await primaryWallet.signMessage(
            publicKeyToBuffer(delegateWallet.publicKey),
        )
        const context: SignerContext = {
            wallet: delegateWallet,
            creatorAddress: primaryWallet.address,
            delegateSig: delegateSig,
        }
        console.log('new CasablancaClient', process.env.CASABLANCA_SERVER_URL)
        const rpcClient = makeZionRpcClient(process.env.CASABLANCA_SERVER_URL)
        const client = new CasablancaClient(context, rpcClient)
        await client.createNewUser()
        console.log('Finished', client)
    })

    test('test creating a casablanca space with the zion client', async () => {
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])

        // bob needs funds to create a space
        await bob.fundWallet()
        // create a space
        const spaceId = (await createTestSpaceWithEveryoneRole(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
                visibility: RoomVisibility.Public,
                spaceProtocol: SpaceProtocol.Casablanca,
            },
        ))!
        // create a channel
        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        }))!

        console.log("bob's spaceId", { spaceId, channelId })

        await alice.joinRoom(channelId)

        await bob.sendMessage(channelId, 'Hello, world from Bob!')

        const stream = await alice.casablancaClient!.waitForStream(channelId.networkId)

        await waitFor(() =>
            expect(
                Array.from(stream.rollup.messages.values()).find(
                    (m) =>
                        m.base.payload.kind === 'message' &&
                        m.base.payload.text === 'Hello, world from Bob!',
                ),
            ).toBeDefined(),
        )
    })
})
