import {
    ChannelMessage,
    GroupMentionType,
    MessageInteractionType,
    PlainMessage,
    StreamEventSchema,
    ChannelMessageSchema,
    ChannelPayloadSchema,
    EncryptedDataSchema,
} from '@towns-protocol/proto'
import { makeTags } from '../../tags'
import { StreamStateView } from '../../streamStateView'
import {
    addressFromUserId,
    genIdBlob,
    makeUniqueChannelStreamId,
    userIdFromAddress,
} from '../../id'
import { ethers } from 'ethers'
import { makeUniqueSpaceStreamId } from '../testUtils'
import { makeSignerContext, SignerContext } from '../../signerContext'
import { makeParsedEvent } from '../../sign'
import { makeRemoteTimelineEvent, StreamTimelineEvent } from '../../types'
import { bin_fromHexString } from '@towns-protocol/dlog'
import { create } from '@bufbuild/protobuf'
import { StreamsView } from '../../views/streamsView'

interface TagsTestUser {
    userId: string
    address: Uint8Array
    context: SignerContext
    wallet: ethers.Wallet
}

describe('makeTags', () => {
    const spaceId = makeUniqueSpaceStreamId()
    const streamId = makeUniqueChannelStreamId(spaceId)
    let mockStreamView: StreamStateView
    let streamsView: StreamsView

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
    })

    beforeEach(() => {
        streamsView = new StreamsView(userIdFromAddress(user1.address), undefined)
        mockStreamView = new StreamStateView(
            userIdFromAddress(user1.address),
            streamId,
            streamsView,
        )
    })

    it('should create tags for a reply message', () => {
        const threadRootEvent = makeChannelMessage(user2, undefined, 'hello world')
        const threadId1 = threadRootEvent.hashStr

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

        const events: StreamTimelineEvent[] = [
            // threadId1
            threadRootEvent,
            // event1
            makeChannelMessage(user3, threadId1, 'hello world'),
            // event 2
            makeChannelMessage(user4, threadId1, 'hello world back'),
            // event 3 duplicat sender
            makeChannelMessage(user4, threadId1, 'how you doin'),
        ]

        streamsView.timelinesView.streamInitialized(streamId, events)

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
                    refEventId: events[2].hashStr,
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

function makeChannelMessage(user: TagsTestUser, threadId: string | undefined, message: string) {
    return {
        ...makeRemoteTimelineEvent({
            parsedEvent: makeParsedEvent(
                create(StreamEventSchema, {
                    creatorAddress: user.context.creatorAddress,
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
            eventNum: 0n,
            miniblockNum: 0n,
            confirmedEventNum: 0n,
        }),
        decryptedContent: {
            kind: 'channelMessage',
            content: create(ChannelMessageSchema, {
                payload: {
                    case: 'post',
                    value: {
                        threadId: threadId,
                        content: {
                            case: 'text',
                            value: {
                                body: message,
                                mentions: [],
                                attachments: [],
                            },
                        },
                    },
                },
            }),
        },
    } satisfies StreamTimelineEvent
}
