/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/**
 * @group with-entitilements
 */

import { makeDonePromise, makeTestClient, makeUserContextFromWallet, waitFor } from './util.test'
import { dlog } from '@river/dlog'
import { makeDefaultChannelStreamId, makeSpaceStreamId, makeUserStreamId } from './id'
import { MembershipOp } from '@river/proto'
import { ethers } from 'ethers'
import {
    LocalhostWeb3Provider,
    MembershipStruct,
    NoopRuleData,
    Permission,
    createSpaceDapp,
} from '@river/web3'

const log = dlog('csb:test')
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

describe('spaceTestsWithEntitlements', () => {
    // Banning with entitlements — users need permission to ban other users.
    test('ownerCanBanOtherUsers', async () => {
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
        bob.startSync()

        // create a space stream,
        log('Bob created user, about to create space')
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
                users: [],
                ruleData: NoopRuleData,
            },
        }
        const transaction = await spaceDapp.createSpace(
            {
                spaceName: 'bobs-space-metadata',
                spaceMetadata: 'bobs-space-metadata',
                channelName: 'general', // default channel name
                membership: membershipInfo,
            },
            bobProvider.wallet,
        )
        const receipt = await transaction.wait()
        log('receipt', receipt)
        expect(receipt.status).toEqual(1)
        const spaceAddress = spaceDapp.getSpaceAddress(receipt)
        expect(spaceAddress).toBeDefined()
        const spaceId = makeSpaceStreamId(spaceAddress!)
        const channelId = makeDefaultChannelStreamId(spaceAddress!)
        // then on the river node
        const returnVal = await bob.createSpace(spaceId)
        expect(returnVal.streamId).toEqual(spaceId)
        // Now there must be "joined space" event in the user stream.
        const bobUserStreamView = bob.stream(bobsUserStreamId)!.view
        expect(bobUserStreamView).toBeDefined()
        expect(bobUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)

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

        await waitFor(() => {
            expect(bobUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)
            expect(bobUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

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

        const aliceUserStreamView = alice.stream(alice.userStreamId!)!.view
        await waitFor(() => {
            expect(aliceUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
            expect(aliceUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

        // Alice cannot kick Bob
        await expect(alice.removeUser(spaceId, bob.userId)).rejects.toThrow(
            expect.objectContaining({
                message: expect.stringContaining('7:PERMISSION_DENIED'),
            }),
        )

        // Bob is still a a member — Alice can't kick him because he's the owner
        await waitFor(() => {
            expect(bobUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)
            expect(bobUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

        // Bob kicks Alice!
        await expect(bob.removeUser(spaceId, alice.userId)).toResolve()

        // Alice is no longer a member of the space or channel
        await waitFor(() => {
            expect(aliceUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(
                false,
            )
            expect(aliceUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                false,
            )
        })

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done')
    })
})
