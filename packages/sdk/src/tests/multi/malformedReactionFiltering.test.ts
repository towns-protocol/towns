/**
 * @group main
 */

import { describe, expect, it, beforeAll, beforeEach } from 'vitest'
import { TimelinesView } from '../../views/streams/timelines'
import {
    MessageInteractionType,
    StreamEventSchema,
    ChannelMessageSchema,
    ChannelPayloadSchema,
    EncryptedDataSchema,
    TagsSchema,
} from '@towns-protocol/proto'
import { RiverTimelineEvent } from '../../views/models/timelineTypes'
import { ethers } from 'ethers'
import { makeSignerContext, SignerContext } from '../../signerContext'
import { makeParsedEvent } from '../../sign'
import { makeRemoteTimelineEvent, StreamTimelineEvent } from '../../types'
import { create } from '@bufbuild/protobuf'
import { genIdBlob, makeUniqueChannelStreamId, addressFromUserId } from '../../id'
import { makeUniqueSpaceStreamId } from '../testUtils'

interface TestUser {
    userId: string
    address: Uint8Array
    context: SignerContext
    wallet: ethers.Wallet
}

describe('malformedReactionFiltering', () => {
    const spaceId = makeUniqueSpaceStreamId()
    const channelId = makeUniqueChannelStreamId(spaceId)
    let timelinesView: TimelinesView

    let user1: TestUser
    let user2: TestUser

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
            } satisfies TestUser
        }
        user1 = await makeUser()
        user2 = await makeUser()
    })

    beforeEach(() => {
        timelinesView = new TimelinesView(user1.userId, undefined)
    })

    it('should add valid reaction events to the timeline', () => {
        // create a regular message event
        const messageEvent: StreamTimelineEvent = {
            ...makeRemoteTimelineEvent({
                parsedEvent: makeParsedEvent(
                    create(StreamEventSchema, {
                        creatorAddress: user1.context.creatorAddress,
                        salt: genIdBlob(),
                        prevMiniblockHash: undefined,
                        payload: {
                            case: 'channelPayload',
                            value: create(ChannelPayloadSchema, {
                                content: {
                                    case: 'message',
                                    value: create(EncryptedDataSchema, {}),
                                },
                            }),
                        },
                        createdAtEpochMs: BigInt(Date.now()),
                        tags: create(TagsSchema, {
                            messageInteractionType: MessageInteractionType.POST,
                            groupMentionTypes: [],
                            mentionedUserAddresses: [],
                            participatingUserAddresses: [],
                        }),
                    }),
                    undefined,
                    undefined,
                ),
                eventNum: 1n,
                miniblockNum: 1n,
                confirmedEventNum: 1n,
            }),
            decryptedContent: {
                kind: 'channelMessage',
                content: create(ChannelMessageSchema, {
                    payload: {
                        case: 'post',
                        value: {
                            content: {
                                case: 'text',
                                value: {
                                    body: 'Hello world',
                                    mentions: [],
                                    attachments: [],
                                },
                            },
                        },
                    },
                }),
            },
        }

        // create a valid reaction event - tag = reaction, content = reaction
        const reactionEvent: StreamTimelineEvent = {
            ...makeRemoteTimelineEvent({
                parsedEvent: makeParsedEvent(
                    create(StreamEventSchema, {
                        creatorAddress: user2.context.creatorAddress,
                        salt: genIdBlob(),
                        prevMiniblockHash: undefined,
                        payload: {
                            case: 'channelPayload',
                            value: create(ChannelPayloadSchema, {
                                content: {
                                    case: 'message',
                                    value: create(EncryptedDataSchema, {}),
                                },
                            }),
                        },
                        createdAtEpochMs: BigInt(Date.now()),
                        tags: create(TagsSchema, {
                            messageInteractionType: MessageInteractionType.REACTION,
                            groupMentionTypes: [],
                            mentionedUserAddresses: [],
                            participatingUserAddresses: [user1.address],
                        }),
                    }),
                    undefined,
                    undefined,
                ),
                eventNum: 2n,
                miniblockNum: 1n,
                confirmedEventNum: 2n,
            }),
            decryptedContent: {
                kind: 'channelMessage',
                content: create(ChannelMessageSchema, {
                    payload: {
                        case: 'reaction',
                        value: {
                            refEventId: messageEvent.hashStr,
                            reaction: '👍',
                        },
                    },
                }),
            },
        }

        timelinesView.streamInitialized(channelId, [messageEvent, reactionEvent])

        const timeline = timelinesView.value.timelines[channelId]
        expect(timeline).toHaveLength(2)
        expect(timeline[0].content?.kind).toBe(RiverTimelineEvent.ChannelMessage)
        expect(timeline[1].content?.kind).toBe(RiverTimelineEvent.Reaction)

        const reactions = timelinesView.value.reactions[channelId]
        expect(reactions).toBeDefined()
        expect(reactions[messageEvent.hashStr]).toBeDefined()
        expect(reactions[messageEvent.hashStr]['👍']).toBeDefined()
        expect(reactions[messageEvent.hashStr]['👍'][user2.userId]).toEqual({
            eventId: reactionEvent.hashStr,
        })
    })

    it('should filter out non-reaction events tagged as reactions', () => {
        // create a regular message event
        const messageEvent: StreamTimelineEvent = {
            ...makeRemoteTimelineEvent({
                parsedEvent: makeParsedEvent(
                    create(StreamEventSchema, {
                        creatorAddress: user1.context.creatorAddress,
                        salt: genIdBlob(),
                        prevMiniblockHash: undefined,
                        payload: {
                            case: 'channelPayload',
                            value: create(ChannelPayloadSchema, {
                                content: {
                                    case: 'message',
                                    value: create(EncryptedDataSchema, {}),
                                },
                            }),
                        },
                        createdAtEpochMs: BigInt(Date.now()),
                        tags: create(TagsSchema, {
                            messageInteractionType: MessageInteractionType.POST,
                            groupMentionTypes: [],
                            mentionedUserAddresses: [],
                            participatingUserAddresses: [],
                        }),
                    }),
                    undefined,
                    undefined,
                ),
                eventNum: 1n,
                miniblockNum: 1n,
                confirmedEventNum: 1n,
            }),
            decryptedContent: {
                kind: 'channelMessage',
                content: create(ChannelMessageSchema, {
                    payload: {
                        case: 'post',
                        value: {
                            content: {
                                case: 'text',
                                value: {
                                    body: 'Hello world',
                                    mentions: [],
                                    attachments: [],
                                },
                            },
                        },
                    },
                }),
            },
        }

        // create a malformed event - tag = reaction, content = message
        const malformedEvent: StreamTimelineEvent = {
            ...makeRemoteTimelineEvent({
                parsedEvent: makeParsedEvent(
                    create(StreamEventSchema, {
                        creatorAddress: user2.context.creatorAddress,
                        salt: genIdBlob(),
                        prevMiniblockHash: undefined,
                        payload: {
                            case: 'channelPayload',
                            value: create(ChannelPayloadSchema, {
                                content: {
                                    case: 'message',
                                    value: create(EncryptedDataSchema, {}),
                                },
                            }),
                        },
                        createdAtEpochMs: BigInt(Date.now()),
                        tags: create(TagsSchema, {
                            messageInteractionType: MessageInteractionType.REACTION,
                            groupMentionTypes: [],
                            mentionedUserAddresses: [],
                            participatingUserAddresses: [],
                        }),
                    }),
                    undefined,
                    undefined,
                ),
                eventNum: 2n,
                miniblockNum: 1n,
                confirmedEventNum: 2n,
            }),
            decryptedContent: {
                kind: 'channelMessage',
                content: create(ChannelMessageSchema, {
                    payload: {
                        case: 'post', // content is a post, not a reaction!
                        value: {
                            content: {
                                case: 'text',
                                value: {
                                    body: 'This is not a reaction!',
                                    mentions: [],
                                    attachments: [],
                                },
                            },
                        },
                    },
                }),
            },
        }

        timelinesView.streamInitialized(channelId, [messageEvent, malformedEvent])

        const timeline = timelinesView.value.timelines[channelId]
        expect(timeline).toHaveLength(1)
        expect(timeline[0].content?.kind).toBe(RiverTimelineEvent.ChannelMessage)

        const reactions = timelinesView.value.reactions[channelId]
        expect(reactions).toEqual({})
    })

    it('should handle events without tags properly', () => {
        // create a message event without tags
        const messageEvent: StreamTimelineEvent = {
            ...makeRemoteTimelineEvent({
                parsedEvent: makeParsedEvent(
                    create(StreamEventSchema, {
                        creatorAddress: user1.context.creatorAddress,
                        salt: genIdBlob(),
                        prevMiniblockHash: undefined,
                        payload: {
                            case: 'channelPayload',
                            value: create(ChannelPayloadSchema, {
                                content: {
                                    case: 'message',
                                    value: create(EncryptedDataSchema, {}),
                                },
                            }),
                        },
                        createdAtEpochMs: BigInt(Date.now()),
                        tags: undefined,
                    }),
                    undefined,
                    undefined,
                ),
                eventNum: 1n,
                miniblockNum: 1n,
                confirmedEventNum: 1n,
            }),
            decryptedContent: {
                kind: 'channelMessage',
                content: create(ChannelMessageSchema, {
                    payload: {
                        case: 'post',
                        value: {
                            content: {
                                case: 'text',
                                value: {
                                    body: 'Hello world',
                                    mentions: [],
                                    attachments: [],
                                },
                            },
                        },
                    },
                }),
            },
        }

        // create a reaction event without tags
        const reactionEvent: StreamTimelineEvent = {
            ...makeRemoteTimelineEvent({
                parsedEvent: makeParsedEvent(
                    create(StreamEventSchema, {
                        creatorAddress: user2.context.creatorAddress,
                        salt: genIdBlob(),
                        prevMiniblockHash: undefined,
                        payload: {
                            case: 'channelPayload',
                            value: create(ChannelPayloadSchema, {
                                content: {
                                    case: 'message',
                                    value: create(EncryptedDataSchema, {}),
                                },
                            }),
                        },
                        createdAtEpochMs: BigInt(Date.now()),
                        tags: undefined,
                    }),
                    undefined,
                    undefined,
                ),
                eventNum: 2n,
                miniblockNum: 1n,
                confirmedEventNum: 2n,
            }),
            decryptedContent: {
                kind: 'channelMessage',
                content: create(ChannelMessageSchema, {
                    payload: {
                        case: 'reaction',
                        value: {
                            refEventId: messageEvent.hashStr,
                            reaction: '👍',
                        },
                    },
                }),
            },
        }

        timelinesView.streamInitialized(channelId, [messageEvent, reactionEvent])

        const timeline = timelinesView.value.timelines[channelId]
        expect(timeline).toHaveLength(2)
        expect(timeline[0].content?.kind).toBe(RiverTimelineEvent.ChannelMessage)
        expect(timeline[1].content?.kind).toBe(RiverTimelineEvent.Reaction)
    })
})
