/**
 * @group with-entitilements
 */

import { LocalhostWeb3Provider, ITownArchitectBase, Permission, createSpaceDapp } from '@river/web3'
import { dlog } from './dlog'
import { makeRandomUserContextWithOldDelegate, TEST_URL_WITH_ENTITILEMENTS } from './util.test'
import {
    genId,
    makeChannelStreamId,
    makeSpaceStreamId,
    makeUserStreamId,
    userIdFromAddress,
} from './id'
import { makeStreamRpcClient } from './makeStreamRpcClient'
import { ethers } from 'ethers'
import { Client } from './client'

const base_log = dlog('csb:test:withEntitlements')

const makeStreamRpcClientWithEntitlements = () => makeStreamRpcClient(TEST_URL_WITH_ENTITILEMENTS)
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

describe('withEntitlements', () => {
    test('createSpaceAndChannel', async () => {
        const log = base_log.extend('createSpaceAndChannel')

        log('start')

        // set up the web3 provider and spacedap
        const bobsWallet = ethers.Wallet.createRandom()
        const bobsContext = await makeRandomUserContextWithOldDelegate(bobsWallet)
        const bobProvider = new LocalhostWeb3Provider(bobsWallet)
        const chainId = (await bobProvider.getNetwork()).chainId
        await bobProvider.fundWallet()
        const mintReceipt = await bobProvider.mintMockNFT()
        log('mintReceipt', mintReceipt)
        const spaceDapp = createSpaceDapp(chainId, bobProvider)

        // create a user stream
        const bob = new Client(bobsContext, makeStreamRpcClientWithEntitlements())
        const bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
        const bobsUserStreamId = makeUserStreamId(bobsUserId)
        await bob.createNewUser()
        bob.startSync()

        // create a space stream,
        const spaceId = makeSpaceStreamId('bobs-space-' + genId())
        const channelId = makeChannelStreamId('bobs-channel-' + genId())
        log('Bob created user, about to create space', { spaceId, channelId })
        // first on the blockchain
        const membershipInfo: ITownArchitectBase.MembershipStruct = {
            settings: {
                name: 'Everyone',
                symbol: 'MEMBER',
                price: 0,
                limit: 1000,
                duration: 0,
                currency: ETH_ADDRESS,
                feeRecipient: bobsUserId,
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
            "Bob's channel",
            channelProperties,
            channelId,
        )
        expect(channelReturnVal.streamId).toEqual(channelId)

        // Now there must be "joined channel" event in the user stream.
        bobUserStreamView = await bob.getStream(bobsUserStreamId)
        expect(bobUserStreamView).toBeDefined()
        expect(bobUserStreamView.userContent.userJoinedStreams).toContain(channelId)

        // join alice
        const alicesWallet = ethers.Wallet.createRandom()
        const alicesContext = await makeRandomUserContextWithOldDelegate(alicesWallet)
        const aliceProvider = new LocalhostWeb3Provider(alicesWallet)
        await aliceProvider.fundWallet()
        const alice = new Client(alicesContext, makeStreamRpcClientWithEntitlements())
        await alice.createNewUser()
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

        const aliceSpaceResponse = await alice.joinStream(spaceId)
        expect(aliceSpaceResponse).toBeDefined()
        log('response', aliceSpaceResponse)

        // kill the clients
        bob.stopSync()
        alice.stopSync()
        log('Done')
    })
})
