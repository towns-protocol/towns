/**
 * @group main
 */
import {
    ChannelMessage,
    GroupMentionType,
    MessageInteractionType,
    StreamEvent,
} from '@river-build/proto'
import { makeTags } from './tags'
import { IStreamStateView, StreamStateView } from './streamStateView'
import { addressFromUserId, genIdBlob, makeUniqueChannelStreamId, userIdFromAddress } from './id'
import { PlainMessage } from '@bufbuild/protobuf'
import { ethers } from 'ethers'
import { makeUniqueSpaceStreamId } from './util.test'
import { makeSignerContext, SignerContext } from './signerContext'
import { makeParsedEvent } from './sign'
import { makeRemoteTimelineEvent } from './types'
import { bin_fromHexString, bin_toHexString } from '@river-build/dlog'

// Mock the IStreamStateView interface

interface TagsTestUser {
    userId: string
    address: Uint8Array
    context: SignerContext
    wallet: ethers.Wallet
}

describe('makeTags', () => {
    const spaceId = makeUniqueSpaceStreamId()
    const streamId = makeUniqueChannelStreamId(spaceId)
    let mockStreamView: IStreamStateView

    let user1: TagsTestUser
    let user2: TagsTestUser
    let user3: TagsTestUser
    let user4: TagsTestUser

    beforeAll(async () => {
        const makeUser = async () => {
            const wallet = ethers.Wallet.createRandom()
            const delegateWallet = ethers.Wallet.createRandom()
            const context = await makeSignerContext(wallet, delegateWallet)
            return {
                userId: wallet.address,
                address: addressFromUserId(wallet.address),
                context,
                wallet,
            } satisfies TagsTestUser
        }
        user1 = await makeUser()
        user2 = await makeUser()
        user3 = await makeUser()
        user4 = await makeUser()

        mockStreamView = new StreamStateView(userIdFromAddress(user1.address), streamId)
    })

    beforeEach(() => {
        mockStreamView.events.clear()
    })

    it('should create tags for a reaction message', () => {
        const reactionMessage: PlainMessage<ChannelMessage> = {
            payload: {
                case: 'reaction',
                value: {
                    refEventId: 'event1',
                    reaction: '👍',
                },
            },
        }

        mockStreamView.events.set(
            'event1',
            makeRemoteTimelineEvent({
                parsedEvent: makeParsedEvent(
                    new StreamEvent({
                        creatorAddress: user2.context.creatorAddress,
                        salt: genIdBlob(),
                        prevMiniblockHash: undefined,
                        payload: { case: undefined, value: undefined },
                        createdAtEpochMs: BigInt(Date.now()),
                        tags: undefined,
                    }),
                    undefined,
                    undefined,
                ),
                eventNum: 0n,
                miniblockNum: 0n,
                confirmedEventNum: 0n,
            }),
        )
        mockStreamView.timeline.push(mockStreamView.events.get('event1')!)

        const tags = makeTags(reactionMessage, mockStreamView)

        expect(tags.messageInteractionType).toBe(MessageInteractionType.REACTION)
        expect(tags.groupMentionTypes).toEqual([])
        expect(tags.mentionedUserAddresses).toEqual([])
        expect(tags.participatingUserAddresses).toEqual([user2.address])
    })

    it('should create tags for a reply message', () => {
        const threadId1Bytes = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
        const threadId1 = bin_toHexString(threadId1Bytes)
        const replyMessage: PlainMessage<ChannelMessage> = {
            payload: {
                case: 'post',
                value: {
                    threadId: threadId1,
                    content: {
                        case: 'text',
                        value: {
                            body: 'hello world',
                            mentions: [
                                {
                                    userId: user1.userId,
                                    displayName: 'User 1',
                                    mentionBehavior: { case: undefined },
                                },
                                {
                                    userId: 'atChannel',
                                    displayName: 'atChannel',
                                    mentionBehavior: { case: 'atChannel', value: {} },
                                },
                            ],
                            attachments: [],
                        },
                    },
                },
            },
        }

        mockStreamView.events.set(threadId1, {
            ...makeRemoteTimelineEvent({
                parsedEvent: makeParsedEvent(
                    new StreamEvent({
                        creatorAddress: user2.context.creatorAddress,
                        salt: genIdBlob(),
                        prevMiniblockHash: undefined,
                        payload: { case: undefined, value: undefined },
                        createdAtEpochMs: BigInt(Date.now()),
                        tags: undefined,
                    }),
                    undefined,
                    undefined,
                ),
                eventNum: 0n,
                miniblockNum: 0n,
                confirmedEventNum: 0n,
            }),
        })
        mockStreamView.timeline.push(mockStreamView.events.get(threadId1)!)

        mockStreamView.events.set('event1', {
            ...makeRemoteTimelineEvent({
                parsedEvent: makeParsedEvent(
                    new StreamEvent({
                        creatorAddress: user3.context.creatorAddress,
                        salt: genIdBlob(),
                        prevMiniblockHash: undefined,
                        payload: { case: undefined, value: undefined },
                        createdAtEpochMs: BigInt(Date.now()),
                        tags: undefined,
                    }),
                    undefined,
                    undefined,
                ),
                eventNum: 0n,
                miniblockNum: 0n,
                confirmedEventNum: 0n,
            }),
            decryptedContent: {
                kind: 'channelMessage',
                content: new ChannelMessage({
                    payload: {
                        case: 'post',
                        value: {
                            threadId: threadId1,
                            content: {
                                case: 'text',
                                value: {
                                    body: 'hello world',
                                    mentions: [],
                                    attachments: [],
                                },
                            },
                        },
                    },
                }),
            },
        })
        mockStreamView.timeline.push(mockStreamView.events.get('event1')!)

        mockStreamView.events.set('event2', {
            ...makeRemoteTimelineEvent({
                parsedEvent: makeParsedEvent(
                    new StreamEvent({
                        creatorAddress: user4.context.creatorAddress,
                        salt: genIdBlob(),
                        prevMiniblockHash: undefined,
                        payload: { case: undefined, value: undefined },
                        createdAtEpochMs: BigInt(Date.now()),
                        tags: undefined,
                    }),
                    undefined,
                    undefined,
                ),
                eventNum: 0n,
                miniblockNum: 0n,
                confirmedEventNum: 0n,
            }),
            decryptedContent: {
                kind: 'channelMessage',
                content: new ChannelMessage({
                    payload: {
                        case: 'post',
                        value: {
                            threadId: threadId1,
                            content: {
                                case: 'text',
                                value: {
                                    body: 'hello world',
                                    mentions: [],
                                    attachments: [],
                                },
                            },
                        },
                    },
                }),
            },
        })
        mockStreamView.timeline.push(mockStreamView.events.get('event2')!)

        const tags = makeTags(replyMessage, mockStreamView)

        expect(tags.messageInteractionType).toBe(MessageInteractionType.REPLY)
        expect(tags.groupMentionTypes).toEqual([GroupMentionType.AT_CHANNEL])
        expect(tags.mentionedUserAddresses).toEqual([user1.address])
        expect(tags.participatingUserAddresses).toEqual([
            user2.address,
            user3.address,
            user4.address,
        ])

        const reactionMessage: PlainMessage<ChannelMessage> = {
            payload: {
                case: 'reaction',
                value: {
                    refEventId: 'event2',
                    reaction: '👍',
                },
            },
        }
        const reactionTags = makeTags(reactionMessage, mockStreamView)
        expect(reactionTags.messageInteractionType).toBe(MessageInteractionType.REACTION)
        expect(reactionTags.groupMentionTypes).toEqual([])
        expect(reactionTags.mentionedUserAddresses).toEqual([])
        expect(reactionTags.participatingUserAddresses).toEqual([user4.address])
        expect(reactionTags.threadId).toEqual(bin_fromHexString(threadId1))
    })
})
