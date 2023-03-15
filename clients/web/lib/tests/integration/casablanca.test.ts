/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group casablanca
 */
import { waitFor } from '@testing-library/dom'
import { Client as CasablancaClient, makeStreamRpcClient } from '@towns/client'
import { bin_fromHexString, publicKeyToBuffer, SignerContext } from '@towns/client'
import { ethers } from 'ethers'
import { Permission } from '../../src/client/web3/ContractTypes'
import { SpaceProtocol } from '../../src/client/ZionClientTypes'
import { RoomVisibility } from '../../src/types/zion-types'
import { RoomMessageEvent, ZTEvent } from '../../src/types/timeline-types'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    registerAndStartClients,
} from './helpers/TestUtils'
import { setTimeout } from 'timers/promises'
import debug from 'debug'

const log = debug('test:casablanca')

describe('casablanca', () => {
    test('test instantiating a casablanca client', async () => {
        const primaryWallet = ethers.Wallet.createRandom()
        const delegateWallet = ethers.Wallet.createRandom()
        const delegateSig = await primaryWallet.signMessage(
            publicKeyToBuffer(delegateWallet.publicKey),
        )
        const context: SignerContext = {
            wallet: delegateWallet,
            creatorAddress: bin_fromHexString(primaryWallet.address),
            delegateSig: bin_fromHexString(delegateSig),
        }
        const csurl: string = process.env.CASABLANCA_SERVER_URL!
        log('new CasablancaClient', csurl)
        const rpcClient = makeStreamRpcClient(csurl)
        const client = new CasablancaClient(context, rpcClient)
        await client.createNewUser()
        log('Finished', client)
    })

    test('bobTalksToHimself', async () => {
        log("Test starting, registering and starting client 'bob'")
        const { bob } = await registerAndStartClients(['bob'], {
            primaryProtocol: SpaceProtocol.Casablanca,
        })

        log("Clients started, funding Bob's wallet")
        await bob.fundWallet()

        log("Bob's wallet funded, creating a space")
        const spaceId = (await createTestSpaceWithEveryoneRole(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
                visibility: RoomVisibility.Public,
                spaceProtocol: SpaceProtocol.Casablanca,
            },
        ))!

        log("Bob's space created, creating a channel")
        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        }))!

        log("bob's spaceId and channelId", { spaceId, channelId })
        log('Sending a message from Bob')
        await bob.sendMessage(channelId, 'Hello, world from Bob!')

        log("Bob sent a message, checking that it's received")
        await setTimeout(1000)
        log(bob.casablancaClient?.stream(channelId.networkId)?.rollup)
        await waitFor(async () => {
            const event = await bob.getLatestEvent<RoomMessageEvent>(channelId, ZTEvent.RoomMessage)
            log('latest event=', event)
            expect(event?.content?.body === 'Hello, world from Bob!').toEqual(true)
        })

        log('Bob received the message, test done')
    })

    test('test creating a casablanca space with the zion client', async () => {
        log("Test starting, registering and starting clients 'bob' and 'alice'")
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'], {
            primaryProtocol: SpaceProtocol.Casablanca,
        })

        log("Clients started, funding Bob's wallet")
        await bob.fundWallet()

        log("Bob's wallet funded, creating a space")
        const spaceId = (await createTestSpaceWithEveryoneRole(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
                visibility: RoomVisibility.Public,
                spaceProtocol: SpaceProtocol.Casablanca,
            },
        ))!

        log("Bob's space created, creating a channel")
        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        }))!

        log("bob's spaceId and channelId", { spaceId, channelId })

        log("Bob's channel created, joining Alice to the channel")
        await alice.joinRoom(channelId)

        log('Alice joined the channel, sending a message from Bob')
        await bob.sendMessage(channelId, 'Hello, world from Bob!')

        log('Bob sent a message, waiting for Alice to receive it')
        await waitFor(async () => {
            const event = await alice.getLatestEvent<RoomMessageEvent>(
                channelId,
                ZTEvent.RoomMessage,
            )
            // TODO - need to merge ZTEvent into a common type for both marix and CB
            expect(event?.content?.body === 'Hello, world from Bob!').toEqual(true)
        })

        log('Alice received the message, test done')
    })
})
