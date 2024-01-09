/**
 * @group with-entitilements
 */

import { dlog } from '@river/mecholm'
import { makeUserContextFromWallet, makeTestClient, makeDonePromise } from './util.test'
import { genId, makeChannelStreamId, makeSpaceStreamId, makeUserStreamId } from './id'
import { ethers } from 'ethers'
import { MembershipStruct } from '@river/web3'
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
        const spaceDapp = createSpaceDapp({ chainId, provider: bobProvider })

        // create a user stream
        const bob = await makeTestClient({ context: bobsContext })
        const bobsUserStreamId = makeUserStreamId(bob.userId)
        await expect(bob.initializeUser()).toResolve()
        await bob.startSync()

        // create a space stream,
        const spaceId = makeSpaceStreamId('bobs-space-' + genId())
        const channelId = makeChannelStreamId('bobs-channel-' + genId())
        log('Bob created user, about to create space', { spaceId, channelId })
        // first on the blockchain
        const membershipInfo: MembershipStruct = {
            settings: {
                name: 'Everyone',
                symbol: 'MEMBER',
                price: 0,
                maxSupply: 1000,
                duration: 0,
                currency: ETH_ADDRESS,
                feeRecipient: bob.userId,
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
        const bobUserStreamView = bob.stream(bobsUserStreamId)!.view
        expect(bobUserStreamView).toBeDefined()
        expect(bobUserStreamView.userContent.userJoinedStreams).toContain(spaceId)

        const waitForStreamPromise = makeDonePromise()
        bob.on('userJoinedStream', (streamId) => {
            if (streamId === channelId) {
                waitForStreamPromise.done()
            }
        })

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

        await waitForStreamPromise.expectToSucceed()
        // Now there must be "joined channel" event in the user stream.
        expect(bobUserStreamView).toBeDefined()
        expect(bobUserStreamView.userContent.userJoinedStreams).toContain(channelId)

        // todo  getDevicesInRoom is randomly failing in ci renable https://linear.app/hnt-labs/issue/HNT-3439/getdevicesinroom-is-randomly-failing-in-ci
        // await expect(bob.sendMessage(channelId, 'Hello, world from Bob!')).toResolve()

        // join alice
        const alicesWallet = ethers.Wallet.createRandom()
        const alicesContext = await makeUserContextFromWallet(alicesWallet)
        const aliceProvider = new LocalhostWeb3Provider(alicesWallet)
        await aliceProvider.fundWallet()
        const alice = await makeTestClient({
            context: alicesContext,
        })
        await alice.initializeUser()
        alice.startSync()
        log('Alice created user, about to join space', { alicesUserId: alice.userId })

        // first join the space on chain
        const aliceSpaceDapp = createSpaceDapp({ chainId, provider: aliceProvider })
        const transaction2 = await aliceSpaceDapp.joinTown(
            spaceId,
            alicesWallet.address,
            aliceProvider.wallet,
        )
        const receipt2 = await transaction2.wait()
        log('receipt for alice joining town', receipt2)

        await expect(alice.joinStream(spaceId)).toResolve()
        await expect(alice.joinStream(channelId)).toResolve()
        // todo  getDevicesInRoom is randomly failing in ci renable https://linear.app/hnt-labs/issue/HNT-3439/getdevicesinroom-is-randomly-failing-in-ci
        // await expect(alice.sendMessage(channelId, 'Hello, world from Alice!')).toResolve()

        // kill the clients
        bob.stopSync()
        alice.stopSync()
        log('Done')
    })
})
