/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group core
 */
import { waitFor } from '@testing-library/dom'
import {
    Client as CasablancaClient,
    RiverDbManager,
    makeStreamRpcClient,
    MockEntitlementsDelegate,
    makeSignerContext,
} from '@river-build/sdk'
import { ethers } from 'ethers'
import { RoomMessageEvent, ZTEvent } from '../../src/types/timeline-types'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    registerAndStartClients,
} from './helpers/TestUtils'
import { Permission, createRiverRegistry } from '@river-build/web3'
import debug from 'debug'
import { TownsTestWeb3Provider } from './helpers/TownsTestWeb3Provider'

const log = debug('test:casablanca')

describe('casablanca', () => {
    test('test instantiating a casablanca client', async () => {
        const primaryWallet = ethers.Wallet.createRandom()
        const delegateWallet = ethers.Wallet.createRandom()
        const context = await makeSignerContext(primaryWallet, delegateWallet)
        // the towns test provider wraps all the configuration needed to run a test and is also a ethers provider
        const provider = new TownsTestWeb3Provider(primaryWallet)
        const riverRegistry = createRiverRegistry(
            provider.riverChainProvider,
            provider.config.river.chainConfig,
        )
        const urls = await riverRegistry.getOperationalNodeUrls()
        const rpcClient = makeStreamRpcClient(urls, undefined, () =>
            riverRegistry.getOperationalNodeUrls(),
        )
        const cryptoStore = RiverDbManager.getCryptoDb('abc')
        const entitlementsDelegate = new MockEntitlementsDelegate()
        const client = new CasablancaClient(context, rpcClient, cryptoStore, entitlementsDelegate)
        log('Finished', client)
    })

    test('bobTalksToHimself', async () => {
        log("Test starting, registering and starting client 'bob'")
        const { bob } = await registerAndStartClients(['bob'])

        log("Clients started, funding Bob's wallet")
        await bob.fundWallet()

        log("Bob's wallet funded, creating a space")
        const spaceId = await createTestSpaceGatedByTownNft(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
            },
        )

        log("Bob's space created, creating a channel")
        const channelId = await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })

        log("bob's spaceId and channelId", { spaceId, channelId })
        log('Sending a message from Bob')
        await bob.sendMessage(channelId, 'Hello, world from Bob!')

        log("Bob sent a message, checking that it's received")
        log(bob.casablancaClient?.stream(channelId)?.view)
        await waitFor(async () => {
            const event = await bob.getLatestEvent<RoomMessageEvent>(channelId, ZTEvent.RoomMessage)
            log('latest event=', event)
            expect(event?.content?.body).toEqual('Hello, world from Bob!')
        })

        log('Bob received the message, test done')
    })

    test('test creating a casablanca space with the Towns client and send encrypted messages', async () => {
        log("Test starting, registering and starting clients 'bob' and 'alice'")
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])

        log("Clients started, funding Bob's wallet")
        await bob.fundWallet()

        log("Bob's wallet funded, creating a space")
        const spaceId = await createTestSpaceGatedByTownNft(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
            },
        )

        log("Bob's space created, creating a channel")
        const channelId = await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })

        log("bob's spaceId and channelId", { spaceId, channelId })

        log("Bob's channel created, joining Alice to the channel")
        await alice.joinTown(spaceId, alice.wallet)
        await alice.joinRoom(channelId)

        log('Alice joined the channel, sending an encrypted message from Bob')
        await bob.sendMessage(channelId, 'Hello, world from Bob!')

        log('Bob sent a message, waiting for Alice to receive it')

        await waitFor(async () => {
            const event = await alice.getLatestEvent<RoomMessageEvent>(
                channelId,
                ZTEvent.RoomMessage,
            )
            expect(event?.content?.body).toEqual('Hello, world from Bob!')
        })

        log('Alice received the message, test done')
    })

    test('test decrypting encrypted content that looks like ciphertext', async () => {
        log("Test starting, registering and starting clients 'bob' and 'alice'")
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])

        log("Clients started, funding Bob's wallet")
        await bob.fundWallet()

        log("Bob's wallet funded, creating a space")
        const spaceId = await createTestSpaceGatedByTownNft(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
            },
        )

        log("Bob's space created, creating a channel")
        const channelId = await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })

        log("bob's spaceId and channelId", { spaceId, channelId })

        log("Bob's channel created, joining Alice to the channel")
        await alice.joinTown(spaceId, alice.wallet)
        await alice.joinRoom(channelId)

        log('Alice joined the channel, sending a message from Bob')
        const message = 'aasSAJ2314235AKDSadsfsdf'
        await bob.sendMessage(channelId, message)

        log('Bob sent a message, waiting for Alice to receive it')

        await waitFor(async () => {
            const event = await alice.getLatestEvent<RoomMessageEvent>(
                channelId,
                ZTEvent.RoomMessage,
            )
            expect(event?.content?.body).toEqual(message)
        })

        log('Alice received the decrypted message, test done')
    })
})
