/**
 * @group with-entitilements
 */

import { dlog } from './dlog'
import { makeUserContextFromWallet, makeTestClient, TEST_URL_WITH_ENTITILEMENTS } from './util.test'
import { genId, makeChannelStreamId, makeSpaceStreamId, makeUserStreamId } from './id'
import { ethers } from 'ethers'
import { jest } from '@jest/globals'

// This is a temporary hack because importing viem via SpaceDapp causes a jest error
// specifically the code in ConvertersEntitlements.ts - decodeAbiParameters and encodeAbiParameters functions have an import that can't be found
// Need to use the new space dapp in an actual browser to see if this is a problem there too before digging in further
jest.unstable_mockModule('viem', async () => {
    return {
        BaseError: class extends Error {},
        hexToString: jest.fn(),
        encodeFunctionData: jest.fn(),
        decodeAbiParameters: jest.fn(),
        encodeAbiParameters: jest.fn(),
        parseAbiParameters: jest.fn(),
        zeroAddress: `0x${'0'.repeat(40)}`,
    }
})

const { LocalhostWeb3Provider, createSpaceDapp, Permission } = await import('@river/web3')

const base_log = dlog('csb:test:withEntitlements')
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

describe('withEntitlements', () => {
    test('createSpaceAndChannel', async () => {
        const log = base_log.extend('createSpaceAndChannel')

        log('start')

        // set up the web3 provider and spacedap
        const bobsWallet = ethers.Wallet.createRandom()
        const bobsContext = await makeUserContextFromWallet(bobsWallet)
        const bobProvider = new LocalhostWeb3Provider(bobsWallet)
        const chainId = (await bobProvider.getNetwork()).chainId
        await bobProvider.fundWallet()
        const mintReceipt = await bobProvider.mintMockNFT()
        log('mintReceipt', mintReceipt)
        const spaceDapp = createSpaceDapp(chainId, bobProvider)

        // create a user stream
        const bob = await makeTestClient(TEST_URL_WITH_ENTITILEMENTS, bobsContext)
        const bobsUserStreamId = makeUserStreamId(bob.userId)
        await expect(bob.createNewUser()).toResolve()
        await expect(bob.initCrypto()).toResolve()
        await bob.startSync()

        // create a space stream,
        const spaceId = makeSpaceStreamId('bobs-space-' + genId())
        const channelId = makeChannelStreamId('bobs-channel-' + genId())
        log('Bob created user, about to create space', { spaceId, channelId })
        // first on the blockchain
        const membershipInfo = {
            settings: {
                name: 'Everyone',
                symbol: 'MEMBER',
                price: 0,
                limit: 1000,
                duration: 0,
                currency: ETH_ADDRESS,
                feeRecipient: bob.userId,
            },
            permissions: [Permission.Read, Permission.Write],
            requirements: {
                everyone: true,
                tokens: [],
                users: [],
            },
        }
        const transaction = await spaceDapp.createSpace(
            {
                spaceId: spaceId,
                spaceName: spaceId,
                spaceMetadata: 'bobs-space-metadata',
                channelId: channelId,
                channelName: 'general', // default channel name
                membership: membershipInfo,
            },
            bobProvider.wallet,
        )
        const receipt = await transaction.wait()
        log('receipt', receipt)
        expect(receipt.status).toEqual(1)
        // then on the river node
        const returnVal = await bob.createSpace(spaceId)
        expect(returnVal.streamId).toEqual(spaceId)
        // Now there must be "joined space" event in the user stream.
        let bobUserStreamView = await bob.getStream(bobsUserStreamId)
        expect(bobUserStreamView).toBeDefined()
        expect(bobUserStreamView.userContent.userJoinedStreams).toContain(spaceId)
        // create the channel
        log('Bob created space, about to create channel')
        const channelProperties = 'Bobs channel properties'
        const channelReturnVal = await bob.createChannel(
            spaceId,
            'general',
            channelProperties,
            channelId,
        )
        expect(channelReturnVal.streamId).toEqual(channelId)

        // Now there must be "joined channel" event in the user stream.
        bobUserStreamView = await bob.getStream(bobsUserStreamId)
        expect(bobUserStreamView).toBeDefined()
        expect(bobUserStreamView.userContent.userJoinedStreams).toContain(channelId)

        await expect(bob.sendMessage(channelId, 'Hello, world from Bob!')).toResolve()

        // join alice
        const alicesWallet = ethers.Wallet.createRandom()
        const alicesContext = await makeUserContextFromWallet(alicesWallet)
        const aliceProvider = new LocalhostWeb3Provider(alicesWallet)
        await aliceProvider.fundWallet()
        const alice = await makeTestClient(TEST_URL_WITH_ENTITILEMENTS, alicesContext)
        await alice.createNewUser()
        await alice.initCrypto()
        alice.startSync()
        log('Alice created user, about to join space', { alicesUserId: alice.userId })

        // first join the space on chain
        const aliceSpaceDapp = createSpaceDapp(chainId, aliceProvider)
        const transaction2 = await aliceSpaceDapp.joinTown(
            spaceId,
            alicesWallet.address,
            aliceProvider.wallet,
        )
        const receipt2 = await transaction2.wait()
        log('receipt for alice joining town', receipt2)

        await expect(alice.joinStream(spaceId)).toResolve()
        await expect(alice.joinStream(channelId)).toResolve()
        await expect(alice.sendMessage(channelId, 'Hello, world from Alice!')).toResolve()

        // kill the clients
        bob.stopSync()
        alice.stopSync()
        log('Done')
    })
})
