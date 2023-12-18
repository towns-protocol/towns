/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group casablanca
 */
import { waitFor } from '@testing-library/dom'
import {
    Client as CasablancaClient,
    RiverDbManager,
    makeOldTownsDelegateSig,
    makeStreamRpcClient,
    MockEntitlementsDelegate,
} from '@river/sdk'
import { bin_fromHexString, SignerContext } from '@river/sdk'
import { ethers } from 'ethers'
import { RoomMessageEvent, ZTEvent } from '../../src/types/timeline-types'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    registerAndStartClients,
} from './helpers/TestUtils'
import { Permission } from '@river/web3'
import debug from 'debug'

const log = debug('test:casablanca')

describe('casablanca', () => {
    test('test instantiating a casablanca client', async () => {
        const primaryWallet = ethers.Wallet.createRandom()
        const delegateWallet = ethers.Wallet.createRandom()
        const creatorAddress = bin_fromHexString(primaryWallet.address)
        const delegateSig = await makeOldTownsDelegateSig(primaryWallet, delegateWallet.publicKey)
        const pk = delegateWallet.privateKey.slice(2)
        const context: SignerContext = {
            signerPrivateKey: () => pk,
            creatorAddress,
            delegateSig,
        }
        const csurl: string = process.env.CASABLANCA_SERVER_URL!
        log('new CasablancaClient', csurl)
        const rpcClient = makeStreamRpcClient(csurl)
        const cryptoStore = RiverDbManager.getCryptoDb('abc')
        const entitlementsDelegate = new MockEntitlementsDelegate()
        const client = new CasablancaClient(context, rpcClient, cryptoStore, entitlementsDelegate)
        await client.initializeUser()
        log('Finished', client)
    })

    test('bobTalksToHimself', async () => {
        log("Test starting, registering and starting client 'bob'")
        const { bob } = await registerAndStartClients(['bob'])

        log("Clients started, funding Bob's wallet")
        await bob.fundWallet()

        log("Bob's wallet funded, creating a space")
        const spaceId = (await createTestSpaceGatedByTownNft(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
            },
        ))!

        log("Bob's space created, creating a channel")
        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            roleIds: [],
        }))!

        log("bob's spaceId and channelId", { spaceId, channelId })
        log('Sending a message from Bob')
        await bob.sendMessage(channelId, 'Hello, world from Bob!')

        log("Bob sent a message, checking that it's received")
        log(bob.casablancaClient?.stream(channelId.streamId)?.view)
        await waitFor(async () => {
            const event = await bob.getLatestEvent<RoomMessageEvent>(channelId, ZTEvent.RoomMessage)
            log('latest event=', event)
            expect(event?.content?.body).toEqual('Hello, world from Bob!')
        })

        log('Bob received the message, test done')
    })

    test('test creating a casablanca space with the zion client and send encrypted messages', async () => {
        log("Test starting, registering and starting clients 'bob' and 'alice'")
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])

        log("Clients started, funding Bob's wallet")
        await bob.fundWallet()

        log("Bob's wallet funded, creating a space")
        const spaceId = (await createTestSpaceGatedByTownNft(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
            },
        ))!

        log("Bob's space created, creating a channel")
        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            roleIds: [],
        }))!

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
        const spaceId = (await createTestSpaceGatedByTownNft(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
            },
        ))!

        log("Bob's space created, creating a channel")
        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            roleIds: [],
        }))!

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
