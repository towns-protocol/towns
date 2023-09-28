/**
 * @group with-entitilements
 */

import { makeEvent, SignerContext, unpackEnvelopes } from './sign'
import { MembershipOp } from '@river/proto'
import { LocalhostWeb3Provider, ITownArchitectBase, Permission, SpaceDappV3 } from '@river/web3'
import { dlog } from './dlog'
import {
    lastEventFiltered,
    makeRandomUserContextWithOldDelegate,
    TEST_URL_WITH_ENTITILEMENTS,
} from './util.test'
import {
    genId,
    makeChannelStreamId,
    makeSpaceStreamId,
    makeUserStreamId,
    userIdFromAddress,
} from './id'
import {
    getUserPayload_Membership,
    make_ChannelPayload_Inception,
    make_ChannelPayload_Membership,
    make_SpacePayload_Inception,
    make_SpacePayload_Membership,
    make_UserPayload_Inception,
} from './types'
import { makeStreamRpcClient } from './makeStreamRpcClient'
import { ethers, Wallet } from 'ethers'

const base_log = dlog('csb:test:workflows')

const makeTestRpcClient = () => makeStreamRpcClient(TEST_URL_WITH_ENTITILEMENTS)

describe('workflows', () => {
    let bobsWallet: Wallet
    let bobsContext: SignerContext

    beforeEach(async () => {
        bobsWallet = ethers.Wallet.createRandom()
        bobsContext = await makeRandomUserContextWithOldDelegate(bobsWallet)
    })

    test('creationSideEffects', async () => {
        const log = base_log.extend('creationSideEffects')

        log('start')

        // set up the web3 provider and spacedap
        const provider = new LocalhostWeb3Provider(bobsWallet)
        const chainId = (await provider.getNetwork()).chainId
        await provider.fundWallet()
        const mintReceipt = await provider.mintMockNFT()
        log('mintReceipt', mintReceipt)
        const spaceDapp = new SpaceDappV3(chainId, provider)

        // createe a user stream
        const bob = makeTestRpcClient()
        const bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
        const bobsUserStreamId = makeUserStreamId(bobsUserId)
        await bob.createStream({
            events: [
                await makeEvent(
                    bobsContext,
                    make_UserPayload_Inception({
                        streamId: bobsUserStreamId,
                    }),
                    [],
                ),
            ],
            streamId: bobsUserStreamId,
        })

        // create a space stream,
        const spacedStreamId = makeSpaceStreamId('bobs-space-' + genId())
        const channelId = makeChannelStreamId('bobs-channel-' + genId())
        log('Bob created user, about to create space', { spacedStreamId, channelId })
        // first on the blockchain
        const everyonePermissions: Permission[] = [Permission.Read, Permission.Write]
        const memberEntitlements: ITownArchitectBase.MemberEntitlementStruct = {
            role: {
                name: '',
                permissions: [],
            },
            tokens: [],
            users: [],
        }
        const transaction = await spaceDapp.createSpace(
            {
                spaceId: spacedStreamId,
                spaceName: spacedStreamId,
                spaceMetadata: 'bobs-space-metadata',
                channelId: channelId,
                channelName: 'general', // default channel name
                memberEntitlements,
                everyonePermissions,
            },
            provider.wallet,
        )
        const receipt = await transaction.wait()
        log('receipt', receipt)
        expect(receipt.status).toEqual(1)
        // then on the river node
        const spaceInceptionEvent = await makeEvent(
            bobsContext,
            make_SpacePayload_Inception({
                streamId: spacedStreamId,
            }),
            [],
        )
        await bob.createStream({
            events: [
                spaceInceptionEvent,
                await makeEvent(
                    bobsContext,
                    make_SpacePayload_Membership({
                        userId: bobsUserId,
                        op: MembershipOp.SO_JOIN,
                    }),
                    [spaceInceptionEvent.hash],
                ),
            ],
            streamId: spacedStreamId,
        })
        // Now there must be "joined space" event in the user stream.
        let userResponse = await bob.getStream({ streamId: bobsUserStreamId })
        expect(userResponse.stream).toBeDefined()
        let joinPayload = lastEventFiltered(
            unpackEnvelopes(userResponse.stream!.events),
            getUserPayload_Membership,
        )
        expect(joinPayload).toBeDefined()
        expect(joinPayload?.op).toEqual(MembershipOp.SO_JOIN)
        expect(joinPayload?.streamId).toEqual(spacedStreamId)
        // create the channel
        log('Bob created space, about to create channel')
        const channelProperties = 'Bobs channel properties'
        const channelInceptionEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Inception({
                streamId: channelId,
                spaceId: spacedStreamId,
                channelProperties: { text: channelProperties },
            }),
            [],
        )
        const channelJoinEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Membership({
                userId: bobsUserId,
                op: MembershipOp.SO_JOIN,
            }),
            [channelInceptionEvent.hash],
        )
        await bob.createStream({
            events: [channelInceptionEvent, channelJoinEvent],
            streamId: channelId,
        })

        // Now there must be "joined channel" event in the user stream.
        userResponse = await bob.getStream({ streamId: bobsUserStreamId })
        expect(userResponse.stream).toBeDefined()
        joinPayload = lastEventFiltered(
            unpackEnvelopes(userResponse.stream!.events),
            getUserPayload_Membership,
        )

        expect(joinPayload).toBeDefined()
        expect(joinPayload?.op).toEqual(MembershipOp.SO_JOIN)
        expect(joinPayload?.streamId).toEqual(channelId)

        log('Bob created channel')
        log('Done')
    })
})
